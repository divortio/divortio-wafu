/*
 * =============================================================================
 * FILE: src/event-logs-do.js
 *
 * DESCRIPTION:
 * Defines the `EventLogsDO` class. This version includes a more robust
 * analytics aggregation function that gracefully handles cases where there
 * is no data to aggregate, preventing runtime errors.
 * =============================================================================
 */

import {DurableObject} from "cloudflare:workers";

export class EventLogsDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.ctx = ctx;
        this.env = env;

        this.ctx.waitUntil(this.initializeDatabase());
    }

    /**
     * Creates all necessary SQLite tables if they don't already exist.
     */
    async initializeDatabase() {
        const sql = this.ctx.storage.sql;
        await sql.exec(`
            CREATE TABLE IF NOT EXISTS events
                (
                    id                         TEXT
                        PRIMARY KEY,
                    timestamp                  INTEGER NOT NULL,
                    action                     TEXT    NOT NULL,
                    rule_id                    TEXT,
                    context                    TEXT    NOT NULL,
                    route_host                 TEXT,
                    ip_address                 TEXT,
                    user_agent                 TEXT,
                    country                    TEXT,
                    asn                        INTEGER,
                    colo                       TEXT,
                    cf_blob                    TEXT,
                    headers                    TEXT
                );
            CREATE TABLE IF NOT EXISTS analytics_summary_24h
                (
                    id                            INTEGER
                        PRIMARY KEY, last_updated INTEGER NOT NULL, data TEXT NOT NULL
                );
        `);
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
     */
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/api/global/analytics/aggregate') {
            await this.runAggregation();
            return new Response('Aggregation complete.');
        }

        if (url.pathname === '/api/global/analytics/summary') {
            const {results} = await this.ctx.storage.sql.exec("SELECT data FROM analytics_summary_24h WHERE id = 1");
            const data = results.length > 0 ? results[0].data : '{}';
            return new Response(data, {headers: {'Content-Type': 'application/json'}});
        }

        if (url.pathname === '/api/global/sql-query' && request.method === 'POST') {
            try {
                const {query, params} = await request.json();
                if (!query || !query.trim().toUpperCase().startsWith('SELECT')) {
                    return new Response(JSON.stringify({error: 'Forbidden: Only SELECT queries are allowed.'}), {
                        status: 403,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                const {results} = await this.ctx.storage.sql.exec(query, params || []);
                return new Response(JSON.stringify(results), {headers: {'Content-Type': 'application/json'}});
            } catch (e) {
                return new Response(JSON.stringify({error: e.message}), {
                    status: 400,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }

        if (url.pathname === '/log' && request.method === 'POST') {
            const logEntry = await request.json();
            await this.ctx.storage.sql.exec(
                `INSERT INTO
                     events (id,
                             timestamp,
                             action,
                             rule_id,
                             context,
                             route_host,
                             ip_address,
                             user_agent,
                             country,
                             asn,
                             colo,
                             cf_blob,
                             headers)
                     VALUES
                         (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    crypto.randomUUID(),
                    logEntry.timestamp || Date.now(),
                    logEntry.action,
                    logEntry.ruleId,
                    logEntry.context,
                    logEntry.routeHost,
                    logEntry.request?.headers['cf-connecting-ip'],
                    logEntry.request?.headers['user-agent'],
                    logEntry.request?.cf?.country,
                    logEntry.request?.cf?.asn,
                    logEntry.request?.cf?.colo,
                    JSON.stringify(logEntry.request?.cf || {}),
                    JSON.stringify(logEntry.request?.headers || {})
                ]
            );
            return new Response('Log recorded.');
        }

        return new Response('Not found in EventLogsDO', {status: 404});
    }

    /**
     * Runs aggregation queries against the raw `events` table.
     * This version is more robust and handles cases with no data.
     */
    async runAggregation() {
        console.log("EventLogsDO: Starting analytics aggregation...");
        try {
            const sql = this.ctx.storage.sql;
            const since = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours

            const queries = [
                sql.exec("SELECT action, COUNT(*) AS count FROM events WHERE timestamp > ? GROUP BY action", [since]),
                sql.exec("SELECT COUNT(*) AS count FROM events WHERE timestamp > ?", [since]),
                sql.exec("SELECT COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND timestamp > ?", [since]),
                sql.exec("SELECT country, COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND country IS NOT NULL AND timestamp > ? GROUP BY country ORDER BY count DESC LIMIT 5", [since]),
                sql.exec("SELECT asn, COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND asn IS NOT NULL AND timestamp > ? GROUP BY asn ORDER BY count DESC LIMIT 5", [since]),
                sql.exec("SELECT rule_id, COUNT(*) AS count FROM events WHERE rule_id IS NOT NULL AND timestamp > ? GROUP BY rule_id ORDER BY count DESC LIMIT 5", [since]),
                sql.exec("SELECT timestamp FROM events WHERE timestamp > ? ORDER BY timestamp ASC", [since])
            ];
            try {
                const results = await Promise.all(queries);
                console.log("EventLogsDO: Analytics aggregation queries complete.");
            } catch (e) {
                console.log("EventLogsDO: Analytics aggregation failed. Queries: ", JSON.stringify(queries));
                console.error("EventLogsDO: Analytics aggregation failed.", e);
            }


            const actions = results[0].results;
            const total = results[1].results;
            const blocked = results[2].results;
            const topCountries = results[3].results;
            const topAsns = results[4].results;
            const topRules = results[5].results;
            const timeseries = results[6].results;

            const summary = {
                totalRequests: (total && total.length > 0) ? total[0].count : 0,
                threatsBlocked: (blocked && blocked.length > 0) ? blocked[0].count : 0,
                eventsByAction: actions || [],
                topBlockedCountries: topCountries || [],
                topBlockedAsns: topAsns || [],
                topTriggeredRules: topRules || [],
                eventsTimeseries: timeseries || [],
            };

            await sql.exec(
                "INSERT OR REPLACE INTO analytics_summary_24h (id, last_updated, data) VALUES (1, ?, ?)",
                [Date.now(), JSON.stringify(summary)]
            );

            console.log("EventLogsDO: Analytics aggregation complete.");
        } catch (e) {
            console.error("EventLogsDO: Analytics aggregation failed.", e);
        }
    }
}
