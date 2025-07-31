/*
 * =============================================================================
 * FILE: src/audit-logs-do.js
 *
 * DESCRIPTION:
 * Defines the `AuditLogsDO` class. This version has been corrected to use
 * the proper `this.state.storage.sql.exec()` API for all database operations.
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
        this.state.blockConcurrencyWhile(async () => {
            await this.initializeDatabase();
        });
    }

    /**
     * Creates the SQLite table for audit logs if it doesn't already exist.
     */
    async initializeDatabase() {
        await this.state.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs
                (
                    id                         TEXT
                        PRIMARY KEY,
                    timestamp                  INTEGER NOT NULL,
                    user_id                    TEXT    NOT NULL,
                    context                    TEXT    NOT NULL, -- e.g., 'global', 'route-1'
                    action                     TEXT    NOT NULL, -- e.g., 'CREATE_RULE', 'UPDATE_ROUTE', 'DELETE_USER'
                    target_id                  TEXT    NOT NULL, -- The ID of the object that was changed
                    data_before                TEXT,             -- JSON string of the object before the change
                    data_after                 TEXT              -- JSON string of the object after the change
                )
        `);
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
     */
    async fetch(request) {
        const url = new URL(request.url);
        const sql = this.state.storage.sql;

        // --- API Endpoint for UI to Query Logs ---
        if (url.pathname.startsWith('/api/global/audit-logs') && request.method === 'GET') {
            try {
                const params = url.searchParams;
                const page = parseInt(params.get('page') || '1', 10);
                const limit = parseInt(params.get('limit') || '50', 10);
                const offset = (page - 1) * limit;

                let whereClauses = [];
                let bindings = [];

                if (params.get('userId')) {
                    whereClauses.push("user_id = ?1");
                    bindings.push(params.get('userId'));
                }
                if (params.get('context')) {
                    whereClauses.push("context = ?2");
                    bindings.push(params.get('context'));
                }
                if (params.get('action')) {
                    whereClauses.push("action = ?3");
                    bindings.push(params.get('action'));
                }

                const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

                const dataQuery = `SELECT * FROM audit_logs ${whereString} ORDER BY timestamp DESC LIMIT ?${bindings.length + 1} OFFSET ?${bindings.length + 2}`;
                const dataBindings = [...bindings, limit, offset];

                const countQuery = `SELECT COUNT(*) AS total FROM audit_logs ${whereString}`;
                const countBindings = [...bindings];

                const dataPromise = sql.exec(dataQuery, dataBindings);
                const totalPromise = sql.exec(countQuery, countBindings);

                const [{results: logs}, {results: totalResult}] = await Promise.all([dataPromise, totalPromise]);

                const total = totalResult.length > 0 ? totalResult[0].total : 0;

                const responsePayload = {
                    logs: logs,
                    totalPages: Math.ceil(total / limit),
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

                if (!logEntry.userId || !logEntry.context || !logEntry.action || !logEntry.targetId) {
                    return new Response('Invalid audit log entry: Missing required fields.', {status: 400});
                }

                await sql.exec(
                    `INSERT INTO audit_logs (id, timestamp, user_id, context, action, target_id, data_before, data_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        crypto.randomUUID(),
                        logEntry.timestamp || Date.now(),
                        logEntry.userId,
                        logEntry.context,
                        logEntry.action,
                        logEntry.targetId,
                        JSON.stringify(logEntry.dataBefore || null),
                        JSON.stringify(logEntry.dataAfter || null)
                    ]
                );

                return new Response('Log recorded.');
            } catch (e) {
                console.error("Audit Log Write Error:", e);
                return new Response('Failed to write audit log.', {status: 500});
            }
        }

        return new Response('Not found in AuditLogsDO', {status: 404});
    }
}
