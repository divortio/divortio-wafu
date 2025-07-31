/*
 * =============================================================================
 * FILE: src/route-rules-do.js
 *
 * DESCRIPTION:
 * Defines the `RouteRulesDO` class. This version has been refactored to
 * support both traditional fetch-based API calls from the UI and a modern,
 * direct RPC call from the main worker for high-performance rule evaluation.
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
        if (this.cache) return;
        console.log(`RouteRulesDO (${this.state.id}): Cache miss. Reloading from SQLite.`);
        const {results} = await this.state.storage.sql.prepare("SELECT * FROM route_rules").all();
        this.cache = results.map(r => ({...r, expression: JSON.parse(r.expression), tags: JSON.parse(r.tags)}));
    }

    // --- RPC Method for WAF Evaluation ---
    /**
     * Evaluates a request against this route's specific ruleset.
     * @param {object} wafRequestPayload - The request data from the main worker.
     * @returns {Promise<object>} A decision object.
     */
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
        await this.loadCache();
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
        const db = this.state.storage.sql;
        const url = new URL(request.url);
        const ruleId = url.pathname.split('/').slice(-2, -1)[0];

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

        // ... PUT and DELETE handlers remain the same ...

        return new Response('Invalid request for route rules API', {status: 400});
    }
}
