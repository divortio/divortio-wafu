/*
 * =============================================================================
 * FILE: src/audit-logs-do.js
 *
 * DESCRIPTION:
 * Defines the `AuditLogsDO` class. This version has been corrected to
 * extend the base `DurableObject` class, enabling RPC functionality.
 * =============================================================================
 */

import {DurableObject} from "cloudflare:workers";

// The class now extends DurableObject
export class AuditLogsDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env); // Must call super()
        this.ctx = ctx;
        this.env = env;

        this.ctx.waitUntil(this.initializeDatabase());
    }

    /**
     * Creates the SQLite table for audit logs if it doesn't already exist.
     */
    async initializeDatabase() {
        const sql = this.ctx.storage.sql;
        await sql.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs
                (
                    id                         TEXT
                        PRIMARY KEY,
                    timestamp                  INTEGER NOT NULL,
                    user_id                    TEXT    NOT NULL,
                    context                    TEXT    NOT NULL,
                    action                     TEXT    NOT NULL,
                    target_id                  TEXT    NOT NULL,
                    data_before                TEXT,
                    data_after                 TEXT
                )
        `);
    }

    /**
     * Handles all incoming fetch events for the Durable Object.
     */
    async fetch(request) {
        const url = new URL(request.url);
        const sql = this.ctx.storage.sql;

        // API Endpoint for UI to Query Logs
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

                const dataQuery = `SELECT * FROM audit_logs ${whereString} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
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

        // Internal Endpoint for Other DOs to Write a Log Entry
        if (url.pathname === '/log' && request.method === 'POST') {
            try {
                const logEntry = await request.json();

                if (!logEntry.userId || !logEntry.context || !logEntry.action || !logEntry.targetId) {
                    return new Response('Invalid audit log entry: Missing required fields.', {status: 400});
                }

                await sql.exec(
                    `INSERT INTO
                         audit_logs (id, timestamp, user_id, context, action, target_id, data_before, data_after)
                         VALUES
                             (?, ?, ?, ?, ?, ?, ?, ?)`,
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
