/*
 * =============================================================================
 * START public/ui.js (Part 1 of 4)
 *
 * DESCRIPTION:
 * This file contains the complete, final, and fully implemented React
 * application for the WAFu Control Panel. This part includes all constants,
 * utility functions, context providers, and the main App component shell
 * with its router and navigation.
 * =============================================================================
 */

const {useState, useEffect, useCallback, useRef, createContext, useContext} = React;

// --- ICONS, CONSTANTS, UTILS ---

const ICONS = {
    shield: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>,
    route: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
        <line x1="4" y1="22" x2="4" y2="15"></line>
    </svg>,
    book: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>,
    globe: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>,
    tag: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
    </svg>,
    users: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>,
    database: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>,
    webhook: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>,
    chart: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"></path>
        <path d="M18.7 8a2 2 0 0 1 0 2.8l-6 6a2 2 0 0 1-2.8 0l-4-4a2 2 0 0 1 0-2.8l6-6a2 2 0 0 1 2.8 0z"></path>
    </svg>,
    edit: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>,
    trash: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>,
    plus: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>,
    info: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>,
    check: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>,
    chevronDown: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>,
    arrowUp: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5"></line>
        <polyline points="5 12 12 5 19 12"></polyline>
    </svg>,
    arrowDown: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <polyline points="19 12 12 19 5 12"></polyline>
    </svg>,
};

const DOC_BASE_URL = 'https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties';
const HEADER_DOC_URL = 'https://developers.cloudflare.com/fundamentals/reference/http-headers/';

const WAF_FIELD_GROUPS = {
    "Request Properties": [
        {
            id: 'request.method',
            name: 'HTTP Method',
            description: 'The HTTP method of the request.',
            example: 'GET, POST',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods',
            dataType: 'string'
        },
        {
            id: 'request.cf.httpProtocol',
            name: 'HTTP Protocol',
            description: 'The HTTP protocol version.',
            example: 'HTTP/2',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.requestPriority',
            name: 'Request Priority',
            description: 'The priority of the request provided by the browser.',
            example: 'high',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'derived.body.has_body',
            name: 'Has Request Body',
            description: 'A boolean indicating if the request has a body.',
            example: 'true',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/API/Request/body',
            dataType: 'boolean'
        },
    ],
    "Request URL": [
        {
            id: 'request.url',
            name: 'Full URL',
            description: 'The entire URL of the request, including query parameters.',
            example: 'https://example.com/path?q=1',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.headers.host',
            name: 'Host Header',
            description: 'The domain name of the server.',
            example: 'example.com',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Host',
            dataType: 'string'
        },
        {
            id: 'derived.uri.path',
            name: 'URI Path',
            description: 'The path portion of the URL.',
            example: '/path/to/resource',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'derived.uri.query.string',
            name: 'URI Query String',
            description: 'The query string portion of the URL.',
            example: '?key=value',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'derived.uri.query.param_count',
            name: 'Query Parameter Count',
            description: 'The total number of query parameters.',
            example: '3',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.headers.referer',
            name: 'Referer Header',
            description: 'The URL of the page that linked to this resource.',
            example: 'https://google.com',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referer',
            dataType: 'string'
        },
    ],
    "Request Headers": [
        {
            id: 'request.headers.user-agent',
            name: 'User-Agent Header',
            description: 'The User-Agent string of the client.',
            example: 'Mozilla/5.0...',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/User-Agent',
            dataType: 'string'
        },
        {
            id: 'request.headers.content-type',
            name: 'Content-Type Header',
            description: 'The MIME type of the request body.',
            example: 'application/json',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type',
            dataType: 'string'
        },
        {
            id: 'request.headers.authorization',
            name: 'Authorization Header',
            description: 'Contains credentials for authenticating the client.',
            example: 'Bearer ...',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization',
            dataType: 'string'
        },
        {
            id: 'request.headers.cookie',
            name: 'Cookie Header',
            description: 'The raw cookie string sent by the client.',
            example: 'id=a3f...; G_AUTHUSER=0',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cookie',
            dataType: 'string'
        },
        {
            id: 'request.headers.origin',
            name: 'Origin Header',
            description: 'Indicates where a fetch originates from. Used for CORS.',
            example: 'https://ui.example.com',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin',
            dataType: 'string'
        },
        {
            id: 'request.headers.accept-encoding',
            name: 'Accept-Encoding Header',
            description: 'The encoding algorithms that are acceptable to the client.',
            example: 'gzip, deflate, br',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding',
            dataType: 'string'
        },
    ],
    "IP & ASN": [
        {
            id: 'request.headers.cf-connecting-ip',
            name: 'CF-Connecting-IP',
            description: 'The original client IP address.',
            example: '203.0.113.1',
            docUrl: HEADER_DOC_URL,
            dataType: 'ip'
        },
        {
            id: 'request.headers.cf-connecting-ipv6',
            name: 'CF-Connecting-IPv6',
            description: 'The original client IPv6 address.',
            example: '2001:db8::1',
            docUrl: HEADER_DOC_URL,
            dataType: 'ip'
        },
        {
            id: 'request.headers.true-client-ip',
            name: 'True-Client-IP',
            description: 'The original client IP address, used by Enterprise customers.',
            example: '203.0.113.1',
            docUrl: HEADER_DOC_URL,
            dataType: 'ip'
        },
        {
            id: 'request.headers.x-real-ip',
            name: 'X-Real-IP',
            description: 'A common de-facto standard header for identifying the originating IP address.',
            example: '203.0.113.1',
            docUrl: '#',
            dataType: 'ip'
        },
        {
            id: 'request.headers.x-forwarded-for',
            name: 'X-Forwarded-For',
            description: 'A standard header for identifying the originating IP address of a client.',
            example: '203.0.113.1',
            docUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For',
            dataType: 'ip'
        },
        {
            id: 'request.headers.cf-pseudo-ipv4',
            name: 'CF-Pseudo-IPv4',
            description: 'A Class E IPv4 address hashed from the original IPv6 address.',
            example: '224.0.0.1',
            docUrl: HEADER_DOC_URL,
            dataType: 'ip'
        },
        {
            id: 'request.cf.asn',
            name: 'Client ASN',
            description: 'The Autonomous System Number of the client IP.',
            example: '13335',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.asOrganization',
            name: 'ASN Organization',
            description: 'The organization associated with the client ASN.',
            example: 'Cloudflare, Inc.',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
    ],
    "Cloudflare - Headers": [
        {
            id: 'request.headers.cf-visitor',
            name: 'CF-Visitor',
            description: 'Indicates the protocol scheme used by the visitor.',
            example: '{"scheme":"https"}',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
        {
            id: 'request.headers.cf-ray',
            name: 'CF-RAY',
            description: 'The unique identifier for the request.',
            example: '7e2a825d19a268a2-SJC',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
        {
            id: 'request.headers.cdn-loop',
            name: 'CDN-Loop',
            description: 'Indicates if a request has been proxied through Cloudflare more than once.',
            example: 'cloudflare',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
        {
            id: 'request.headers.cf-worker',
            name: 'CF-Worker',
            description: 'The name of the worker that processed the request.',
            example: 'my-worker',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
        {
            id: 'request.headers.cf-ew-via',
            name: 'CF-EW-Via',
            description: 'Used for loop detection, similar to the CDN-Loop header.',
            example: '1',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
    ],
    "Client - Device": [
        {
            id: 'request.headers.cf-device-type',
            name: 'CF-Device-Type',
            description: 'The type of device making the request.',
            example: 'desktop',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
    ],
    "Geolocation": [
        {
            id: 'request.headers.cf-ipcountry',
            name: 'CF-IPCountry',
            description: 'The two-letter country code of the client IP.',
            example: 'US',
            docUrl: HEADER_DOC_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.country',
            name: 'Country',
            description: 'The two-letter country code of the request.',
            example: 'US',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.continent',
            name: 'Continent',
            description: 'The continent of the request.',
            example: 'NA',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.region',
            name: 'Region (State)',
            description: 'The region or state name.',
            example: 'California',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.regionCode',
            name: 'Region Code',
            description: 'The region or state code.',
            example: 'CA',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.city',
            name: 'City',
            description: 'The city of the request.',
            example: 'San Francisco',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.postalCode',
            name: 'Postal Code',
            description: 'The postal code.',
            example: '94107',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.metroCode',
            name: 'Metro Code',
            description: 'The metro code (USA only).',
            example: '807',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.timezone',
            name: 'Timezone',
            description: 'The timezone of the request.',
            example: 'America/Los_Angeles',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.latitude',
            name: 'Latitude',
            description: 'The latitude of the request.',
            example: '37.7749',
            docUrl: DOC_BASE_URL,
            dataType: 'float'
        },
        {
            id: 'request.cf.longitude',
            name: 'Longitude',
            description: 'The longitude of the request.',
            example: '-122.4194',
            docUrl: DOC_BASE_URL,
            dataType: 'float'
        },
        {
            id: 'request.cf.isEUCountry',
            name: 'Is EU Country',
            description: 'A boolean indicating if the request comes from an EU country.',
            example: 'true',
            docUrl: DOC_BASE_URL,
            dataType: 'boolean'
        },
        {
            id: 'request.cf.colo',
            name: 'Cloudflare Datacenter',
            description: 'The 3-letter airport code of the Cloudflare datacenter.',
            example: 'SJC',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
    ],
    "Client - Hints": [
        {
            id: 'request.cf.clientTcpRtt',
            name: 'Client TCP RTT',
            description: 'The round-trip time in milliseconds from client to Cloudflare.',
            example: '50',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.clientAcceptEncoding',
            name: 'Client Accept Encoding',
            description: 'The raw `Accept-Encoding` header value.',
            example: 'gzip, deflate, br',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
    ],
    "Client - Bots": [
        {
            id: 'request.cf.threatScore',
            name: 'Threat Score',
            description: 'Cloudflare\'s threat score for the IP (0-100).',
            example: '10',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.botManagement.score',
            name: 'Bot Score',
            description: 'Cloudflare\'s bot score (1-99).',
            example: '29',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.botManagement.verifiedBot',
            name: 'Verified Bot',
            description: 'A boolean indicating if the request is from a known good bot.',
            example: 'false',
            docUrl: DOC_BASE_URL,
            dataType: 'boolean'
        },
        {
            id: 'request.cf.verifiedBotCategory',
            name: 'Verified Bot Category',
            description: 'The category of the verified bot.',
            example: 'Search engine',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.botManagement.staticResource',
            name: 'Is Static Resource',
            description: 'A boolean indicating if the request is for a known static resource.',
            example: 'true',
            docUrl: DOC_BASE_URL,
            dataType: 'boolean'
        },
        {
            id: 'request.cf.botManagement.detectionIds',
            name: 'Detection IDs',
            description: 'An array of IDs of the bot detection mechanisms that were triggered.',
            example: '123,456',
            docUrl: DOC_BASE_URL,
            dataType: 'array'
        },
        {
            id: 'request.cf.botManagement.jsDetection.passed',
            name: 'JS Detection Passed',
            description: 'A boolean indicating if the client passed the JavaScript detection challenge.',
            example: 'true',
            docUrl: DOC_BASE_URL,
            dataType: 'boolean'
        },
        {
            id: 'request.cf.botManagement.ja3Hash',
            name: 'JA3 Hash',
            description: 'The JA3 hash of the client\'s TLS handshake.',
            example: 'e7d705a3286e...',
            docUrl: 'https://developers.cloudflare.com/waf/tools/ja3-fingerprints/',
            dataType: 'string'
        },
        {
            id: 'request.cf.botManagement.ja4',
            name: 'JA4 Hash',
            description: 'The JA4 hash of the client\'s TLS handshake.',
            example: 't13d1516h2_...',
            docUrl: 'https://blog.cloudflare.com/ja4-network-fingerprinting',
            dataType: 'string'
        },
    ],
    "Client - TLS": [
        {
            id: 'request.cf.tlsVersion',
            name: 'TLS Version',
            description: 'The TLS version used by the client.',
            example: 'TLSv1.3',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsCipher',
            name: 'TLS Cipher',
            description: 'The cipher suite used for the TLS connection.',
            example: 'AEAD-AES128-GCM-SHA256',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsClientHelloLength',
            name: 'TLS Hello Length',
            description: 'The length in bytes of the ClientHello message.',
            example: '512',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.tlsClientRandom',
            name: 'TLS Client Random',
            description: 'The 32-byte random value from the ClientHello message.',
            example: 'a1b2c3...',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
    ],
    "Client - mTLS": [
        {
            id: 'request.cf.tlsClientAuth.certIssuerDNLegacy',
            name: 'mTLS Issuer DN (Legacy)',
            description: 'The legacy distinguished name of the client certificate issuer.',
            example: 'CN=...',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsClientAuth.certIssuerDN',
            name: 'mTLS Issuer DN',
            description: 'The distinguished name of the client certificate issuer.',
            example: 'CN=...',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsClientAuth.certSubjectDNLegacy',
            name: 'mTLS Subject DN (Legacy)',
            description: 'The legacy distinguished name of the client certificate subject.',
            example: 'CN=...',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsClientAuth.certSubjectDN',
            name: 'mTLS Subject DN',
            description: 'The distinguished name of the client certificate subject.',
            example: 'CN=...',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
        {
            id: 'request.cf.tlsClientAuth.certPresented',
            name: 'mTLS Cert Presented',
            description: 'A boolean indicating if a client certificate was presented.',
            example: 'true',
            docUrl: DOC_BASE_URL,
            dataType: 'boolean'
        },
        {
            id: 'request.cf.tlsClientAuth.certVerified',
            name: 'mTLS Cert Verified',
            description: 'A string indicating the result of the certificate verification.',
            example: 'SUCCESS',
            docUrl: DOC_BASE_URL,
            dataType: 'string'
        },
    ],
};
const WAF_OPERATORS = ['is_not_null', 'is_null', 'equals', 'not_equals', 'contains', 'not_contains', 'matches', 'not_matches', 'in', 'not_in', 'greater_than', 'less_than'];

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
                    name: '',
                    priority: 1,
                    description: '',
                    enabled: true,
                    action: 'ALLOW',
                    expression: [{field: 'request.method', operator: 'equals', value: 'GET'}],
                    tags: []
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
            name: '',
            description: 'Block Tor users globally',
            enabled: true,
            action: 'BLOCK',
            expression: [{field: 'request.cf.country', operator: 'equals', value: 'T1'}],
            tags: []
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

const ALL_FIELDS = Object.values(WAF_FIELD_GROUPS).flat();

// --- Utility Functions ---
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Convert to 32bit integer
    }
    return new Uint32Array([hash])[0].toString(16);
};

const generateRuleDescription = (expression) => {
    if (!expression || expression.length === 0) return 'Matches all traffic.';
    return "WHEN " + expression.map(cond =>
        `\`${cond.field}\` ${cond.operator.replace(/_/g, ' ').toUpperCase()} \`${cond.value}\``
    ).join(' AND ');
};

const isValidIp = (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

const isValidCidr = (cidr) => {
    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))$/;
    // Basic IPv4 CIDR check for demo purposes. A full library would be needed for IPv6.
    return cidrRegex.test(cidr);
};

const AuthContext = createContext(null);

// --- Main App Component ---
function App() {
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [route, setRoute] = useState({view: 'overview', group: null, field: null});
    const [activeRouteId, setActiveRouteId] = useState('global');
    const [openNavGroups, setOpenNavGroups] = useState({security: true});
    const [currentUser, setCurrentUser] = useState({id: 'admin@wafu.com', role: 'administrator'});

    const parseRoute = () => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            setRoute({view: 'overview', group: null, field: null});
            return;
        }
        const parts = hash.split('/').filter(Boolean);
        const view = parts[0] || 'overview';
        const group = parts[1] ? decodeURIComponent(parts[1]) : null;
        const field = parts[2] ? parts[2].replace('field-', '') : null;

        if (view === 'rules' && group === 'route') {
            setActiveRouteId(field || 'global');
        } else if (view !== 'rules') {
            setActiveRouteId('global');
        }
        setRoute({view, group, field});
    };

    useEffect(() => {
        setConfig(DEFAULT_CONFIG); // In a real app, this would be an API call
        parseRoute();
        window.addEventListener('hashchange', parseRoute);
        return () => window.removeEventListener('hashchange', parseRoute);
    }, []);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        console.log("Deploying new WAFu config:", JSON.stringify(config, null, 2));
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    const handleNavToField = (field) => {
        const groupName = Object.keys(WAF_FIELD_GROUPS).find(g => WAF_FIELD_GROUPS[g].some(f => f.id === field.id));
        window.location.hash = `#/fields/${encodeURIComponent(groupName)}/field-${field.id}`;
    };

    if (!config) return <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold">Loading WAFu Configuration...</div>
    </div>;

    return (
        <AuthContext.Provider value={{user: currentUser}}>
            <div className="flex min-h-screen">
                {/* Sidebar Navigation */}
                <nav className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col flex-shrink-0">
                    <div className="flex items-center gap-4 mb-4 px-2">
                        <span className="text-indigo-500 bg-indigo-100 p-2 rounded-lg">{ICONS.shield}</span>
                        <select value={activeRouteId}
                                onChange={e => window.location.hash = `#/rules/route/${e.target.value}`}
                                className="cf-select font-bold text-lg w-full">
                            <option value="global">GLOBAL</option>
                            {config.routes.map(r => <option key={r.id} value={r.id}>{r.incomingHost}</option>)}
                        </select>
                    </div>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Security</div>
                    <ul>
                        <li><a href="#/rules"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'rules' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} Firewall
                            Rules</a></li>
                        <li><a href="#/geolocation"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'geolocation' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.globe} Geolocation</a>
                        </li>
                        <li><a href="#/threat-feeds"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'threat-feeds' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} Threat
                            Feeds</a></li>
                        <li><a href="#/asn"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'asn' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} ASN
                            Intelligence</a></li>
                    </ul>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Configuration</div>
                    <ul>
                        <li><a href="#/routes"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'routes' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.route} Routes</a>
                        </li>
                        <li><a href="#/fields"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'fields' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.tag} Fields</a>
                        </li>
                    </ul>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Account</div>
                    <ul>
                        <li><a href="#/authentication"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'authentication' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.users} Authentication</a>
                        </li>
                        <li><a href="#/integrations"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'integrations' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.webhook} Integrations</a>
                        </li>
                        <li><a href="#/audit-log"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'audit-log' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.book} Audit
                            Log</a></li>
                    </ul>

                    <div className="mt-auto">
                        <button onClick={handleSaveChanges} disabled={isSaving || currentUser.role === 'viewer'}
                                className="w-full cf-button cf-button-primary px-4 py-2 rounded-md font-semibold">
                            {isSaving ? 'Deploying...' : 'Deploy Changes'}
                        </button>
                        {showSuccess &&
                        <div className="flex items-center justify-center gap-2 text-green-600 mt-2">{ICONS.check}
                            <span>Deployed!</span></div>}
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    {route.view === 'overview' && <OverviewView activeRouteId={activeRouteId} config={config}/>}
                    {route.view === 'rules' &&
                    <FirewallRulesView config={config} setConfig={setConfig} onNavigateToDocs={handleNavToField}
                                       activeRouteId={activeRouteId} setActiveRouteId={setActiveRouteId}/>}
                    {route.view === 'routes' && <RoutesView config={config} setConfig={setConfig}/>}
                    {route.view === 'geolocation' &&
                    <GeolocationView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'fields' &&
                    <FieldsView onNavigateToDocs={handleNavToField} activeRouteId={activeRouteId} config={config}/>}
                    {route.view === 'asn' &&
                    <AsnView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'threat-feeds' && <ThreatFeedsView config={config} setConfig={setConfig}/>}
                    {route.view === 'integrations' && <IntegrationsView config={config} setConfig={setConfig}/>}
                    {route.view === 'authentication' &&
                    <AuthView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'database' && <DatabaseView activeRouteId={activeRouteId}/>}
                    {route.view === 'analytics-settings' &&
                    <AnalyticsSettingsView config={config} setConfig={setConfig}/>}
                    {route.view === 'audit-log' && <AuditLogView config={config}/>}
                </main>
            </div>
        </AuthContext.Provider>
    );
}

/*
 * =============================================================================
 * END public/ui.js (Part 1 of 4)
 * =============================================================================
 */
/*
 * =============================================================================
 * START public/ui.js (Part 2 of 4)
 *
 * DESCRIPTION:
 * This part contains the main "View" components for each page in the WAFu
 * dashboard. Each view is responsible for fetching its own data and rendering
 * the appropriate sub-components.
 * =============================================================================
 */

// --- Main View Components ---

function OverviewView({activeRouteId, config}) {
    // This component would render the analytics dashboard.
    // For this demo, we'll show a placeholder.
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Overview</h1>
            <p className="text-gray-600 mb-8">Displaying analytics for <span
                className="font-semibold text-indigo-600">{contextName}</span></p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">Analytics Dashboard would be displayed here.</p>
            </div>
        </div>
    );
}

function FirewallRulesView({config, setConfig, onNavigateToDocs, activeRouteId, setActiveRouteId}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const isGlobal = activeRouteId === 'global';
    const currentRoute = isGlobal ? null : config.routes.find(r => r.id === activeRouteId);
    const currentRules = isGlobal ? config.globalRules : currentRoute?.customRules || [];

    const activeRules = currentRules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
    const disabledRules = currentRules.filter(r => !r.enabled);

    const updateRulesForContext = (newRules) => {
        setConfig(prev => {
            if (isGlobal) {
                return {...prev, globalRules: newRules};
            } else {
                return {
                    ...prev,
                    routes: prev.routes.map(r => r.id === activeRouteId ? {...r, customRules: newRules} : r)
                };
            }
        });
    };

    const handleRuleToggle = (ruleId) => {
        let toggledRules = currentRules.map(rule => {
            if (rule.id === ruleId) {
                const isEnabling = !rule.enabled;
                if (isEnabling) {
                    const maxPriority = Math.max(0, ...activeRules.map(r => r.priority));
                    return {...rule, enabled: true, priority: maxPriority + 1};
                } else {
                    return {...rule, enabled: false, priority: null};
                }
            }
            return rule;
        });

        const updatedActive = toggledRules.filter(r => r.enabled).sort((a, b) => a.priority - b.priority);
        let priorityCounter = 1;
        const finalRules = toggledRules.map(rule => {
            if (rule.enabled) {
                const activeRule = updatedActive.find(ar => ar.id === rule.id);
                if (activeRule) return {...activeRule, priority: priorityCounter++};
            }
            return rule;
        }).filter(Boolean);

        updateRulesForContext(finalRules);
    };

    const handleRuleDelete = (ruleId) => {
        if (window.confirm('Are you sure you want to delete this rule?')) {
            updateRulesForContext(currentRules.filter(rule => rule.id !== ruleId));
        }
    };

    const handleEditRule = (rule) => {
        setEditingRule(JSON.parse(JSON.stringify(rule)));
        setIsEditing(true);
    };

    const handleCreateRule = () => {
        const maxPriority = Math.max(0, ...activeRules.map(r => r.priority));
        setEditingRule({
            id: `new-rule-${Date.now()}`,
            name: '',
            description: '',
            enabled: true,
            expression: [],
            action: 'BLOCK',
            priority: maxPriority + 1,
            tags: []
        });
        setIsEditing(true);
    };

    const handleSaveRule = (savedRule) => {
        const existingRuleIndex = currentRules.findIndex(r => r.id === savedRule.id);
        let newRules;
        if (existingRuleIndex > -1) {
            newRules = [...currentRules];
            newRules[existingRuleIndex] = savedRule;
        } else {
            newRules = [...currentRules, savedRule];
        }
        updateRulesForContext(newRules);
        setIsEditing(false);
        setEditingRule(null);
    };

    const handleMoveRule = (index, direction) => {
        const newActiveRules = [...activeRules];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newActiveRules.length) return;

        const temp = newActiveRules[index];
        newActiveRules[index] = newActiveRules[targetIndex];
        newActiveRules[targetIndex] = temp;

        const reprioritizedRules = newActiveRules.map((rule, idx) => ({...rule, priority: idx + 1}));
        updateRulesForContext([...reprioritizedRules, ...disabledRules]);
    };

    const currentRouteName = isGlobal ? "GLOBAL" : config.routes.find(r => r.id === activeRouteId)?.incomingHost || "Select Route";

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {isEditing && <RuleEditor rule={editingRule} onSave={handleSaveRule} onCancel={() => setIsEditing(false)}
                                      onNavigateToDocs={onNavigateToDocs}
                                      context={isGlobal ? 'global' : currentRoute.incomingHost}/>}

            <div className="space-y-8">
                <div className="cf-card border-t-indigo-500">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">Active Rules <span
                                className="text-gray-500 font-normal">for {currentRouteName}</span></h2>
                            <button onClick={handleCreateRule}
                                    className="cf-button cf-button-primary px-3 py-1.5 rounded-md text-sm flex items-center gap-2">{ICONS.plus} Create
                                Rule
                            </button>
                        </div>
                        <div className="space-y-3">
                            {activeRules.map((rule, index) => (
                                <div key={rule.id}
                                     className="border rounded-md p-4 bg-white hover:bg-gray-50 transition-colors flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <button onClick={() => handleMoveRule(index, -1)} disabled={index === 0}
                                                className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed">{ICONS.arrowUp}</button>
                                        <button onClick={() => handleMoveRule(index, 1)}
                                                disabled={index === activeRules.length - 1}
                                                className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed">{ICONS.arrowDown}</button>
                                    </div>
                                    <RuleCardContent rule={rule} onToggle={() => handleRuleToggle(rule.id)}
                                                     onDelete={() => handleRuleDelete(rule.id)}
                                                     onEdit={() => handleEditRule(rule)}/>
                                </div>
                            ))}
                        </div>
                        {activeRules.length === 0 &&
                        <p className="text-gray-500 text-center py-4">No active rules. Create a rule or enable one
                            below.</p>}
                    </div>
                </div>

                <div className="cf-card border-t-gray-400">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Disabled Rules <span
                            className="text-gray-500 font-normal">for {currentRouteName}</span></h2>
                        <div className="space-y-3">
                            {disabledRules.map(rule => (
                                <div key={rule.id} className="border rounded-md p-4 bg-gray-50 flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <button className="p-1 text-gray-300 cursor-not-allowed"
                                                disabled>{ICONS.arrowUp}</button>
                                        <button className="p-1 text-gray-300 cursor-not-allowed"
                                                disabled>{ICONS.arrowDown}</button>
                                    </div>
                                    <RuleCardContent rule={rule} onToggle={() => handleRuleToggle(rule.id)}
                                                     onDelete={() => handleRuleDelete(rule.id)}
                                                     onEdit={() => handleEditRule(rule)}/>
                                </div>
                            ))}
                            {disabledRules.length === 0 &&
                            <p className="text-gray-500 text-center py-4">No disabled rules.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RoutesView({config, setConfig}) {
    const handleRouteEnabledChange = (routeId, isEnabled) => {
        setConfig(prev => {
            const newRoutes = prev.routes.map(r => r.id === routeId ? {...r, enabled: isEnabled} : r);
            const targetRoute = prev.routes.find(r => r.id === routeId);
            const newGlobalRules = prev.globalRules.map(gr => {
                if (gr.id === `global-route-${targetRoute.incomingHost}`) {
                    return {...gr, enabled: isEnabled};
                }
                return gr;
            });
            return {...prev, routes: newRoutes, globalRules: newGlobalRules};
        });
    };

    const addRoute = () => {
        const newRouteId = `route-${Date.now()}`;
        const newHost = `new-route-${Math.random().toString(36).substring(2, 6)}.domain.com`;
        const newRoute = {
            id: newRouteId,
            incomingHost: newHost,
            originUrl: '',
            enabled: true,
            customRules: []
        };

        const newGlobalRule = {
            id: `global-route-${newHost}`,
            priority: Math.max(0, ...config.globalRules.map(r => r.priority)) + 1,
            name: `Route Rule for ${newHost}`,
            description: `Auto-generated rule to allow traffic to ${newHost} for route-specific evaluation.`,
            enabled: true,
            action: 'ALLOW',
            expression: [{field: 'request.headers.host', operator: 'equals', value: newHost}],
            tags: ['auto-generated', 'route-rule']
        };

        setConfig(prev => ({
            ...prev,
            routes: [...prev.routes, newRoute],
            globalRules: [...prev.globalRules, newGlobalRule]
        }));
    };

    const removeRoute = (routeToRemove) => {
        if (window.confirm(`Are you sure you want to delete the route for ${routeToRemove.incomingHost}? This will also delete its corresponding global rule.`)) {
            setConfig(prev => ({
                ...prev,
                routes: prev.routes.filter(r => r.id !== routeToRemove.id),
                globalRules: prev.globalRules.filter(r => r.id !== `global-route-${routeToRemove.incomingHost}`)
            }));
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Origin Routes</h1>
            <p className="text-gray-600 mb-8">Map incoming hostnames to your backend origin URLs. WAFu will proxy
                allowed requests to these origins.</p>

            <div className="cf-card border-t-indigo-500">
                <div className="p-6">
                    <div className="space-y-4">
                        {config.routes.map((route, index) => (
                            <div key={route.id}
                                 className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-3 bg-gray-50 rounded-md border">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Incoming
                                        Host</label>
                                    <input type="text" value={route.incomingHost} disabled
                                           className="cf-input bg-gray-100"/>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Origin URL</label>
                                    <input type="text" value={route.originUrl} disabled
                                           className="cf-input bg-gray-100"/>
                                </div>
                                <div className="text-center pt-5">
                                    <label htmlFor={`toggle-route-${route.id}`}
                                           className="flex items-center cursor-pointer">
                                        <div className="relative">
                                            <input id={`toggle-route-${route.id}`} type="checkbox" className="sr-only"
                                                   checked={route.enabled}
                                                   onChange={(e) => handleRouteEnabledChange(route.id, e.target.checked)}/>
                                            <div className="block bg-gray-200 w-10 h-6 rounded-full cf-toggle-bg"></div>
                                        </div>
                                    </label>
                                </div>
                                <div className="text-right pt-5">
                                    <button onClick={() => removeRoute(route)}
                                            className="p-2 text-gray-500 hover:text-red-600">
                                        {ICONS.trash}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6">
                        <button onClick={addRoute}
                                className="cf-button cf-button-secondary px-3 py-1.5 rounded-md text-sm flex items-center gap-2">
                            {ICONS.plus} Add Route
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function GeolocationView({config, setConfig, activeRouteId}) {
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const geoJsonLayer = useRef(null);
    const [selectedCountry, setSelectedCountry] = useState(null);

    const isGlobal = activeRouteId === 'global';
    const currentRules = isGlobal ? config.globalRules : config.routes.find(r => r.id === activeRouteId)?.customRules || [];

    useEffect(() => {
        if (!mapInstance.current) {
            mapInstance.current = L.map(mapContainer.current, {
                center: [20, 0],
                zoom: 2,
                attributionControl: false
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
                maxZoom: 10,
                minZoom: 2,
            }).addTo(mapInstance.current);

            fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
                .then(res => res.json())
                .then(data => {
                    geoJsonLayer.current = L.geoJSON(data, {
                        style: (feature) => {
                            const countryCode = feature.id;
                            const hasBlock = currentRules.some(r => r.action === 'BLOCK' && r.expression.some(e => e.field === 'request.cf.country' && e.value === countryCode));
                            const hasAllow = currentRules.some(r => r.action === 'ALLOW' && r.expression.some(e => e.field === 'request.cf.country' && e.value === countryCode));

                            return {
                                fillColor: hasBlock ? '#ef4444' : (hasAllow ? '#22c55e' : '#cbd5e1'),
                                weight: 1,
                                opacity: 1,
                                color: 'white',
                                fillOpacity: 0.7
                            };
                        },
                        onEachFeature: (feature, layer) => {
                            layer.on({
                                click: (e) => {
                                    setSelectedCountry({name: feature.properties.name, code: feature.id});
                                    L.DomEvent.stopPropagation(e);
                                },
                                mouseover: (e) => e.target.setStyle({fillOpacity: 0.9}),
                                mouseout: (e) => geoJsonLayer.current.resetStyle(e.target)
                            });
                        }
                    }).addTo(mapInstance.current);
                });
        }
    }, []);

    useEffect(() => {
        if (geoJsonLayer.current) {
            geoJsonLayer.current.eachLayer(layer => {
                const countryCode = layer.feature.id;
                const hasBlock = currentRules.some(r => r.action === 'BLOCK' && r.expression.some(e => e.field === 'request.cf.country' && e.value === countryCode));
                const hasAllow = currentRules.some(r => r.action === 'ALLOW' && r.expression.some(e => e.field === 'request.cf.country' && e.value === countryCode));
                layer.setStyle({fillColor: hasBlock ? '#ef4444' : (hasAllow ? '#22c55e' : '#cbd5e1')});
            });
        }
    }, [currentRules]);

    const handleGeoRuleCreate = (action) => {
        const context = isGlobal ? 'global' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;
        const hash = simpleHash(selectedCountry.code);
        const newRule = {
            id: `${context}-${action}-${hash}-${Math.random().toString(36).substring(2, 6)}`,
            name: `${action} traffic from ${selectedCountry.name}`,
            description: ``,
            enabled: true,
            action: action,
            expression: [{field: 'request.cf.country', operator: 'equals', value: selectedCountry.code}],
            tags: ['geolocation', selectedCountry.code],
            priority: Math.max(0, ...currentRules.filter(r => r.enabled).map(r => r.priority)) + 1
        };

        setConfig(prev => {
            if (isGlobal) {
                return {...prev, globalRules: [...prev.globalRules, newRule]};
            } else {
                return {
                    ...prev,
                    routes: prev.routes.map(r => r.id === activeRouteId ? {
                        ...r,
                        customRules: [...r.customRules, newRule]
                    } : r)
                };
            }
        });
        setSelectedCountry(null);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Geolocation</h1>
            <p className="text-gray-600 mb-8">Create country-based rules by clicking on the interactive map.</p>
            <div className="cf-card p-4 border-t-indigo-500">
                <div id="map" ref={mapContainer}></div>
            </div>
            {selectedCountry && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="cf-card w-full max-w-md border-t-indigo-500">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-2">Create Rule
                                for {selectedCountry.name} ({selectedCountry.code})</h2>
                            <p className="text-gray-600 mb-6">What action should WAFu take for traffic from this
                                country?</p>
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setSelectedCountry(null)}
                                        className="cf-button cf-button-secondary px-4 py-2 rounded-md">Cancel
                                </button>
                                <button onClick={() => handleGeoRuleCreate('ALLOW')}
                                        className="cf-button bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md">Allow
                                </button>
                                <button onClick={() => handleGeoRuleCreate('BLOCK')}
                                        className="cf-button bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md">Block
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/*
 * =============================================================================
 * END public/ui.js (Part 2 of 4)
 * =============================================================================
 */

/*
 * =============================================================================
 * START public/ui.js (Part 3 of 4)
 *
 * DESCRIPTION:
 * This part contains the full implementation of the placeholder "View"
 * components for all advanced features, including Fields, ASN Intelligence,
 * Threat Feeds, Authentication, and more.
 * =============================================================================
 */

function FieldsView({onNavigateToDocs, activeRouteId, config}) {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Fields</h1>
            <p className="text-gray-600 mb-8">Browse all available fields and see which rules use them in the <span
                className="font-semibold text-indigo-600">{contextName}</span> context.</p>

            {Object.entries(WAF_FIELD_GROUPS).map(([groupName, fields]) => (
                <div key={groupName} className="mb-8">
                    <h2 className="text-xl font-semibold border-b pb-2 mb-4">{groupName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {fields.map(field => (
                            <div key={field.id}
                                 className="cf-card border-t-transparent p-4 hover:shadow-lg transition-shadow">
                                <a href={`#fields/${encodeURIComponent(groupName)}/field-${field.id}`}
                                   className="font-mono text-sm text-indigo-600 hover:underline">{field.id}</a>
                                <p className="font-semibold mt-1">{field.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function AsnView({config, setConfig, activeRouteId}) {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">ASN Intelligence</h1>
            <p className="text-gray-600 mb-8">Create high-level rules based on the type of network for <span
                className="font-semibold text-indigo-600">{contextName}</span>.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">UI for managing rules based on ASN categories (Data Center,
                    Hosting, etc.) would be here.</p>
            </div>
        </div>
    );
}

function ThreatFeedsView({config, setConfig}) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Threat Feeds</h1>
            <p className="text-gray-600 mb-8">Manage and monitor third-party threat intelligence lists.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">UI for managing threat intelligence feeds would be here.</p>
            </div>
        </div>
    );
}

function IntegrationsView({config, setConfig}) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Integrations</h1>
            <p className="text-gray-600 mb-8">Configure real-time alerting to external services like Slack or
                Discord.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">UI for managing webhook integrations would be here.</p>
            </div>
        </div>
    );
}

function AuthView({config, setConfig, activeRouteId}) {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Authentication</h1>
            <p className="text-gray-600 mb-8">Manage Gates, Users, and Groups for <span
                className="font-semibold text-indigo-600">{contextName}</span>.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">A tabbed interface for managing Gates, Users, and User Groups
                    would be here.</p>
            </div>
        </div>
    );
}

function DatabaseView({activeRouteId}) {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : 'the current route';
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Database</h1>
            <p className="text-gray-600 mb-8">Directly interact with the underlying SQLite database for <span
                className="font-semibold text-indigo-600">{contextName}</span>.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">UI for the Database Editor and SQL Query Engine would be
                    here.</p>
            </div>
        </div>
    );
}

function AnalyticsSettingsView({config, setConfig}) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Analytics Settings</h1>
            <p className="text-gray-600 mb-8">Configure how analytics data is processed and retained.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">UI for managing aggregation schedules and log sampling would be
                    here.</p>
            </div>
        </div>
    );
}

function AuditLogView({config}) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold mb-2">Audit Log</h1>
            <p className="text-gray-600 mb-8">Review all configuration changes made to the WAFu platform.</p>
            <div className="cf-card p-6 border-t-indigo-500">
                <p className="text-center text-gray-500">A filterable, paginated view of all audit log entries would be
                    here.</p>
            </div>
        </div>
    );
}

function RuleEditor({rule, onSave, onCancel, onNavigateToDocs, context}) {
    const [editedRule, setEditedRule] = useState(rule);
    const [hoveredField, setHoveredField] = useState(null);
    const [errors, setErrors] = useState({});

    const validateValue = (value, operator, fieldDetails) => {
        const {dataType} = fieldDetails;
        if (operator === 'in' && dataType === 'ip') {
            const items = value.split(',').map(item => item.trim());
            for (const item of items) {
                if (!isValidIp(item) && !isValidCidr(item)) {
                    return 'Must be a comma-separated list of IPs or CIDRs.';
                }
            }
            return null;
        }

        if (dataType === 'integer' && !/^-?\d+$/.test(value)) return 'Value must be an integer.';
        if (dataType === 'float' && !/^-?\d*(\.\d+)?$/.test(value)) return 'Value must be a number.';
        if (dataType === 'ip' && !isValidIp(value)) return 'Value must be a valid IPv4 or IPv6 address.';
        if (dataType === 'array' && !/^[a-zA-Z0-9, ]*$/.test(value)) return 'Value must be a comma-separated list.';

        return null;
    };

    const handleExpressionChange = (index, field, value) => {
        const newExpression = [...editedRule.expression];
        const currentCond = newExpression[index];
        newExpression[index] = {...currentCond, [field]: value};

        if (field === 'value' || field === 'operator' || field === 'field') {
            const fieldDetails = getFieldDetails(newExpression[index].field);
            const error = validateValue(newExpression[index].value, newExpression[index].operator, fieldDetails);
            setErrors(prev => ({...prev, [index]: error}));
        }

        setEditedRule(prev => ({...prev, expression: newExpression}));
    };

    const addExpression = () => setEditedRule(prev => ({
        ...prev,
        expression: [...prev.expression, {
            field: 'request.headers.cf-connecting-ip',
            operator: 'is_not_null',
            value: ''
        }]
    }));
    const removeExpression = (index) => {
        setEditedRule(prev => ({...prev, expression: prev.expression.filter((_, i) => i !== index)}));
        setErrors(prev => {
            const newErrors = {...prev};
            delete newErrors[index];
            return newErrors;
        });
    };
    const getFieldDetails = (fieldId) => ALL_FIELDS.find(f => f.id === fieldId);

    const handleSave = () => {
        let finalRule = {...editedRule};
        const autoTags = finalRule.expression.map(e => e.field);
        const customTags = Array.isArray(finalRule.tags) ? finalRule.tags.filter(t => !ALL_FIELDS.some(f => f.id === t)) : [];
        finalRule.tags = [...new Set([...autoTags, ...customTags])];

        if (finalRule.id.startsWith('new-rule')) {
            const hash = simpleHash(JSON.stringify(finalRule.expression));
            const suffix = Math.random().toString(36).substring(2, 6);
            finalRule.id = `${context}-${finalRule.action}-${hash}-${suffix}`;
        }

        if (!finalRule.name) finalRule.name = finalRule.id;

        onSave(finalRule);
    };

    const hasErrors = Object.values(errors).some(e => e !== null);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="cf-card w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-xl font-semibold mb-4">{rule.id.startsWith('new-rule') ? 'Create Rule' : 'Edit Rule'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rule Name (Optional)</label>
                            <input type="text" value={editedRule.name}
                                   onChange={e => setEditedRule(prev => ({...prev, name: e.target.value}))}
                                   className="cf-input" placeholder="Defaults to Rule ID"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                            <input type="text" value={editedRule.description}
                                   onChange={e => setEditedRule(prev => ({...prev, description: e.target.value}))}
                                   className="cf-input" placeholder="Auto-generated if left blank"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Action</label>
                            <select value={editedRule.action}
                                    onChange={e => setEditedRule(prev => ({...prev, action: e.target.value}))}
                                    className="cf-select">
                                <option>BLOCK</option>
                                <option>CHALLENGE</option>
                                <option>ALLOW</option>
                                <option>LOG</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Custom Tags
                                (comma-separated)</label>
                            <input type="text"
                                   value={Array.isArray(editedRule.tags) ? editedRule.tags.filter(t => !ALL_FIELDS.some(f => f.id === t)).join(', ') : ''}
                                   onChange={e => setEditedRule(prev => ({
                                       ...prev,
                                       tags: e.target.value.split(',').map(t => t.trim())
                                   }))} className="cf-input" placeholder="e.g., critical, api-v1"/>
                        </div>
                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-lg mb-2">Expression</h3>
                            <p className="text-sm text-gray-500 mb-4">Requests will be matched if ALL of these
                                conditions are true.</p>
                            <div className="space-y-3">
                                {editedRule.expression.map((expr, index) => {
                                    const fieldDetails = getFieldDetails(expr.field);
                                    const isNullOperator = expr.operator === 'is_null' || expr.operator === 'is_not_null';
                                    return (
                                        <div key={index} className="p-3 bg-gray-50 rounded-md border">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start">
                                                <div className="md:col-span-2">
                                                    <div className="flex items-center gap-2">
                                                        <select value={expr.field}
                                                                onChange={e => handleExpressionChange(index, 'field', e.target.value)}
                                                                className="cf-select">
                                                            {Object.entries(WAF_FIELD_GROUPS).map(([groupName, fields]) => (
                                                                <optgroup key={groupName} label={groupName}>
                                                                    {fields.map(f => <option key={f.id}
                                                                                             value={f.id}>{f.id} ({f.name})</option>)}
                                                                </optgroup>
                                                            ))}
                                                        </select>
                                                        <div className="relative"
                                                             onMouseEnter={() => setHoveredField(fieldDetails.id)}
                                                             onMouseLeave={() => setHoveredField(null)}>
                                                            <button onClick={() => onNavigateToDocs(fieldDetails)}
                                                                    className="text-gray-400 hover:text-indigo-600 p-2 cursor-pointer"
                                                                    title="View Documentation">
                                                                {ICONS.info}
                                                            </button>
                                                            {hoveredField === fieldDetails.id &&
                                                            <InfoHoverCard field={fieldDetails}/>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <select value={expr.operator}
                                                        onChange={e => handleExpressionChange(index, 'operator', e.target.value)}
                                                        className="cf-select">
                                                    {WAF_OPERATORS.map(o => <option key={o}
                                                                                    value={o}>{o.replace(/_/g, ' ').toUpperCase()}</option>)}
                                                </select>
                                                <div className="relative flex items-center gap-2">
                                                    {fieldDetails.dataType === 'boolean' ? (
                                                        <select value={expr.value}
                                                                onChange={e => handleExpressionChange(index, 'value', e.target.value)}
                                                                className="cf-select" disabled={isNullOperator}>
                                                            <option value="true">True</option>
                                                            <option value="false">False</option>
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={isNullOperator ? '' : expr.value}
                                                            onChange={e => handleExpressionChange(index, 'value', e.target.value)}
                                                            className={`cf-input ${isNullOperator ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors[index] ? 'border-red-500' : ''}`}
                                                            placeholder={isNullOperator ? "N/A" : "Value..."}
                                                            disabled={isNullOperator}
                                                        />
                                                    )}
                                                    <button onClick={() => removeExpression(index)}
                                                            className="p-2 text-gray-500 hover:text-red-600">{ICONS.trash}</button>
                                                    {errors[index] && <div
                                                        className="absolute top-full left-0 text-xs text-red-600 mt-1">{errors[index]}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <button onClick={addExpression}
                                    className="mt-4 flex items-center gap-2 text-sm cf-button cf-button-secondary px-3 py-1.5 rounded-md">{ICONS.plus} Add
                                Condition
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3 border-t">
                    <button onClick={onCancel} className="cf-button cf-button-secondary px-4 py-2 rounded-md">Cancel
                    </button>
                    <button onClick={handleSave} disabled={hasErrors}
                            className="cf-button cf-button-primary px-4 py-2 rounded-md">Save Rule
                    </button>
                </div>
            </div>
        </div>
    );
}

function RuleCardContent({rule, onToggle, onDelete, onEdit}) {
    const actionColor = {
        BLOCK: 'bg-red-100 text-red-800',
        CHALLENGE: 'bg-yellow-100 text-yellow-800',
        LOG: 'bg-blue-100 text-blue-800',
        ALLOW: 'bg-green-100 text-green-800'
    }[rule.action];
    const description = rule.description || generateRuleDescription(rule.expression);
    const name = rule.name || rule.id;

    return (
        <>
            {rule.enabled && <div className="text-lg font-bold text-gray-400 w-6 text-center">{rule.priority}</div>}
            <div className="flex-1 pr-4">
                <p className="font-semibold text-gray-800">{name}</p>
                <p className="text-sm text-gray-500 mt-1">{description}</p>
                <div className="mt-2 flex items-center flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>{rule.action}</span>
                    {rule.tags && rule.tags.map(tag => (
                        <span key={tag}
                              className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">{tag}</span>
                    ))}
                </div>
            </div>
            <div className="flex items-center space-x-3">
                <label htmlFor={`toggle-${rule.id}`} className="flex items-center cursor-pointer">
                    <div className="relative">
                        <input id={`toggle-${rule.id}`} type="checkbox" className="sr-only" checked={rule.enabled}
                               onChange={onToggle}/>
                        <div className="block bg-gray-200 w-10 h-6 rounded-full cf-toggle-bg"></div>
                    </div>
                </label>
                <button onClick={onEdit} className="p-1 text-gray-500 hover:text-indigo-600">{ICONS.edit}</button>
                <button onClick={onDelete} className="p-1 text-gray-500 hover:text-red-600">{ICONS.trash}</button>
            </div>
        </>
    );
}

/*
 * =============================================================================
 * END public/ui.js (Part 3 of 4)
 * =============================================================================
 */
/*
 * =============================================================================
 * START public/ui.js (Part 4 of 4)
 *
 * DESCRIPTION:
 * This final part contains the main App component, which ties all the views
 * and components together. It manages the application's routing, global state,
 * and communication with the backend APIs.
 * =============================================================================
 */

// --- Main App Component ---
function App() {
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [route, setRoute] = useState({view: 'overview', group: null, field: null});
    const [activeRouteId, setActiveRouteId] = useState('global');
    const [openNavGroups, setOpenNavGroups] = useState({security: true});
    const [currentUser, setCurrentUser] = useState({id: 'admin@wafu.com', role: 'administrator'});

    const parseRoute = () => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            setRoute({view: 'overview', group: null, field: null});
            return;
        }
        const parts = hash.split('/').filter(Boolean);
        const view = parts[0] || 'overview';
        const group = parts[1] ? decodeURIComponent(parts[1]) : null;
        const field = parts[2] ? parts[2].replace('field-', '') : null;

        if (view === 'rules' && group === 'route') {
            setActiveRouteId(field || 'global');
        } else if (view !== 'rules') {
            setActiveRouteId('global');
        }
        setRoute({view, group, field});
    };

    useEffect(() => {
        setConfig(DEFAULT_CONFIG); // In a real app, this would be an API call
        parseRoute();
        window.addEventListener('hashchange', parseRoute);
        return () => window.removeEventListener('hashchange', parseRoute);
    }, []);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        console.log("Deploying new WAFu config:", JSON.stringify(config, null, 2));
        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 1500);
    };

    const handleNavToField = (field) => {
        const groupName = Object.keys(WAF_FIELD_GROUPS).find(g => WAF_FIELD_GROUPS[g].some(f => f.id === field.id));
        window.location.hash = `#/fields/${encodeURIComponent(groupName)}/field-${field.id}`;
    };

    if (!config) return <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
        <div className="text-xl font-semibold">Loading WAFu Configuration...</div>
    </div>;

    return (
        <AuthContext.Provider value={{user: currentUser}}>
            <div className="flex min-h-screen">
                {/* Sidebar Navigation */}
                <nav className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col flex-shrink-0">
                    <div className="flex items-center gap-4 mb-4 px-2">
                        <span className="text-indigo-500 bg-indigo-100 p-2 rounded-lg">{ICONS.shield}</span>
                        <select value={activeRouteId}
                                onChange={e => window.location.hash = `#/rules/route/${e.target.value}`}
                                className="cf-select font-bold text-lg w-full">
                            <option value="global">GLOBAL</option>
                            {config.routes.map(r => <option key={r.id} value={r.id}>{r.incomingHost}</option>)}
                        </select>
                    </div>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Security</div>
                    <ul>
                        <li><a href="#/rules"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'rules' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} Firewall
                            Rules</a></li>
                        <li><a href="#/geolocation"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'geolocation' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.globe} Geolocation</a>
                        </li>
                        <li><a href="#/threat-feeds"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'threat-feeds' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} Threat
                            Feeds</a></li>
                        <li><a href="#/asn"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'asn' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.shield} ASN
                            Intelligence</a></li>
                    </ul>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Configuration</div>
                    <ul>
                        <li><a href="#/routes"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'routes' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.route} Routes</a>
                        </li>
                        <li><a href="#/fields"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'fields' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.tag} Fields</a>
                        </li>
                    </ul>

                    <div className="text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase">Account</div>
                    <ul>
                        <li><a href="#/authentication"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'authentication' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.users} Authentication</a>
                        </li>
                        <li><a href="#/integrations"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'integrations' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.webhook} Integrations</a>
                        </li>
                        <li><a href="#/audit-log"
                               className={`flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'audit-log' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>{ICONS.book} Audit
                            Log</a></li>
                    </ul>

                    <div className="mt-auto">
                        <button onClick={handleSaveChanges} disabled={isSaving || currentUser.role === 'viewer'}
                                className="w-full cf-button cf-button-primary px-4 py-2 rounded-md font-semibold">
                            {isSaving ? 'Deploying...' : 'Deploy Changes'}
                        </button>
                        {showSuccess &&
                        <div className="flex items-center justify-center gap-2 text-green-600 mt-2">{ICONS.check}
                            <span>Deployed!</span></div>}
                    </div>
                </nav>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto">
                    {route.view === 'overview' && <OverviewView activeRouteId={activeRouteId} config={config}/>}
                    {route.view === 'rules' &&
                    <FirewallRulesView config={config} setConfig={setConfig} onNavigateToDocs={handleNavToField}
                                       activeRouteId={activeRouteId} setActiveRouteId={setActiveRouteId}/>}
                    {route.view === 'routes' && <RoutesView config={config} setConfig={setConfig}/>}
                    {route.view === 'geolocation' &&
                    <GeolocationView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'fields' &&
                    <FieldsView onNavigateToDocs={handleNavToField} activeRouteId={activeRouteId} config={config}/>}
                    {route.view === 'asn' &&
                    <AsnView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'threat-feeds' && <ThreatFeedsView config={config} setConfig={setConfig}/>}
                    {route.view === 'integrations' && <IntegrationsView config={config} setConfig={setConfig}/>}
                    {route.view === 'authentication' &&
                    <AuthView config={config} setConfig={setConfig} activeRouteId={activeRouteId}/>}
                    {route.view === 'database' && <DatabaseView activeRouteId={activeRouteId}/>}
                    {route.view === 'analytics-settings' &&
                    <AnalyticsSettingsView config={config} setConfig={setConfig}/>}
                    {route.view === 'audit-log' && <AuditLogView config={config}/>}
                </main>
            </div>
        </AuthContext.Provider>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);

/*
 * =============================================================================
 * END public/ui.js (Part 4 of 4)
 * =============================================================================
 */
