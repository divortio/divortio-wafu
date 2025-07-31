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

import {getRequestData, evaluateExpression} from './utils.js';

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
                                id                    TEXT
                                    PRIMARY KEY,
                                name                  TEXT,
                                url                   TEXT,
                                enabled               INTEGER,
                                refresh_schedule      TEXT,
                                last_updated_at       INTEGER,
                                last_update_status    TEXT,
                                last_update_error     TEXT,
                                item_count            INTEGER,
                                kv_size_bytes         INTEGER,
                                type                  TEXT
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
