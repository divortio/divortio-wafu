/*
 * =============================================================================
 * FILE: src/worker.js
 *
 * DESCRIPTION:
 * The main entry point for the WAFu system. This version has been refactored
 * to the modern ES Module syntax to be compatible with the Workers Static
 * Assets feature.
 * =============================================================================
 */

// --- Durable Object Class Imports ---
import {GlobalRulesDO} from './global-rules-do.js';
import {RouteRulesDO} from './route-rules-do.js';
import {OtpDO} from './otp-do.js';
import {EventLogsDO} from './event-logs-do.js';
import {AuditLogsDO} from './audit-logs-do.js';

// --- JWT and Auth Functions ---
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
        if (decodedPayload.exp && Date.now() / 1000 > decodedPayload.exp) return null;
        return decodedPayload;
    } catch (e) {
        return null;
    }
}

async function getAdminUserFromJwt(request, env) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return {isAuthenticated: false, user: null};
    const token = authHeader.substring(7);
    const payload = await verifyJwt(token, env.JWT_SECRET);
    if (!payload) return {isAuthenticated: false, user: null};
    return {isAuthenticated: true, user: {id: payload.sub, role: payload.role || 'viewer'}};
}

// --- Main Worker Definition (ES Module Syntax) ---
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // ROUTE 1: Admin UI
        if (url.pathname.startsWith('/wafu-admin')) {
            // env.ASSETS is now available because we are using the ES Module syntax.
            return env.ASSETS.fetch(request);
        }

        // ROUTE 2: Admin Login
        if (url.pathname === '/api/admin/login' && request.method === 'POST') {
            try {
                const {password} = await request.json();
                if (password === env.WAFU_ADMIN_SECRET) {
                    const payload = {
                        sub: 'admin@wafu.com',
                        role: 'administrator',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 8)
                    };
                    const token = await createJwt(payload, env.JWT_SECRET);
                    return new Response(JSON.stringify({token}), {headers: {'Content-Type': 'application/json'}});
                }
            } catch (e) {
            }
            return new Response(JSON.stringify({error: 'Invalid credentials'}), {
                status: 401,
                headers: {'Content-Type': 'application/json'}
            });
        }

        // ROUTE 3: Authenticated API
        if (url.pathname.startsWith('/api/')) {
            const {isAuthenticated, user} = await getAdminUserFromJwt(request, env);
            if (!isAuthenticated) {
                return new Response(JSON.stringify({error: 'Unauthorized'}), {status: 401});
            }
            if (request.method !== 'GET' && user.role !== 'administrator') {
                return new Response(JSON.stringify({error: 'Forbidden'}), {status: 403});
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

        // ROUTE 4: WAF Evaluation
        const wafRequestPayload = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers),
            cf: request.cf
        };
        const globalDO = env.WAFU_GLOBAL_DO.get(env.WAFU_GLOBAL_DO.idFromName('singleton'));
        const globalDecision = await globalDO.evaluate(wafRequestPayload);

        if (globalDecision.action === 'BLOCK' || globalDecision.action === 'CHALLENGE') {
            return new Response(globalDecision.blockResponse.body, {
                status: globalDecision.blockResponse.statusCode,
                headers: {'Content-Type': globalDecision.blockResponse.contentType}
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
                headers: {'Content-Type': globalDecision.blockResponse.contentType}
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

// Export Durable Object classes so they can be used in wrangler.toml
export {GlobalRulesDO, RouteRulesDO, OtpDO, EventLogsDO, AuditLogsDO};
