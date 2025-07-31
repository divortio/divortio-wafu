/*
 * =============================================================================
 * FILE: public/config.js
 *
 * DESCRIPTION:
 * Contains the default configuration for the WAFu application.
 * Externalizing this from the main UI script makes it easier to manage
 * and update without touching the application logic.
 * =============================================================================
 */

const DEFAULT_CONFIG = {
    blockResponse: {
        statusCode: 403,
        contentType: 'text/html',
        body: '<h1>Forbidden</h1><p>This request was blocked by the security policy.</p>'
    },
    routes: [
        {
            id: 'route-1',
            incomingHost: 'www.domain.com',
            originUrl: 'https://my-frontend.pages.dev',
            enabled: true,
            customRules: [
                {
                    id: 'www.domain.com-ALLOW-12a3b4-1',
                    name: 'Allow GET requests',
                    priority: 1,
                    description: 'Allow standard web traffic',
                    enabled: true,
                    action: 'ALLOW',
                    expression: [{field: 'request.method', operator: 'equals', value: 'GET'}],
                    tags: ['web']
                }
            ]
        },
        {
            id: 'route-2',
            incomingHost: 'api.domain.com',
            originUrl: 'https://my-backend.workers.dev',
            enabled: true,
            customRules: []
        },
    ],
    globalRules: [
        {
            id: 'global-BLOCK-c5d6e7-1',
            priority: 1,
            name: 'Block Tor Exit Nodes',
            description: 'Block traffic from known Tor exit nodes.',
            enabled: true,
            action: 'BLOCK',
            expression: [{field: 'request.cf.country', operator: 'equals', value: 'T1'}],
            tags: ['security', 'tor']
        },
        {
            id: 'global-ALLOW-f8g9h0-1',
            priority: 2,
            name: 'Route Rule for www.domain.com',
            description: 'Auto-generated rule to allow traffic to www.domain.com for route-specific evaluation.',
            enabled: true,
            action: 'ALLOW',
            expression: [{field: 'request.headers.host', operator: 'equals', value: 'www.domain.com'}],
            tags: ['auto-generated', 'route-rule']
        },
        {
            id: 'global-ALLOW-i1j2k3-1',
            priority: 3,
            name: 'Route Rule for api.domain.com',
            description: 'Auto-generated rule to allow traffic to api.domain.com for route-specific evaluation.',
            enabled: true,
            action: 'ALLOW',
            expression: [{field: 'request.headers.host', operator: 'equals', value: 'api.domain.com'}],
            tags: ['auto-generated', 'route-rule']
        }
    ]
};
