/*
 * =============================================================================
 * FILE: src/utils.js
 *
 * DESCRIPTION:
 * A shared utility module for the backend Durable Objects. It contains the
 * rule evaluation engine and request data parsing logic to avoid code
 * duplication between GlobalRulesDO and RouteRulesDO.
 * =============================================================================
 */

/**
 * Flattens and normalizes the request data for the rule engine.
 * @param {object} req - The request data passed from the main worker.
 * @returns {object} A flat object with all checkable properties.
 */
export function getRequestData(req) {
    const url = new URL(req.url);
    const cf = req.cf || {};
    const headers = req.headers || {};
    const queryParams = new URLSearchParams(url.search);

    const data = {
        'request.method': req.method,
        'request.url': req.url,
        'request.cf.httpProtocol': cf.httpProtocol,
        'request.cf.requestPriority': cf.requestPriority,
        'derived.body.has_body': !!(req.body && (headers['content-length'] > 0 || headers['transfer-encoding'] === 'chunked')),
        'derived.uri.path': url.pathname,
        'derived.uri.query.string': url.search,
        'derived.uri.query.param_count': Array.from(queryParams.keys()).length,
        'request.cf.country': cf.country,
        'request.cf.continent': cf.continent,
        'request.cf.region': cf.region,
        'request.cf.regionCode': cf.regionCode,
        'request.cf.city': cf.city,
        'request.cf.postalCode': cf.postalCode,
        'request.cf.metroCode': cf.metroCode,
        'request.cf.timezone': cf.timezone,
        'request.cf.latitude': cf.latitude,
        'request.cf.longitude': cf.longitude,
        'request.cf.isEUCountry': cf.isEUCountry,
        'request.cf.colo': cf.colo,
        'request.cf.asn': cf.asn,
        'request.cf.asOrganization': cf.asOrganization,
        'request.cf.clientTcpRtt': cf.clientTcpRtt,
        'request.cf.clientAcceptEncoding': cf.clientAcceptEncoding,
        'request.cf.threatScore': cf.threatScore ?? 0,
        'request.cf.botManagement.score': cf.botManagement?.score,
        'request.cf.botManagement.verifiedBot': cf.botManagement?.verifiedBot,
        'request.cf.verifiedBotCategory': cf.verifiedBotCategory,
        'request.cf.botManagement.staticResource': cf.botManagement?.staticResource,
        'request.cf.botManagement.detectionIds': cf.botManagement?.detectionIds,
        'request.cf.botManagement.jsDetection.passed': cf.botManagement?.jsDetection?.passed,
        'request.cf.tlsVersion': cf.tlsVersion,
        'request.cf.tlsCipher': cf.tlsCipher,
        'request.cf.botManagement.ja3Hash': cf.botManagement?.ja3Hash,
        'request.cf.botManagement.ja4': cf.botManagement?.ja4,
        'request.cf.tlsClientHelloLength': cf.tlsClientHelloLength,
        'request.cf.tlsClientRandom': cf.tlsClientRandom,
        'request.cf.tlsClientAuth.certIssuerDNLegacy': cf.tlsClientAuth?.certIssuerDNLegacy,
        'request.cf.tlsClientAuth.certIssuerDN': cf.tlsClientAuth?.certIssuerDN,
        'request.cf.tlsClientAuth.certSubjectDNLegacy': cf.tlsClientAuth?.certSubjectDNLegacy,
        'request.cf.tlsClientAuth.certSubjectDN': cf.tlsClientAuth?.certSubjectDN,
        'request.cf.tlsClientAuth.certPresented': cf.tlsClientAuth?.certPresented,
        'request.cf.tlsClientAuth.certVerified': cf.tlsClientAuth?.certVerified,
    };

    for (const [key, value] of Object.entries(headers)) {
        data[`request.headers.${key.toLowerCase()}`] = value;
    }
    return data;
}

/**
 * Evaluates a single condition from a rule's expression.
 * @param {*} actualValue - The value from the request.
 * @param {string} operator - The comparison operator.
 * @param {*} ruleValue - The value from the rule.
 * @returns {boolean} True if the condition matches.
 */
function _checkCondition(actualValue, operator, ruleValue) {
    if (operator === 'is_null') return actualValue === null || actualValue === undefined;
    if (operator === 'is_not_null') return actualValue !== null && actualValue !== undefined;
    if (actualValue === null || actualValue === undefined) return false;

    switch (operator) {
        case 'equals':
            return actualValue == ruleValue;
        case 'not_equals':
            return actualValue != ruleValue;
        case 'contains':
            return typeof actualValue === 'string' && actualValue.includes(ruleValue);
        case 'not_contains':
            return typeof actualValue === 'string' && !actualValue.includes(ruleValue);
        case 'in':
            return Array.isArray(ruleValue) && ruleValue.includes(actualValue);
        case 'not_in':
            return Array.isArray(ruleValue) && !ruleValue.includes(actualValue);
        case 'greater_than':
            return actualValue > ruleValue;
        case 'less_than':
            return actualValue < ruleValue;
        case 'matches':
            try {
                return new RegExp(ruleValue, 'i').test(actualValue);
            } catch (e) {
                return false;
            }
        case 'not_matches':
            try {
                return !new RegExp(ruleValue, 'i').test(actualValue);
            } catch (e) {
                return false;
            }
        default:
            return false;
    }
}

/**
 * Evaluates a full rule expression.
 * @param {object[]} expression - An array of match conditions.
 * @param {object} requestData - The flattened request data.
 * @returns {boolean} True if all conditions in the expression match.
 */
export function evaluateExpression(expression, requestData) {
    if (!expression || expression.length === 0) return true;
    for (const match of expression) {
        if (!_checkCondition(requestData[match.field], match.operator, match.value)) {
            return false;
        }
    }
    return true;
}
