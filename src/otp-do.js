/*
 * =============================================================================
 * FILE: src/otp-do.js
 *
 * DESCRIPTION:
 * Defines the `OtpDO` class. This version has been corrected to
 * extend the base `DurableObject` class, enabling RPC functionality.
 * =============================================================================
 */

import {DurableObject} from "cloudflare:workers";

async function createJwt(payload, secret) {
    const header = {alg: 'HS256', typ: 'JWT'};
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const data = `${encodedHeader}.${encodedPayload}`;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {
        name: 'HMAC',
        hash: 'SHA-256'
    }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${data}.${encodedSignature}`;
}

// The class now extends DurableObject
export class OtpDO extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env); // Must call super()
        this.ctx = ctx;
        this.env = env;
    }

    /**
     * Handles all incoming fetch events for this specific OTP instance.
     */
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/initialize' && request.method === 'POST') {
            const {results} = await this.ctx.storage.sql.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='otp_state'");
            if (results.length > 0) {
                return new Response('OTP already initialized.', {status: 409});
            }
            return this.initialize(request);
        }

        if (url.pathname === '/status' && request.method === 'GET') {
            const {results} = await this.ctx.storage.sql.exec("SELECT * FROM otp_state LIMIT 1");
            if (!results || results.length === 0) {
                return new Response(JSON.stringify({error: "OTP not found or not initialized."}), {
                    status: 404,
                    headers: {'Content-Type': 'application/json'}
                });
            }
            return new Response(JSON.stringify(results[0]), {headers: {'Content-Type': 'application/json'}});
        }

        if (url.pathname === '/activate' && request.method === 'POST') {
            let result;
            await this.ctx.storage.transaction(async (txn) => {
                const {results} = await txn.exec("SELECT * FROM otp_state LIMIT 1");
                const current = results[0];
                const now = Date.now();

                if (!current || current.activated_at || now > current.expires_at) {
                    result = {success: false, error: "Invalid, expired, or already used token."};
                    return;
                }

                await txn.exec("UPDATE otp_state SET activated_at = ?", [now]);

                const accessTokenPayload = {
                    sub: current.user_id,
                    gate: current.gate_id,
                    context: current.context,
                    iat: Math.floor(now / 1000),
                    exp: Math.floor(now / 1000) + (60 * 15) // 15-minute expiration
                };
                const accessToken = await createJwt(accessTokenPayload, this.env.JWT_SECRET);

                result = {
                    success: true,
                    message: "Session created successfully.",
                    accessToken: accessToken,
                    refreshToken: "placeholder-refresh-token"
                };
            });
            return new Response(JSON.stringify(result), {headers: {'Content-Type': 'application/json'}});
        }

        return new Response('Not Found in OtpDO', {status: 404});
    }

    async initialize(request) {
        try {
            const {token, userId, gateId, context, expiresAt} = await request.json();

            await this.ctx.storage.sql.exec(`
                CREATE TABLE otp_state
                    (
                        token        TEXT
                            PRIMARY KEY,
                        user_id      TEXT    NOT NULL,
                        gate_id      TEXT    NOT NULL,
                        context      TEXT    NOT NULL,
                        created_at   INTEGER NOT NULL,
                        expires_at   INTEGER NOT NULL,
                        activated_at INTEGER
                    )
            `);

            await this.ctx.storage.sql.exec(
                "INSERT INTO otp_state (token, user_id, gate_id, context, created_at, expires_at, activated_at) VALUES (?, ?, ?, ?, ?, ?, NULL)",
                [token, userId, gateId, context, Date.now(), expiresAt]
            );

            await this.ctx.storage.setAlarm(expiresAt + (60 * 1000));

            return new Response("OTP Initialized successfully.");
        } catch (e) {
            console.error("OTP Initialization Error:", e);
            await this.ctx.storage.deleteAll();
            return new Response("Failed to initialize OTP.", {status: 500});
        }
    }

    async alarm() {
        console.log(`OTP DO (${this.ctx.id}): Alarm triggered. Deleting all storage.`);
        await this.ctx.storage.deleteAll();
    }
}
