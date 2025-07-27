/*
 * =============================================================================
 * FILE: src/otp-do.js
 *
 * DESCRIPTION:
 * Defines the `OtpDO` class. A unique instance is created for each OTP link.
 * It manages the state of a single one-time link in its own private SQLite
 * database, ensuring atomicity and preventing reuse. This object is responsible
 * for the entire lifecycle of an OTP, from creation to activation.
 * =============================================================================
 */

export class OtpDO {
    /**
     * The constructor for the Durable Object.
     * @param {DurableObjectState} state - The state object providing access to storage.
     * @param {object} env - The environment object containing bindings.
     */
    constructor(state, env) {
        this.state = state;
        this.env = env;
        // We don't initialize the DB here because this DO must be explicitly
        // initialized with data from its creator (Global or Route DO).
    }

    /**
     * Handles all incoming fetch events for this specific OTP instance.
     * @param {Request} request - The incoming HTTP request.
     */
    async fetch(request) {
        const url = new URL(request.url);

        // --- Internal Initialization Route ---
        // This is a special, one-time call from another DO to set up the OTP.
        if (url.pathname === '/initialize' && request.method === 'POST') {
            const hasBeenInitialized = await this.state.storage.get("initialized");
            if (hasBeenInitialized) {
                return new Response('OTP already initialized.', {status: 409});
            }
            return this.initialize(request);
        }

        // --- Public API Routes for the UI Landing Page ---

        // GET /status: Called by the landing page to get OTP details and check validity.
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

        // POST /activate: Called when the user clicks the "Authenticate" button.
        if (url.pathname === '/activate' && request.method === 'POST') {
            let result;
            // Use a transaction to ensure the check-and-set operation is atomic.
            await this.state.storage.transaction(async ctx => {
                const now = Date.now();
                const current = await ctx.sql.prepare("SELECT * FROM otp_state LIMIT 1").first();

                if (!current || current.activated_at || now > current.expires_at) {
                    result = {success: false, error: "Invalid, expired, or already used token."};
                    return;
                }

                await ctx.sql.prepare("UPDATE otp_state SET activated_at = ?").bind(now).run();

                // In a real implementation, this is where you would call the appropriate
                // Global or Route DO to generate the JWT/Refresh tokens for the user.
                // This would involve a service binding call.
                // For example:
                // const authDO = current.context === 'global' ? this.env.WAFU_GLOBAL_DO...
                // const tokens = await authDO.createSessionForUser(current.user_id, current.gate_id);

                result = {
                    success: true,
                    message: "Session created successfully.",
                    // In a real implementation, tokens would be returned here.
                    accessToken: "dummy-access-token-for-" + current.user_id,
                    refreshToken: "dummy-refresh-token"
                };
            });
            return new Response(JSON.stringify(result), {headers: {'Content-Type': 'application/json'}});
        }

        return new Response('Not Found in OtpDO', {status: 404});
    }

    /**
     * Initializes the OTP's state and database schema. This is a protected
     * method that should only be called once.
     * @param {Request} request - The initialization request containing OTP details.
     */
    async initialize(request) {
        try {
            const {token, userId, gateId, context, expiresAt} = await request.json();

            await this.state.storage.sql.run(
                    `CREATE TABLE otp_state
                         (
                             token        TEXT
                                 PRIMARY KEY,
                             user_id      TEXT    NOT NULL,
                             gate_id      TEXT    NOT NULL,
                             context      TEXT    NOT NULL,
                             created_at   INTEGER NOT NULL,
                             expires_at   INTEGER NOT NULL,
                             activated_at INTEGER
                         )`
            );

            const stmt = this.state.storage.sql.prepare(
                    `INSERT INTO
                         otp_state (token, user_id, gate_id, context, created_at, expires_at, activated_at)
                         VALUES
                             (?, ?, ?, ?, ?, ?, NULL)`
            );
            await stmt.bind(token, userId, gateId, context, Date.now(), expiresAt).run();

            // Set a flag to prevent re-initialization.
            await this.state.storage.put("initialized", true);

            // Set an alarm to automatically clean up this DO's storage after it expires.
            await this.state.storage.setAlarm(expiresAt + (60 * 1000)); // 1 minute after expiration

            return new Response("OTP Initialized successfully.");
        } catch (e) {
            console.error("OTP Initialization Error:", e);
            // If initialization fails, it's crucial to clean up to allow a retry.
            await this.state.storage.deleteAll();
            return new Response("Failed to initialize OTP.", {status: 500});
        }
    }

    /**
     * The alarm handler is triggered after the OTP's expiration time has passed.
     * Its purpose is to delete all storage associated with this DO instance to
     * save resources, as the OTP is no longer valid.
     */
    async alarm() {
        console.log(`OTP DO (${this.state.id}): Alarm triggered. Deleting all storage.`);
        await this.state.storage.deleteAll();
    }
}
