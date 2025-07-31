/*
 * =============================================================================
 * FILE: src/otp-do.js
 *
 * DESCRIPTION:
 * Defines the `OtpDO` class. This version now includes a secure, self-contained
 * JWT generation function to create real session tokens, making the OTP
 * authentication flow fully functional.
 * =============================================================================
 */

/**
 * A basic, self-contained JWT creation function.
 * In a production environment, using a well-vetted library like `jose` is recommended.
 * This implementation is for demonstration purposes.
 * @param {object} payload - The data to include in the token.
 * @param {string} secret - The secret key for signing.
 * @returns {Promise<string>} The generated JWT.
 */
async function createJwt(payload, secret) {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        {name: 'HMAC', hash: 'SHA-256'},
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    return `${data}.${encodedSignature}`;
}


export class OtpDO {
    /**
     * The constructor for the Durable Object.
     * @param {DurableObjectState} state - The state object providing access to storage.
     * @param {object} env - The environment object containing bindings.
     */
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    /**
     * Handles all incoming fetch events for this specific OTP instance.
     * @param {Request} request - The incoming HTTP request.
     */
    async fetch(request) {
        const url = new URL(request.url);

        if (url.pathname === '/initialize' && request.method === 'POST') {
            const hasBeenInitialized = await this.state.storage.get("initialized");
            if (hasBeenInitialized) {
                return new Response('OTP already initialized.', {status: 409});
            }
            return this.initialize(request);
        }

        if (url.pathname === '/status' && request.method === 'GET') {
            const stmt = this.state.storage.sql.prepare("SELECT * FROM otp_state LIMIT 1");
            const result = await stmt.first();
            if (!result) {
                return new Response(JSON.stringify({error: "OTP not found or not initialized."}), {
                    status: 404,
                    headers: {'Content-Type': 'application/json'}
                });
            }
            return new Response(JSON.stringify(result), {headers: {'Content-Type': 'application/json'}});
        }

        if (url.pathname === '/activate' && request.method === 'POST') {
            let result;
            await this.state.storage.transaction(async ctx => {
                const now = Date.now();
                const current = await ctx.sql.prepare("SELECT * FROM otp_state LIMIT 1").first();

                if (!current || current.activated_at || now > current.expires_at) {
                    result = {success: false, error: "Invalid, expired, or already used token."};
                    return;
                }

                await ctx.sql.prepare("UPDATE otp_state SET activated_at = ?").bind(now).run();

                // Generate a real JWT for the user session.
                const accessTokenPayload = {
                    sub: current.user_id,
                    gate: current.gate_id,
                    context: current.context,
                    iat: Math.floor(now / 1000),
                    exp: Math.floor(now / 1000) + (60 * 15) // 15-minute expiration
                };

                const accessToken = await createJwt(accessTokenPayload, this.env.WAFU_CONFIG_SECRET);

                result = {
                    success: true,
                    message: "Session created successfully.",
                    accessToken: accessToken,
                    // In a real implementation, a long-lived refresh token would also be generated.
                    refreshToken: "placeholder-refresh-token"
                };
            });
            return new Response(JSON.stringify(result), {headers: {'Content-Type': 'application/json'}});
        }

        return new Response('Not Found in OtpDO', {status: 404});
    }

    /**
     * Initializes the OTP's state and database schema.
     * @param {Request} request - The initialization request containing OTP details.
     */
    async initialize(request) {
        try {
            const {token, userId, gateId, context, expiresAt} = await request.json();

            await this.state.storage.sql.run(
                `CREATE TABLE otp_state
                     (
                         token                    TEXT
                             PRIMARY KEY,
                         user_id                  TEXT    NOT NULL,
                         gate_id                  TEXT    NOT NULL,
                         context                  TEXT    NOT NULL,
                         created_at               INTEGER NOT NULL,
                         expires_at               INTEGER NOT NULL,
                         activated_at             INTEGER
                     )`
            );

            const stmt = this.state.storage.sql.prepare(
                `INSERT INTO
                     otp_state (token, user_id, gate_id, context, created_at, expires_at, activated_at)
                     VALUES
                         (?, ?, ?, ?, ?, ?, NULL)`
            );
            await stmt.bind(token, userId, gateId, context, Date.now(), expiresAt).run();

            await this.state.storage.put("initialized", true);
            await this.state.storage.setAlarm(expiresAt + (60 * 1000)); // 1 minute after expiration

            return new Response("OTP Initialized successfully.");
        } catch (e) {
            console.error("OTP Initialization Error:", e);
            await this.state.storage.deleteAll();
            return new Response("Failed to initialize OTP.", {status: 500});
        }
    }

    /**
     * The alarm handler to clean up this DO's storage after it expires.
     */
    async alarm() {
        console.log(`OTP DO (${this.state.id}): Alarm triggered. Deleting all storage.`);
        await this.state.storage.deleteAll();
    }
}
