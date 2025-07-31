/*
 * =============================================================================
 * FILE: src/worker.js
 *
 * DESCRIPTION:
 * The main entry point for the WAFu system. This version has been updated
 * to use the modern Workers Static Assets feature instead of the deprecated
 * `[[site]]` configuration for serving the admin UI.
 * =============================================================================
 */

// --- Static Asset Imports ---
// This special import brings in the static asset handler and a manifest
// of all the files in the `public` directory.
import {handle} from 'workbox-precaching';
import {manifest, version} from '__STATIC_CONTENT_MANIFEST';

// --- Durable Object Class Imports ---
import {GlobalRulesDO} from './global-rules-do.js';
import {RouteRulesDO} from './route-rules-do.js';
import {OtpDO} from './otp-do.js';
import {EventLogsDO} from './event-logs-do.js';
import {AuditLogsDO} from './audit-logs-do.js';


// --- JWT and Auth Functions ---

/**
 * Creates a JWT.
 * @param {object} payload - The data to include in the token.
 * @param {string} secret - The secret key for signing.
 * @returns {Promise<string>} The generated JWT.
 */
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

/**
 * Verifies the signature of a JWT.
 * @param {string} token - The JWT string.
 * @param {string} secret - The secret key for verification.
 * @returns {Promise<object|null>} The decoded payload if valid, otherwise null.
 */
async function verifyJwt(token, secret) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [header, payload, signature] = parts;
        const data = `${header}.${payload}`;
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {
            name: 'HMAC',
            hash: 'SHA-256'
        }, false, ['verify']);
        const signatureBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

        const isValid = await crypto.subtle.verify('HMAC', key, signatureBytes, new TextEncoder().encode(data));
        if (!isValid) return null;

        const decodedPayload = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) {
            return null; // Token expired
        }
        return decodedPayload;
    } catch (e) {
        return null;
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
    const payload = await verifyJwt(token, env.JWT_SECRET);

    if (!payload) {
        return {isAuthenticated: false, user: null};
    }

    return {
        isAuthenticated: true,
        user: {
            id: payload.sub,
            role: payload.role || 'viewer' // Default to viewer if role is not in token
        }
    };
}


export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- ROUTE 1: User-Facing Admin UI (Updated Logic) ---
        // Serve static assets from the `public` directory for the admin path.
        if (url.pathname.startsWith('/wafu-admin')) {
            try {
                // The new, modern way to serve static assets.
                // It checks the manifest for the requested file and serves it.
                return await handle(new Request(url.toString(), request), {
                    manifest,
                    version,
                });
            } catch (e) {
                // If the asset is not found, let the request fall through
                // to the WAF evaluation, in case it's a dynamic route.
            }
        }

        // --- ROUTE 2: Admin Login Endpoint ---
        if (url.pathname === '/api/admin/login' && request.method === 'POST') {
            try {
                const {password} = await request.json();
                if (password === env.WAFU_ADMIN_SECRET) {
                    const payload = {
                        sub: 'admin@wafu.com',
                        role: 'administrator',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8) // 8-hour session
                    };
                    const token = await createJwt(payload, env.JWT_SECRET);
                    return new Response(JSON.stringify({token}), {headers: {'Content-Type': 'application/json'}});
                }
            } catch (e) {
                // Catches JSON parsing errors
            }
            return new Response(JSON.stringify({error: 'Invalid credentials'}), {
                status: 401,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // --- ROUTE 3: Authenticated API Proxy for the UI ---
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

            return new Response(JSON.stringify({error: 'API endpoint not found'}), {status: 404});
        }

        // --- ROUTE 4: WAF Evaluation for All Other Traffic ---
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
                return env[route.origin_service_name].fetch(request);
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
