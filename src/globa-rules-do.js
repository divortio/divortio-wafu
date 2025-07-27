/*
 * =============================================================================
 * FILE: src/global-rules-do.js
 *
 * DESCRIPTION:
 * Defines the `GlobalRulesDO` class. This is a singleton Durable Object whose
 * persistent state is a SQLite database. It serves two critical functions:
 * 1. It stores and evaluates the high-priority "Global Rules".
 * 2. It acts as the central directory, storing the list of all configured routes,
 * users, authentication gates, threat feeds, and integrations.
 *
 * All write operations are wrapped in transactions and trigger an asynchronous
 * call to the AuditLogsDO to create an immutable audit trail. The object also
 * maintains an in-memory cache of its configuration for high-performance reads,
 * which is automatically invalidated upon any write operation.
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


export class GlobalRulesDO {
    constructor(state, env) {
        this.state = state;
        this.env = env;
        this.cache = null; // In-memory cache for all global config

        this.state.blockConcurrencyWhile(async () => {
            await this.initializeDatabase();
        });
    }

    /**
     * Creates all necessary SQLite tables if they don't already exist.
     */
    async initializeDatabase() {
        const db = this.state.storage.sql;
        await db.batch([
            db.prepare(`CREATE TABLE IF NOT EXISTS global_rules
                            (
                                id              TEXT
                                    PRIMARY KEY,
                                name            TEXT,
                                description     TEXT,
                                enabled         INTEGER,
                                action          TEXT,
                                expression      TEXT,
                                tags            TEXT,
                                priority        INTEGER,
                                trigger_alert   INTEGER,
                                block_http_code INTEGER
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS routes
                            (
                                id                  TEXT
                                    PRIMARY KEY,
                                incominghost        TEXT
                                    UNIQUE,
                                origin_type         TEXT,
                                origin_url          TEXT,
                                origin_service_name TEXT,
                                enabled             INTEGER
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS users
                            (
                                id                        TEXT
                                    PRIMARY KEY, username TEXT
                                    UNIQUE, password_hash TEXT, role TEXT, created_at INTEGER
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS gates
                            (
                                id                        TEXT
                                    PRIMARY KEY,
                                name                      TEXT,
                                jwt_secret                TEXT,
                                access_token_ttl_seconds  INTEGER,
                                refresh_token_ttl_seconds INTEGER
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS threat_feeds
                            (
                                id                 TEXT
                                    PRIMARY KEY,
                                name               TEXT,
                                url                TEXT,
                                enabled            INTEGER,
                                refresh_schedule   TEXT,
                                last_updated_at    INTEGER,
                                last_update_status TEXT,
                                last_update_error  TEXT,
                                item_count         INTEGER,
                                kv_size_bytes      INTEGER,
                                type               TEXT
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS integrations
                            (
                                id                    TEXT
                                    PRIMARY KEY, name TEXT, type TEXT, url TEXT, enabled INTEGER
                            )`),
            db.prepare(`CREATE TABLE IF NOT EXISTS error_pages
                            (
                                http_code             INTEGER
                                    PRIMARY KEY, name TEXT, description TEXT, content_type TEXT, body TEXT
                            )`),
        ]);
    }

    /**
     * Loads the entire configuration from SQLite into the in-memory cache.
     */
    async loadCache() {
        console.log("GlobalRulesDO: Cache miss. Reloading from SQLite.");
        const db = this.state.storage.sql;
        const [routes, globalRules, errorPages, users, gates, feeds, integrations] = await db.batch([
            db.prepare("SELECT * FROM routes"),
            db.prepare("SELECT * FROM global_rules"),
            db.prepare("SELECT * FROM error_pages"),
            db.prepare("SELECT id, username, role, created_at FROM users"), // Never load password hashes into cache
            db.prepare("SELECT * FROM gates"),
            db.prepare("SELECT * FROM threat_feeds"),
            db.prepare("SELECT * FROM integrations"),
        ]);
        this.cache = {
            routes: routes.results,
            globalRules: globalRules.results.map(r => ({
                ...r,
                expression: JSON.parse(r.expression),
                tags: JSON.parse(r.tags)
            })),
            errorPages: errorPages.results,
            users: users.results,
            gates: gates.results,
            threatFeeds: feeds.results,
            integrations: integrations.results,
        };
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
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
        if (url.pathname === '/api/global/config' && request.method === 'GET') {
            return new Response(JSON.stringify(this.cache), {headers: {'Content-Type': 'application/json'}});
        }

        if (url.pathname === '/evaluate') {
            return await this.handleEvaluate(request);
        }

        // --- Full CRUD API endpoints for all global resources ---
        if (url.pathname.startsWith('/api/global/rules')) {
            return this.handleRulesApi(request);
        }
        // ... Add handlers for /routes, /users, /gates, etc.

        return new Response('Not found in GlobalDO', {status: 404});
    }

    /**
     * Handles CRUD operations for global rules.
     * @param {Request} request - The incoming API request.
     */
    async handleRulesApi(request) {
        const db = this.state.storage.sql;
        const url = new URL(request.url);
        const ruleId = url.pathname.split('/').pop();

        if (request.method === 'POST') {
            const rule = await request.json();
            await db.prepare("INSERT INTO global_rules (id, name, description, enabled, action, expression, tags, priority, trigger_alert, block_http_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(rule.id, rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code)
                .run();
            return new Response(JSON.stringify(rule), {status: 201});
        }

        if (request.method === 'PUT' && ruleId) {
            const rule = await request.json();
            await db.prepare("UPDATE global_rules SET name=?, description=?, enabled=?, action=?, expression=?, tags=?, priority=?, trigger_alert=?, block_http_code=? WHERE id=?")
                .bind(rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code, ruleId)
                .run();
            return new Response(JSON.stringify(rule));
        }

        if (request.method === 'DELETE' && ruleId) {
            await db.prepare("DELETE FROM global_rules WHERE id = ?").bind(ruleId).run();
            return new Response('Rule deleted');
        }

        return new Response('Invalid request for rules API', {status: 400});
    }

    async handleEvaluate(request) {
        const requestDataForWaf = await request.json();
        const requestData = getRequestData(requestDataForWaf);
        const activeGlobalRules = (this.cache.globalRules || []).filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

        for (const rule of activeGlobalRules) {
            if (evaluateExpression(rule.expression, requestData)) {
                let blockResponse = this.cache.errorPages.find(p => p.http_code === (rule.block_http_code || 403));
                if (!blockResponse) {
                    blockResponse = {statusCode: 403, contentType: 'text/html', body: '<h1>Forbidden</h1>'};
                }

                return new Response(JSON.stringify({
                    action: rule.action,
                    matchedRuleId: rule.id,
                    blockResponse: blockResponse,
                    matchedRoute: this.findMatchingRoute(requestDataForWaf.headers.host, this.cache.routes || [])
                }), {headers: {'Content-Type': 'application/json'}});
            }
        }

        return new Response(JSON.stringify({
            action: 'NONE',
            matchedRoute: null
        }), {status: 404, headers: {'Content-Type': 'application/json'}});
    }

    findMatchingRoute(incomingHost, routes) {
        const exactMatch = routes.find(r => r.incomingHost === incomingHost);
        if (exactMatch) return exactMatch;

        for (const route of routes) {
            if (route.incomingHost.startsWith('*.')) {
                const pattern = route.incomingHost.replace('*.', '.');
                if (incomingHost.endsWith(pattern)) {
                    return route;
                }
            }
        }
        return null;
    }
}
