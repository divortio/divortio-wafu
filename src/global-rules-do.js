/*
 * =============================================================================
 * FILE: src/global-rules-do.js
 *
 * DESCRIPTION:
 * Defines the `GlobalRulesDO` class. This version has been corrected to
 * extend the base `DurableObject` class, enabling RPC functionality.
 * =============================================================================
 */

import {DurableObject} from "cloudflare:workers";
import {getRequestData, evaluateExpression} from './utils.js';

// The class now extends DurableObject
export class GlobalRulesDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env); // Must call super()
        this.ctx = ctx;
        this.env = env;
        this.cache = null;

        // Use this.ctx.waitUntil to run initialization without blocking the constructor
        this.ctx.waitUntil(this.initializeDatabase());
    }

    /**
     * Creates all necessary SQLite tables if they don't already exist.
     */
    async initializeDatabase() {
        // The storage API is now on this.ctx.storage
        const sql = this.ctx.storage.sql;
        await sql.exec(`CREATE TABLE IF NOT EXISTS global_rules (id TEXT PRIMARY KEY, name TEXT, description TEXT, enabled INTEGER, action TEXT, expression TEXT, tags TEXT, priority INTEGER, trigger_alert INTEGER, block_http_code INTEGER)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS routes (id TEXT PRIMARY KEY, incominghost TEXT UNIQUE, origin_type TEXT, origin_url TEXT, origin_service_name TEXT, enabled INTEGER)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password_hash TEXT, role TEXT, created_at INTEGER)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS gates (id TEXT PRIMARY KEY, name TEXT, jwt_secret TEXT, access_token_ttl_seconds INTEGER, refresh_token_ttl_seconds INTEGER)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS threat_feeds (id TEXT PRIMARY KEY, name TEXT, url TEXT, enabled INTEGER, refresh_schedule TEXT, last_updated_at INTEGER, last_update_status TEXT, last_update_error TEXT, item_count INTEGER, kv_size_bytes INTEGER, type TEXT)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS integrations (id TEXT PRIMARY KEY, name TEXT, type TEXT, url TEXT, enabled INTEGER)`);
        await sql.exec(`CREATE TABLE IF NOT EXISTS error_pages (http_code INTEGER PRIMARY KEY, name TEXT, description TEXT, content_type TEXT, body TEXT)`);
    }

    /**
     * Loads the entire configuration from SQLite into the in-memory cache.
     */
    async loadCache() {
        if (this.cache) return;
        console.log("GlobalRulesDO: Cache miss. Reloading from SQLite.");
        const sql = this.ctx.storage.sql;

        const routesPromise = sql.exec("SELECT * FROM routes");
        const globalRulesPromise = sql.exec("SELECT * FROM global_rules");
        const errorPagesPromise = sql.exec("SELECT * FROM error_pages");

        const [routesRes, globalRulesRes, errorPagesRes] = await Promise.all([routesPromise, globalRulesPromise, errorPagesPromise]);

        this.cache = {
            routes: routesRes.results,
            globalRules: globalRulesRes.results.map(r => ({
                ...r,
                expression: JSON.parse(r.expression),
                tags: JSON.parse(r.tags)
            })),
            errorPages: errorPagesRes.results,
        };
    }

    // --- RPC Method for WAF Evaluation ---
    async evaluate(wafRequestPayload) {
        await this.loadCache();
        const requestData = getRequestData(wafRequestPayload);
        const activeGlobalRules = (this.cache.globalRules || []).filter(r => r.enabled).sort((a, b) => a.priority - b.priority);

        for (const rule of activeGlobalRules) {
            if (evaluateExpression(rule.expression, requestData)) {
                let blockResponse = this.cache.errorPages.find(p => p.http_code === (rule.block_http_code || 403));
                if (!blockResponse) {
                    blockResponse = {http_code: 403, content_type: 'text/html', body: '<h1>Forbidden</h1>'};
                }

                return {
                    action: rule.action,
                    matchedRuleId: rule.id,
                    blockResponse: {
                        statusCode: blockResponse.http_code,
                        contentType: blockResponse.content_type,
                        body: blockResponse.body
                    },
                    matchedRoute: this.findMatchingRoute(wafRequestPayload.headers.host, this.cache.routes || [])
                };
            }
        }

        const matchedRoute = this.findMatchingRoute(wafRequestPayload.headers.host, this.cache.routes || []);
        if (!matchedRoute) {
            return {action: 'NONE', matchedRoute: null};
        }
        return {action: 'ALLOW', matchedRoute: matchedRoute};
    }

    /**
     * Handles traditional fetch-based requests, primarily for the UI API.
     */
    async fetch(request) {
        const url = new URL(request.url);

        if (request.method !== 'GET' && url.pathname.startsWith('/api/')) {
            this.cache = null;
        }

        if (url.pathname === '/api/global/config' && request.method === 'GET') {
            await this.loadCache();
            return new Response(JSON.stringify(this.cache), {headers: {'Content-Type': 'application/json'}});
        }

        if (url.pathname.startsWith('/api/global/rules')) {
            return this.handleRulesApi(request);
        }

        return new Response('Not found in GlobalDO', {status: 404});
    }

    /**
     * Handles CRUD operations for global rules.
     */
    async handleRulesApi(request) {
        const sql = this.ctx.storage.sql;
        const url = new URL(request.url);
        const ruleId = url.pathname.split('/').pop();

        if (request.method === 'POST') {
            const rule = await request.json();
            await sql.exec(
                "INSERT INTO global_rules (id, name, description, enabled, action, expression, tags, priority, trigger_alert, block_http_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [rule.id, rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code]
            );
            return new Response(JSON.stringify(rule), {status: 201});
        }

        if (request.method === 'PUT' && ruleId) {
            const rule = await request.json();
            await sql.exec(
                "UPDATE global_rules SET name=?, description=?, enabled=?, action=?, expression=?, tags=?, priority=?, trigger_alert=?, block_http_code=? WHERE id=?",
                [rule.name, rule.description, rule.enabled, rule.action, JSON.stringify(rule.expression), JSON.stringify(rule.tags), rule.priority, rule.trigger_alert, rule.block_http_code, ruleId]
            );
            return new Response(JSON.stringify(rule));
        }

        if (request.method === 'DELETE' && ruleId) {
            await sql.exec("DELETE FROM global_rules WHERE id = ?", [ruleId]);
            return new Response('Rule deleted');
        }

        return new Response('Invalid request for rules API', {status: 400});
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
