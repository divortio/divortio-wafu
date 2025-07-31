/*
 * =============================================================================
 * FILE: src/route-rules-do.js
 *
 * DESCRIPTION:
 * Defines the `RouteRulesDO` class. This version has been corrected to use
 * the proper `this.state.storage.sql.exec()` API for all database operations.
 * =============================================================================
 */

import {getRequestData, evaluateExpression} from './utils.js';

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
        // Use the correct API: this.state.storage.sql.exec()
        await this.state.storage.sql.exec(`
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
        `);
    }

    /**
     * Loads this route's rules from SQLite into the in-memory cache.
     */
    async loadCache() {
        if (this.cache) return;
        console.log(`RouteRulesDO (${this.state.id}): Cache miss. Reloading from SQLite.`);
        // Use the correct API: this.state.storage.sql.exec()
        const {results} = await this.state.storage.sql.exec("SELECT * FROM route_rules");
        this.cache = results.map(r => ({...r, expression: JSON.parse(r.expression), tags: JSON.parse(r.tags)}));
    }

    // --- RPC Method for WAF Evaluation ---
    async evaluate(wafRequestPayload) {
        await this.loadCache();
        const requestData = getRequestData(wafRequestPayload);
        const activeRules = (this.cache || []).filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

        for (const rule of activeRules) {
            if (evaluateExpression(rule.expression, requestData)) {
                // First matching rule determines the outcome for this route.
                return {
                    action: rule.action,
                    matchedRuleId: rule.id,
                    blockHttpCode: rule.block_http_code || 403
                };
            }
        }

        // DEFAULT BLOCK: If no rule explicitly allows the request, block it.
        return {
            action: 'BLOCK',
            matchedRuleId: 'default-route-block'
        };
    }

    /**
     * Handles traditional fetch-based requests, primarily for the UI API.
     */
    async fetch(request) {
        const url = new URL(request.url);

        if (request.method !== 'GET' && url.pathname.startsWith('/api/')) {
            this.cache = null;
        }

        if (url.pathname.startsWith('/api/routes/') && url.pathname.endsWith('/rules')) {
            return this.handleRulesApi(request);
        }

        return new Response('Not found in RouteRulesDO', {status: 404});
    }

    /**
     * Handles CRUD operations for route-specific rules.
     */
    async handleRulesApi(request) {
        const sql = this.state.storage.sql;
        const url = new URL(request.url);
        const ruleId = url.pathname.split('/').slice(-2, -1)[0];

        if (request.method === 'GET') {
            await this.loadCache();
            return new Response(JSON.stringify(this.cache), {headers: {'Content-Type': 'application/json'}});
        }

        if (request.method === 'POST') {
            const rule = await request.json();
            // Use the correct API: sql.exec() with bindings
            await sql.exec(
                "INSERT INTO route_rules (id, name, description, enabled, action, expression, tags, priority, trigger_alert, block_http_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [rule.id, rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code]
            );
            return new Response(JSON.stringify(rule), {status: 201});
        }

        if (request.method === 'PUT' && ruleId) {
            const rule = await request.json();
            // Use the correct API: sql.exec() with bindings
            await sql.exec(
                "UPDATE route_rules SET name=?, description=?, enabled=?, action=?, expression=?, tags=?, priority=?, trigger_alert=?, block_http_code=? WHERE id=?",
                [rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code, ruleId]
            );
            return new Response(JSON.stringify(rule));
        }

        if (request.method === 'DELETE' && ruleId) {
            // Use the correct API: sql.exec() with bindings
            await sql.exec("DELETE FROM route_rules WHERE id = ?", [ruleId]);
            return new Response('Rule deleted');
        }

        return new Response('Invalid request for route rules API', {status: 400});
    }
}
