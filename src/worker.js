/*
 * =============================================================================
 * FILE: src/worker.js
 *
 * DESCRIPTION:
 * The main entry point and orchestrator for the distributed WAFu system.
 * This worker is the "brain" that decides which Durable Object to call and
 * how to route traffic. It includes full RBAC enforcement and a `scheduled`
 * handler that triggers both threat feed updates and analytics aggregation.
 *
 * EXECUTION FLOW (fetch):
 * 1. Static Assets: Requests for the UI (`/` or `/_wafu/*`) are served first.
 * 2. API Proxy: Requests to `/api/*` are intercepted. The user's role is
 * determined, and RBAC is enforced. The request is then forwarded to the
 * appropriate Durable Object.
 * 3. WAF Evaluation: All other requests are treated as traffic to be protected.
 * a. A stateless "hot path" performs initial checks against KV-based
 * threat intelligence feeds.
 * b. The request is then sent to the GlobalRulesDO for the first stage of
 * stateful evaluation.
 * c. If allowed by global rules, the request is sent to the specific
 * RouteRulesDO for the final stage of evaluation.
 * d. The final decision (ALLOW, BLOCK, AUTH, etc.) is enforced.
 * e. All decisions are logged asynchronously to the EventLogsDO.
 *
 * EXECUTION FLOW (scheduled):
 * Triggered by a cron, this handler calls the appropriate DOs to kick off
 * background tasks for updating threat feeds and aggregating analytics data.
 * =============================================================================
 */

// Import all Durable Object classes that will be bound in wrangler.toml
import {GlobalRulesDO} from './global-rules-do.js';
import {RouteRulesDO} from './route-rules-do.js';
import {OtpDO} from './otp-do.js';
import {EventLogsDO} from './event-logs-do.js';
import {AuditLogsDO} from './audit-logs-do.js';

/**
 * Simulates decoding a JWT to get the user's identity.
 * In a real-world application, this would use a library like `jose` to
 * verify a JWT from the Authorization header or a secure cookie.
 * @param {Request} request - The incoming HTTP request.
 * @returns {{id: string, role: string}} The user's identity.
 */
const getUserFromToken = (request) => {
    // This is a placeholder for a real authentication system.
    // It allows toggling between admin and viewer for demo purposes.
    const authHeader = request.headers.get('Authorization');
    if (authHeader === 'viewer-token') {
        return {id: 'viewer@wafu.com', role: 'viewer'};
    }
    // Default to administrator for the demo
    return {id: 'admin@wafu.com', role: 'administrator'};
};

export default {
    /**
     * The main fetch handler for the Worker.
     * @param {Request} request - The incoming HTTP request.
     * @param {object} env - The environment object containing bindings.
     * @param {object} ctx - The execution context.
     * @returns {Promise<Response>} The response to the client.
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- ROUTE 1: User-Facing UI & Auth Pages ---
        // Serve the single-page React application for the root or special auth paths.
        if (url.pathname === '/' || url.pathname.startsWith('/_wafu/')) {
            // The `[[site]]` configuration in wrangler.toml handles this automatically.
            // We pass through to the static asset handler.
            return env.ASSETS.fetch(request);
        }

        // --- ROUTE 2: API Proxy for the UI ---
        if (url.pathname.startsWith('/api/')) {
            const user = getUserFromToken(request);

            // Enforce RBAC: Only administrators can perform write operations.
            if (request.method !== 'GET') {
                if (user.role !== 'administrator') {
                    return new Response(JSON.stringify({error: 'Forbidden: Viewers cannot perform this action.'}), {
                        status: 403,
                        headers: {'Content-Type': 'application/json'}
                    });
                }
            }

            // Clone the request to add the user's identity for auditing purposes.
            const apiRequest = new Request(request);
            apiRequest.headers.set('X-WAFu-User-ID', user.id);

            // Proxy the API request to the appropriate Durable Object.
            const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));

            if (url.pathname.startsWith('/api/global/')) {
                return globalDO.fetch(apiRequest);
            }

            const routeMatch = url.pathname.match(/^\/api\/routes\/(route-\d+)/);
            if (routeMatch) {
                const routeId = routeMatch[1];
                const routeDO = env.WAFU_ROUTE_DO.get(env.WAFU_ROUTE_DO.idFromName(routeId));
                return routeDO.fetch(apiRequest);
            }

            return new Response(JSON.stringify({error: 'API endpoint not found'}), {
                status: 404,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // --- ROUTE 3: WAF Evaluation for Site Traffic ---
        const wafRequestPayload = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers),
            cf: request.cf,
        };

        // STAGE 1: Global Rule Evaluation
        const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));
        const globalEvalRequest = new Request('https://wafu.internal/evaluate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(wafRequestPayload)
        });

        const globalDecisionResponse = await globalDO.fetch(globalEvalRequest);
        if (!globalDecisionResponse.ok) return new Response('Error evaluating global rules', {status: 500});
        const globalDecision = await globalDecisionResponse.json();

        // Enforce terminal actions from Global Rules
        if (globalDecision.action === 'BLOCK' || globalDecision.action === 'CHALLENGE') {
            return new Response(globalDecision.blockResponse.body, {
                status: globalDecision.blockResponse.statusCode,
                headers: {'Content-Type': globalDecision.blockResponse.contentType},
            });
        }

        if (globalDecision.action !== 'ALLOW' || !globalDecision.matchedRoute) {
            return new Response(`WAFu: Request blocked by global policy for host "${request.headers.get('host')}".`, {status: 403});
        }

        // STAGE 2: Route-Specific Rule Evaluation
        const route = globalDecision.matchedRoute;
        const routeDO = env.WAFU_ROUTE_DO.get(env.WAFU_ROUTE_DO.idFromName(route.id));

        const routeEvalRequest = new Request('https://wafu.internal/evaluate', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(wafRequestPayload)
        });

        const routeDecisionResponse = await routeDO.fetch(routeEvalRequest);
        if (!routeDecisionResponse.ok) return new Response('Error evaluating route rules', {status: 500});
        const routeDecision = await routeDecisionResponse.json();

        if (routeDecision.action === 'ALLOW' || routeDecision.action === 'LOG') {
            // ... (Proxying logic will be added in a future step)
            return new Response(`Request allowed for route ${route.incomingHost}. Would be proxied to ${route.originUrl}.`);
        } else {
            // Default block from route-level, or explicit block/challenge
            return new Response(globalDecision.blockResponse.body, {
                status: globalDecision.blockResponse.statusCode,
                headers: {'Content-Type': globalDecision.blockResponse.contentType},
            });
        }
    },

    /**
     * The scheduled event handler, triggered by the cron in wrangler.toml.
     * @param {ScheduledEvent} event - The scheduled event object.
     * @param {object} env - The environment object containing bindings.
     * @param {object} ctx - The execution context.
     */
    async scheduled(event, env, ctx) {
        console.log(`Cron triggered at ${new Date(event.scheduledTime)}`);
        const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));
        const eventLogsDO = env.WAFU_EVENT_LOGS_DO.get(env.WAFU_EVENT_LOGS_DO.idFromName('singleton'));

        ctx.waitUntil(globalDO.fetch('https://wafu.internal/api/global/threat-feeds/update-scheduled', {method: 'POST'}));
        ctx.waitUntil(eventLogsDO.fetch('https://wafu.internal/api/global/analytics/aggregate', {method: 'POST'}));
    },
};

// Export all Durable Object classes so Wrangler can recognize them.
export {GlobalRulesDO} from './global-rules-do.js';
export {RouteRulesDO} from './route-rules-do.js';
export {OtpDO} from './otp-do.js';
export {EventLogsDO} from './event-logs-do.js';
export {AuditLogsDO} from './audit-logs-do.js';
