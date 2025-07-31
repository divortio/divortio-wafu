/*
 * =============================================================================
 * FILE: public/ui.js
 *
 * DESCRIPTION:
 * The main entry point for the WAFu React application. This file contains the
 * top-level App component, which manages global state and routing. This version
 * relies on global constants defined in globals.js.
 * =============================================================================
 */

const AuthContext = createContext(null);

// --- Main App Component ---
function App() {
    const [config, setConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [route, setRoute] = useState({view: 'overview', group: null, field: null});
    const [activeRouteId, setActiveRouteId] = useState('global');
    const [currentUser, setCurrentUser] = useState({id: 'admin@wafu.com', role: 'administrator'});

    const parseRoute = useCallback(() => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
            setRoute({view: 'overview', group: null, field: null});
            return;
        }
        const parts = hash.split('/').filter(p => p);
        const view = parts[0] || 'overview';

        if (view === 'rules' && parts[1] === 'route') {
            setActiveRouteId(parts[2] || 'global');
        } else if (view !== 'rules') {
            setActiveRouteId('global');
        }
        setRoute({view, group: parts[1] || null, field: parts[2] || null});
    }, []);

    useEffect(() => {
        // The DEFAULT_CONFIG variable is loaded from config.js
        setConfig(DEFAULT_CONFIG);
        parseRoute();
        window.addEventListener('hashchange', parseRoute);
        return () => window.removeEventListener('hashchange', parseRoute);
    }, [parseRoute]);

    const handleSaveChanges = async () => {
        setIsSaving(true);
        console.log("Deploying new WAFu config:", JSON.stringify(config, null, 2));
        // Simulate API call
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

    if (!config) {
        return e('div', {className: "fixed inset-0 flex items-center justify-center bg-gray-100"},
            e('div', {className: "text-xl font-semibold"}, "Loading WAFu Configuration...")
        );
    }

    const renderView = () => {
        // These view components are loaded from views.js
        switch (route.view) {
            case 'rules':
                return e(FirewallRulesView, {config, setConfig, onNavigateToDocs: handleNavToField, activeRouteId});
            case 'routes':
                return e(RoutesView, {config, setConfig});
            case 'geolocation':
                return e(GeolocationView, {config, setConfig, activeRouteId});
            case 'fields':
                return e(FieldsView, {onNavigateToDocs: handleNavToField, activeRouteId, config});
            case 'threat-feeds':
                return e(ThreatFeedsView, null);
            case 'authentication':
                return e(AuthView, null);
            case 'audit-log':
                return e(AuditLogView, null);
            default:
                return e(OverviewView, {activeRouteId, config});
        }
    };

    return e(AuthContext.Provider, {value: {user: currentUser}},
        e('div', {className: "flex min-h-screen"},
            e('nav', {className: "w-64 bg-white border-r border-gray-200 p-4 flex flex-col flex-shrink-0"},
                e('div', {className: "flex items-center gap-4 mb-4 px-2"},
                    e('span', {className: "text-indigo-500 bg-indigo-100 p-2 rounded-lg"}, ICONS.shield),
                    e('select', {
                            value: activeRouteId,
                            onChange: ev => window.location.hash = `#/rules/route/${ev.target.value}`,
                            className: "cf-select font-bold text-lg w-full"
                        },
                        e('option', {value: "global"}, "GLOBAL"),
                        config.routes.map(r => e('option', {key: r.id, value: r.id}, r.incomingHost))
                    )
                ),
                e('div', {className: "text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase"}, "Security"),
                e('ul', null,
                    e('li', null, e('a', {
                        href: "#/rules",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'rules' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.shield, " Firewall Rules")),
                    e('li', null, e('a', {
                        href: "#/geolocation",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'geolocation' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.globe, " Geolocation")),
                    e('li', null, e('a', {
                        href: "#/threat-feeds",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'threat-feeds' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.shield, " Threat Feeds"))
                ),
                e('div', {className: "text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase"}, "Configuration"),
                e('ul', null,
                    e('li', null, e('a', {
                        href: "#/routes",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'routes' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.route, " Routes")),
                    e('li', null, e('a', {
                        href: "#/fields",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'fields' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.tag, " Fields"))
                ),
                e('div', {className: "text-xs text-gray-500 px-3 mt-4 mb-2 font-semibold uppercase"}, "Account"),
                e('ul', null,
                    e('li', null, e('a', {
                        href: "#/authentication",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'authentication' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.users, " Authentication")),
                    e('li', null, e('a', {
                        href: "#/audit-log",
                        className: `flex items-center gap-3 px-3 py-2 rounded-md font-semibold ${route.view === 'audit-log' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }, ICONS.book, " Audit Log"))
                ),
                e('div', {className: "mt-auto"},
                    e('button', {
                            onClick: handleSaveChanges,
                            disabled: isSaving || currentUser.role === 'viewer',
                            className: "w-full cf-button-primary px-4 py-2 rounded-md font-semibold"
                        },
                        isSaving ? 'Deploying...' : 'Deploy Changes'
                    ),
                    showSuccess && e('div', {className: "flex items-center justify-center gap-2 text-green-600 mt-2"}, ICONS.check, e('span', null, "Deployed!"))
                )
            ),
            e('main', {className: "flex-1 overflow-y-auto bg-gray-50"},
                renderView()
            )
        )
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));
