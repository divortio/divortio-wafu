/*
 * =============================================================================
 * FILE: src/route-rules-do.js
 *
 * DESCRIPTION:
 * Defines the `RouteRulesDO` class. A unique, named instance of this class
 * is created for every route defined in the WAFu UI. Its state is its own
 * private SQLite database, containing route-specific rules. It operates on a
 * "default block" principle: if no rule explicitly returns an `ALLOW` action,
 * the request is blocked.
 * =============================================================================
 */

// NOTE: In a production project, these utility functions would be in a shared `utils.js` file.
// They are included here for completeness of the single-file example.

/**
 * Flattens and normalizes the request data for the rule engine.
 * @param {object} req - The request data passed from the main worker.
 * @returns {object} A flat object with all checkable properties.
 */
function getRequestData(req) {
    const url = new URL(req.url);
    const cf = req.cf || {};
    const headers = req.headers || {};
    const queryParams = new URLSearchParams(url.search);

    const data = {
        'request.method': req.method,
        'request.url': req.url,
        'request.cf.httpProtocol': cf.httpProtocol,
        'request.cf.requestPriority': cf.requestPriority,
        'derived.body.has_body': !!(req.body && (headers['content-length'] > 0 || headers['transfer-encoding'] === 'chunked')),
        'derived.uri.path': url.pathname,
        'derived.uri.query.string': url.search,
        'derived.uri.query.param_count': Array.from(queryParams.keys()).length,
        'request.cf.country': cf.country,
        'request.cf.continent': cf.continent,
        'request.cf.region': cf.region,
        'request.cf.regionCode': cf.regionCode,
        'request.cf.city': cf.city,
        'request.cf.postalCode': cf.postalCode,
        'request.cf.metroCode': cf.metroCode,
        'request.cf.timezone': cf.timezone,
        'request.cf.latitude': cf.latitude,
        'request.cf.longitude': cf.longitude,
        'request.cf.isEUCountry': cf.isEUCountry,
        'request.cf.colo': cf.colo,
        'request.cf.asn': cf.asn,
        'request.cf.asOrganization': cf.asOrganization,
        'request.cf.clientTcpRtt': cf.clientTcpRtt,
        'request.cf.clientAcceptEncoding': cf.clientAcceptEncoding,
        'request.cf.threatScore': cf.threatScore ?? 0,
        'request.cf.botManagement.score': cf.botManagement?.score,
        'request.cf.botManagement.verifiedBot': cf.botManagement?.verifiedBot,
        'request.cf.verifiedBotCategory': cf.verifiedBotCategory,
        'request.cf.botManagement.staticResource': cf.botManagement?.staticResource,
        'request.cf.botManagement.detectionIds': cf.botManagement?.detectionIds,
        'request.cf.botManagement.jsDetection.passed': cf.botManagement?.jsDetection?.passed,
        'request.cf.tlsVersion': cf.tlsVersion,
        'request.cf.tlsCipher': cf.tlsCipher,
        'request.cf.botManagement.ja3Hash': cf.botManagement?.ja3Hash,
        'request.cf.botManagement.ja4': cf.botManagement?.ja4,
        'request.cf.tlsClientHelloLength': cf.tlsClientHelloLength,
        'request.cf.tlsClientRandom': cf.tlsClientRandom,
        'request.cf.tlsClientAuth.certIssuerDNLegacy': cf.tlsClientAuth?.certIssuerDNLegacy,
        'request.cf.tlsClientAuth.certIssuerDN': cf.tlsClientAuth?.certIssuerDN,
        'request.cf.tlsClientAuth.certSubjectDNLegacy': cf.tlsClientAuth?.certSubjectDNLegacy,
        'request.cf.tlsClientAuth.certSubjectDN': cf.tlsClientAuth?.certSubjectDN,
        'request.cf.tlsClientAuth.certPresented': cf.tlsClientAuth?.certPresented,
        'request.cf.tlsClientAuth.certVerified': cf.tlsClientAuth?.certVerified,
    };

    for (const [key, value] of Object.entries(headers)) {
        data[`request.headers.${key.toLowerCase()}`] = value;
    }
    return data;
}

/**
 * Evaluates a single condition from a rule's expression.
 * @param {*} actualValue - The value from the request.
 * @param {string} operator - The comparison operator.
 * @param {*} ruleValue - The value from the rule.
 * @returns {boolean} True if the condition matches.
 */
function _checkCondition(actualValue, operator, ruleValue) {
    if (operator === 'is_null') return actualValue === null || actualValue === undefined;
    if (operator === 'is_not_null') return actualValue !== null && actualValue !== undefined;
    if (actualValue === null || actualValue === undefined) return false;

    switch (operator) {
        case 'equals':
            return actualValue == ruleValue;
        case 'not_equals':
            return actualValue != ruleValue;
        case 'contains':
            return typeof actualValue === 'string' && actualValue.includes(ruleValue);
        case 'not_contains':
            return typeof actualValue === 'string' && !actualValue.includes(ruleValue);
        case 'in':
            return Array.isArray(ruleValue) && ruleValue.includes(actualValue);
        case 'not_in':
            return Array.isArray(ruleValue) && !ruleValue.includes(actualValue);
        case 'greater_than':
            return actualValue > ruleValue;
        case 'less_than':
            return actualValue < ruleValue;
        case 'matches':
            try {
                return new RegExp(ruleValue, 'i').test(actualValue);
            } catch (e) {
                return false;
            }
        case 'not_matches':
            try {
                return !new RegExp(ruleValue, 'i').test(actualValue);
            } catch (e) {
                return false;
            }
        default:
            return false;
    }
}

/**
 * Evaluates a full rule expression.
 * @param {object[]} expression - An array of match conditions.
 * @param {object} requestData - The flattened request data.
 * @returns {boolean} True if all conditions in the expression match.
 */
function evaluateExpression(expression, requestData) {
    if (!expression || expression.length === 0) return true;
    for (const match of expression) {
        if (!_checkCondition(requestData[match.field], match.operator, match.value)) {
            return false;
        }
    }
    return true;
}

export class RouteRulesDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.cache = null; // In-memory cache for this route's rules

        this.state.blockConcurrencyWhile(async () => {
            await this.initializeDatabase();
        });
    }

    /**
     * Creates the route-specific rules table if it doesn't already exist.
     */
    async initializeDatabase() {
        const db = this.state.storage.sql;
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS route_rules
                (
                    id                    TEXT
                        PRIMARY KEY,
                    name                  TEXT,
                    description           TEXT,
                    enabled               INTEGER NOT NULL DEFAULT 1,
                    action                TEXT    NOT NULL,
                    expression            TEXT    NOT NULL, -- JSON string
                    tags                  TEXT,             -- JSON string
                    priority              INTEGER NOT NULL,
                    trigger_alert         INTEGER NOT NULL DEFAULT 0,
                    block_http_code       INTEGER          DEFAULT 403
                )
        `).run();
    }

    /**
     * Loads this route's rules from SQLite into the in-memory cache.
     */
    async loadCache() {
        console.log(`RouteRulesDO (${this.state.id}): Cache miss. Reloading from SQLite.`);
        const {results} = await this.state.storage.sql.prepare("SELECT * FROM route_rules").all();
        this.cache = results.map(r => ({...r, expression: JSON.parse(r.expression), tags: JSON.parse(r.tags)}));
    }

    /**
     * Handles all incoming fetch events for this Durable Object instance.
     */
    async fetch(request) {
        if (!this.cache) {
            await this.loadCache();
        }

        const url = new URL(request.url);

        // --- API Write Operations: Invalidate Cache ---
        if (request.method !== 'GET' && url.pathname.startsWith('/api/')) {
            this.cache = null;
        }

        // --- API Routing ---
        if (url.pathname.startsWith('/api/routes/') && url.pathname.endsWith('/rules')) {
            return this.handleRulesApi(request);
        }

        if (url.pathname === '/evaluate') {
            return await this.handleEvaluate(request);
        }

        return new Response('Not found in RouteRulesDO', {status: 404});
    }

    /**
     * Handles CRUD operations for route-specific rules.
     * @param {Request} request - The incoming API request.
     */
    async handleRulesApi(request) {
        const db = this.state.storage.sql;
        const url = new URL(request.url);
        const ruleId = url.pathname.split('/').slice(-2, -1)[0]; // e.g. /api/routes/route-123/rules -> rules

        if (request.method === 'GET') {
            return new Response(JSON.stringify(this.cache), {headers: {'Content-Type': 'application/json'}});
        }

        if (request.method === 'POST') {
            const rule = await request.json();
            await db.prepare("INSERT INTO route_rules (id, name, description, enabled, action, expression, tags, priority, trigger_alert, block_http_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(rule.id, rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code)
                .run();
            return new Response(JSON.stringify(rule), {status: 201});
        }

        if (request.method === 'PUT' && ruleId) {
            const rule = await request.json();
            await db.prepare("UPDATE route_rules SET name=?, description=?, enabled=?, action=?, expression=?, tags=?, priority=?, trigger_alert=?, block_http_code=? WHERE id=?")
                .bind(rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code, ruleId)
                .run();
            return new Response(JSON.stringify(rule));
        }

        if (request.method === 'DELETE' && ruleId) {
            await db.prepare("DELETE FROM route_rules WHERE id = ?").bind(ruleId).run();
            return new Response('Rule deleted');
        }

        return new Response('Invalid request for route rules API', {status: 400});
    }

    /**
     * Evaluates a request against this route's specific ruleset.
     * @param {Request} request - The incoming evaluation request.
     */
    async handleEvaluate(request) {
        const requestDataForWaf = await request.json();
        const requestData = getRequestData(requestDataForWaf);
        const activeRules = (this.cache || []).filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

        for (const rule of activeRules) {
            if (evaluateExpression(rule.expression, requestData)) {
                // First matching rule determines the outcome for this route.
                return new Response(JSON.stringify({
                    action: rule.action,
                    matchedRuleId: rule.id,
                    blockHttpCode: rule.block_http_code || 403
                }), {headers: {'Content-Type': 'application/json'}});
            }
        }

        // DEFAULT BLOCK: If no rule explicitly allows the request, block it.
        return new Response(JSON.stringify({
            action: 'BLOCK',
            matchedRuleId: 'default-route-block'
        }), {headers: {'Content-Type': 'application/json'}});
    }
}
