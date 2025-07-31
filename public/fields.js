/*
 * =============================================================================
 * FILE: public/fields.js
 *
 * DESCRIPTION:
 * Contains all static data related to the WAFu rule engine fields.
 * This includes field definitions, groups, operators, and documentation links.
 * Isolating this data makes the main application easier to manage.
 * =============================================================================
 */

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
    "Client - Bots": [
        {
            id: 'request.cf.threatScore',
            name: 'Threat Score',
            description: "Cloudflare's threat score for the IP (0-100).",
            example: '10',
            docUrl: DOC_BASE_URL,
            dataType: 'integer'
        },
        {
            id: 'request.cf.botManagement.score',
            name: 'Bot Score',
            description: "Cloudflare's bot score (1-99).",
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
            description: "The JA3 hash of the client's TLS handshake.",
            example: 'e7d705a3286e...',
            docUrl: 'https://developers.cloudflare.com/waf/tools/ja3-fingerprints/',
            dataType: 'string'
        },
        {
            id: 'request.cf.botManagement.ja4',
            name: 'JA4 Hash',
            description: "The JA4 hash of the client's TLS handshake.",
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
    ],
};

const WAF_OPERATORS = ['is_not_null', 'is_null', 'equals', 'not_equals', 'contains', 'not_contains', 'matches', 'not_matches', 'in', 'not_in', 'greater_than', 'less_than'];

const ALL_FIELDS = Object.values(WAF_FIELD_GROUPS).flat();
