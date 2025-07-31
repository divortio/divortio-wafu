/*
 * =============================================================================
 * FILE: src/worker.js
 *
 * DESCRIPTION:
 * The main entry point and orchestrator for the distributed WAFu system.
 * This final version includes full origin proxying logic and a secure,
 * JWT-based authentication system for the admin API.
 * =============================================================================
 */

import {GlobalRulesDO} from './global-rules-do.js';
import {RouteRulesDO} from './route-rules-do.js';
import {OtpDO} from './otp-do.js';
import {EventLogsDO} from './event-logs-do.js';
import {AuditLogsDO} from './audit-logs-do.js';

// --- Self-Contained JWT Validation ---

/**
 * Decodes the payload of a JWT without verifying the signature.
 * @param {string} token - The JWT string.
 * @returns {object|null} The decoded payload or null if parsing fails.
 */
function decodeJwtPayload(token) {
    try {
        const payload = token.split('.')[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    } catch (e) {
        return null;
    }
}

/**
 * Verifies the signature of a JWT using HMAC SHA-256.
 * @param {string} token - The JWT string.
 * @param {string} secret - The secret key for verification.
 * @returns {Promise<boolean>} True if the signature is valid.
 */
async function verifyJwt(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;

        const [header, payload, signature] = parts;
        const data = `${header}.${payload}`;

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(secret),
            {name: 'HMAC', hash: 'SHA-256'},
            false,
            ['verify']
        );

        let signatureBytes;
        try {
            signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
        } catch (e) {
            return false; // Invalid base64 signature
        }

        return await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(data));
    } catch (e) {
        return false;
    }
}

/**
 * Authenticates a request by validating its JWT.
 * @param {Request} request - The incoming HTTP request.
 * @param {object} env - The environment object containing bindings.
 * @returns {Promise<{isAuthenticated: boolean, user: object|null}>}
 */
async function getAdminUserFromJwt(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {isAuthenticated: false, user: null};
    }

    const token = authHeader.substring(7);
    const isValid = await verifyJwt(token, env.WAFU_CONFIG_SECRET);

    if (!isValid) {
        return {isAuthenticated: false, user: null};
    }

    const payload = decodeJwtPayload(token);
    if (!payload) {
        return {isAuthenticated: false, user: null};
    }

    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
        return {isAuthenticated: false, user: null};
    }

    return {
        isAuthenticated: true,
        user: {
            id: payload.sub,
            role: 'administrator' // In a real system, this would come from the token or a DB lookup
        }
    };
}


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

        // --- ROUTE 1: User-Facing Admin UI ---
        if (url.pathname.startsWith('/wafu-admin')) {
            return env.ASSETS.fetch(request);
        }

        // --- ROUTE 2: API Proxy for the UI ---
        if (url.pathname.startsWith('/api/')) {
            const {isAuthenticated, user} = await getAdminUserFromJwt(request, env);

            if (!isAuthenticated) {
                return new Response(JSON.stringify({error: 'Unauthorized'}), {
                    status: 401,
                    headers: {'Content-Type': 'application/json'}
                });
            }

            if (request.method !== 'GET' && user.role !== 'administrator') {
                return new Response(JSON.stringify({error: 'Forbidden: Viewers cannot perform this action.'}), {
                    status: 403,
                    headers: {'Content-Type': 'application/json'}
                });
            }

            const apiRequest = new Request(request);
            apiRequest.headers.set('X-WAFu-User-ID', user.id);

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

        // --- ROUTE 3: WAF Evaluation for All Other Traffic ---
        const wafRequestPayload = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers),
            cf: request.cf,
        };

        const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));
        const globalDecision = await globalDO.evaluate(wafRequestPayload);

        if (globalDecision.action === 'BLOCK' || globalDecision.action === 'CHALLENGE') {
            return new Response(globalDecision.blockResponse.body, {
                status: globalDecision.blockResponse.statusCode,
                headers: {'Content-Type': globalDecision.blockResponse.contentType},
            });
        }

        if (globalDecision.action !== 'ALLOW' || !globalDecision.matchedRoute) {
            return new Response(`WAFu: Request blocked by global policy for host "${request.headers.get('host')}".`, {status: 403});
        }

        const route = globalDecision.matchedRoute;
        const routeDO = env.WAFU_ROUTE_DO.get(env.WAFU_ROUTE_DO.idFromName(route.id));
        const routeDecision = await routeDO.evaluate(wafRequestPayload);

        if (routeDecision.action === 'ALLOW' || routeDecision.action === 'LOG') {
            if (route.origin_type === 'service' && env[route.origin_service_name]) {
                const service = env[route.origin_service_name];
                return service.fetch(request);
            } else if (route.origin_type === 'url' && route.origin_url) {
                return fetch(route.origin_url, request);
            } else {
                return new Response(`WAFu Error: The origin for route ${route.incomingHost} is not correctly configured.`, {status: 500});
            }
        } else {
            return new Response(globalDecision.blockResponse.body, {
                status: globalDecision.blockResponse.statusCode,
                headers: {'Content-Type': globalDecision.blockResponse.contentType},
            });
        }
    },

    async scheduled(event, env, ctx) {
        console.log(`Cron triggered at ${new Date(event.scheduledTime)}`);
        const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));
        const eventLogsDO = env.WAFU_EVENT_LOGS_DO.get(env.WAFU_EVENT_LOGS_DO.idFromName('singleton'));

        ctx.waitUntil(globalDO.fetch('https://wafu.internal/api/global/threat-feeds/update-scheduled', {method: 'POST'}));
        ctx.waitUntil(eventLogsDO.fetch('https://wafu.internal/api/global/analytics/aggregate', {method: 'POST'}));
    },
};

export {GlobalRulesDO} from './global-rules-do.js';
export {RouteRulesDO} from './route-rules-do.js';
export {OtpDO} from './otp-do.js';
export {EventLogsDO} from './event-logs-do.js';
export {AuditLogsDO} from './audit-logs-do.js';
