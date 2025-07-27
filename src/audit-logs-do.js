/*
 * =============================================================================
 * FILE: src/audit-logs-do.js
 *
 * DESCRIPTION:
 * Defines the `AuditLogsDO` class. This is a singleton Durable Object that
 * provides an immutable, append-only logging service for all configuration
 * changes made across the WAFu platform. It ensures a complete and reliable
 * audit trail for security and compliance purposes.
 * =============================================================================
 */

export class AuditLogsDO {
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
     * Creates the SQLite table for audit logs if it doesn't already exist.
     * This is executed only on the very first instantiation of this singleton DO.
     */
    async initializeDatabase() {
        const db = this.state.storage.sql;
        await db.prepare(`
            CREATE TABLE IF NOT EXISTS audit_logs
                (
                    id TEXT
                        PRIMARY KEY,
                    timestamp INTEGER NOT NULL,
                    user_id TEXT      NOT NULL,
                    context TEXT      NOT NULL, -- e.g., 'global', 'route-1'
                    action TEXT       NOT NULL, -- e.g., 'CREATE_RULE', 'UPDATE_ROUTE', 'DELETE_USER'
                    target_id TEXT    NOT NULL, -- The ID of the object that was changed
                    data_before TEXT,           -- JSON string of the object before the change
                    data_after TEXT             -- JSON string of the object after the change
                )
        `).run();
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
     * This acts as the object's internal router for API calls.
     * @param {Request} request - The incoming HTTP request.
     */
    async fetch(request) {
        const url = new URL(request.url);

        // --- API Endpoint for UI to Query Logs ---
        // Example: GET /api/global/audit-logs?page=1&limit=50&user=admin@wafu.com
        if (url.pathname.startsWith('/api/global/audit-logs') && request.method === 'GET') {
            try {
                const params = url.searchParams;
                const page = parseInt(params.get('page') || '1', 10);
                const limit = parseInt(params.get('limit') || '50', 10);
                const offset = (page - 1) * limit;

                let whereClauses = [];
                let bindings = [];

                if (params.get('userId')) {
                    whereClauses.push("user_id = ?");
                    bindings.push(params.get('userId'));
                }
                if (params.get('context')) {
                    whereClauses.push("context = ?");
                    bindings.push(params.get('context'));
                }
                if (params.get('action')) {
                    whereClauses.push("action = ?");
                    bindings.push(params.get('action'));
                }

                const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

                const query = `SELECT * FROM audit_logs ${whereString} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
                bindings.push(limit, offset);

                const countQuery = `SELECT COUNT(*) AS total FROM audit_logs ${whereString}`;
                const countBindings = bindings.slice(0, -2); // Remove limit and offset for count

                const db = this.state.storage.sql;
                const [data, total] = await db.batch([
                    db.prepare(query).bind(...bindings),
                    db.prepare(countQuery).bind(...countBindings)
                ]);

                const responsePayload = {
                    logs: data.results,
                    totalPages: Math.ceil((total.results[0]?.total || 0) / limit),
                    currentPage: page,
                };

                return new Response(JSON.stringify(responsePayload), {headers: {'Content-Type': 'application/json'}});

            } catch (e) {
                console.error("Audit Log Query Error:", e);
                return new Response(JSON.stringify({error: e.message}), {
                    status: 500,
                    headers: {'Content-Type': 'application/json'}
                });
            }
        }

        // --- Internal Endpoint for Other DOs to Write a Log Entry ---
        if (url.pathname === '/log' && request.method === 'POST') {
            try {
                const logEntry = await request.json();

                // Basic validation
                if (!logEntry.userId || !logEntry.context || !logEntry.action || !logEntry.targetId) {
                    return new Response('Invalid audit log entry: Missing required fields.', {status: 400});
                }

                const stmt = this.state.storage.sql.prepare(
                        `INSERT INTO
                             audit_logs (id, timestamp, user_id, context, action, target_id, data_before, data_after)
                             VALUES
                                 (?, ?, ?, ?, ?, ?, ?, ?)`
                );
                await stmt.bind(
                    crypto.randomUUID(),
                    logEntry.timestamp || Date.now(),
                    logEntry.userId,
                    logEntry.context,
                    logEntry.action,
                    logEntry.targetId,
                    JSON.stringify(logEntry.dataBefore || null),
                    JSON.stringify(logEntry.dataAfter || null)
                ).run();

                return new Response('Log recorded.');
            } catch (e) {
                console.error("Audit Log Write Error:", e);
                return new Response('Failed to write audit log.', {status: 500});
            }
        }

        return new Response('Not found in AuditLogsDO', {status: 404});
    }
}
