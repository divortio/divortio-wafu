/*
 * =============================================================================
 * FILE: src/event-logs-do.js
 *
 * DESCRIPTION:
 * Defines the `EventLogsDO` class. This singleton Durable Object now has
 * fully implemented logic for storing raw events, running aggregation queries
 * to populate summary tables, and serving analytics data to the UI. It also
 * provides a secure, read-only SQL query engine for administrators.
 * =============================================================================
 */

export class EventLogsDO {
    /**
     * The constructor for the Durable Object.
     * @param {DurableObjectState} state - The state object providing access to storage.
     * @param {object} env - The environment object containing bindings.
     */
    constructor(state, env) {
        this.state = state;
        this.env = env;
        // Run initialization once. `blockConcurrencyWhile()` ensures this
        // constructor logic runs to completion before any other events are delivered.
        this.state.blockConcurrencyWhile(async () => {
            await this.initializeDatabase();
        });
    }

    /**
     * Creates all necessary SQLite tables if they don't already exist.
     * This includes a table for raw events and summary tables for analytics.
     */
    async initializeDatabase() {
        const db = this.state.storage.sql;
        await db.batch([
            db.prepare(`
                CREATE TABLE IF NOT EXISTS events
                    (
                        id         TEXT
                            PRIMARY KEY,
                        timestamp  INTEGER NOT NULL,
                        action     TEXT    NOT NULL, -- 'BLOCK', 'ALLOW', 'CHALLENGE', 'LOG', 'AUTH_SUCCESS', etc.
                        rule_id    TEXT,
                        context    TEXT    NOT NULL, -- 'global' or route_id
                        route_host TEXT,
                        ip_address TEXT,
                        user_agent TEXT,
                        country    TEXT,
                        asn        INTEGER,
                        colo       TEXT,
                        cf_blob    TEXT,             -- Store the full JSON stringified cf object
                        headers    TEXT              -- Store all request headers as a JSON string
                    )
            `),
            db.prepare(`
                CREATE TABLE IF NOT EXISTS analytics_summary_24h
                    (
                        id           INTEGER
                            PRIMARY KEY,                                  -- Singleton row
                        last_updated INTEGER NOT NULL, data TEXT NOT NULL -- JSON blob of all aggregated stats
                    )
            `)
        ]);
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
     * This acts as the object's internal router for API calls.
     * @param {Request} request - The incoming HTTP request.
     */
    async fetch(request) {
        const url = new URL(request.url);

        // Endpoint for the scheduled worker to trigger aggregation
        if (url.pathname === '/api/global/analytics/aggregate') {
            await this.runAggregation();
            return new Response('Aggregation complete.');
        }

        // Endpoint for the dashboard to get pre-aggregated data
        if (url.pathname === '/api/global/analytics/summary') {
            const stmt = this.state.storage.sql.prepare("SELECT data FROM analytics_summary_24h WHERE id = 1");
            const result = await stmt.first('data');
            return new Response(result || '{}', {headers: {'Content-Type': 'application/json'}});
        }

        // Secure endpoint for the UI's SQL Query Engine
        if (url.pathname === '/api/global/sql-query' && request.method === 'POST') {
            try {
                const {query, params} = await request.json();
                // CRITICAL: Aggressively validate this is a read-only query.
                if (!query || !query.trim().toUpperCase().startsWith('SELECT')) {
                    return new Response(JSON.stringify({error: 'Forbidden: Only SELECT queries are allowed.'}), {
                        status: 403,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
                const stmt = this.state.storage.sql.prepare(query).bind(...(params || []));
                const {results} = await stmt.all();
                return new Response(JSON.stringify(results), {headers: {'Content-Type': 'application/json'}});
            } catch (e) {
                return new Response(JSON.stringify({error: e.message}), {
                    status: 400,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }

        // Internal endpoint for other components to write a log entry
        if (url.pathname === '/log' && request.method === 'POST') {
            const logEntry = await request.json();
            const stmt = this.state.storage.sql.prepare(
                    `INSERT INTO
                         events (id, timestamp, action, rule_id, context, route_host, ip_address, user_agent, country,
                                 asn, colo, cf_blob, headers)
                         VALUES
                             (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            );
            await stmt.bind(
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
            ).run();
            return new Response('Log recorded.');
        }

        return new Response('Not found in EventLogsDO', {status: 404});
    }

    /**
     * Runs aggregation queries against the raw `events` table and stores the
     * results in the `analytics_summary_24h` table for fast dashboard loading.
     */
    async runAggregation() {
        console.log("EventLogsDO: Starting analytics aggregation...");
        const db = this.state.storage.sql;
        const since = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours

        const [
            actions,
            total,
            blocked,
            topCountries,
            topAsns,
            topRules,
            timeseries
        ] = await db.batch([
            db.prepare("SELECT action, COUNT(*) AS count FROM events WHERE timestamp > ? GROUP BY action").bind(since),
            db.prepare("SELECT COUNT(*) AS count FROM events WHERE timestamp > ?").bind(since),
            db.prepare("SELECT COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND timestamp > ?").bind(since),
            db.prepare("SELECT country, COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND country IS NOT NULL AND timestamp > ? GROUP BY country ORDER BY count DESC LIMIT 5").bind(since),
            db.prepare("SELECT asn, COUNT(*) AS count FROM events WHERE action = 'BLOCK' AND asn IS NOT NULL AND timestamp > ? GROUP BY asn ORDER BY count DESC LIMIT 5").bind(since),
            db.prepare("SELECT rule_id, COUNT(*) AS count FROM events WHERE rule_id IS NOT NULL AND timestamp > ? GROUP BY rule_id ORDER BY count DESC LIMIT 5").bind(since),
            db.prepare("SELECT timestamp FROM events WHERE timestamp > ? ORDER BY timestamp ASC").bind(since)
        ]);

        const summary = {
            totalRequests: total.results[0]?.count || 0,
            threatsBlocked: blocked.results[0]?.count || 0,
            eventsByAction: actions.results,
            topBlockedCountries: topCountries.results,
            topBlockedAsns: topAsns.results,
            topTriggeredRules: topRules.results,
            eventsTimeseries: timeseries.results,
        };

        await db.prepare("INSERT OR REPLACE INTO analytics_summary_24h (id, last_updated, data) VALUES (1, ?, ?)")
            .bind(Date.now(), JSON.stringify(summary))
            .run();

        console.log("EventLogsDO: Analytics aggregation complete.");
    }
}
