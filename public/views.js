/*
 * =============================================================================
 * FILE: public/views.js
 *
 * DESCRIPTION:
 * Contains all the main "view" or "page" components for the WAFu application.
 * This version relies on global constants defined in globals.js.
 * =============================================================================
 */

const OverviewView = ({activeRouteId, config}) => {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;
    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Overview"),
        e('p', {className: "text-gray-600 mb-8"}, "Displaying analytics for ", e('span', {className: "font-semibold text-indigo-600"}, contextName)),
        e('div', {className: "cf-card p-6 border-t-indigo-500"},
            e('p', {className: "text-center text-gray-500"}, "Analytics Dashboard would be displayed here.")
        )
    );
};

const FirewallRulesView = ({config, setConfig, onNavigateToDocs, activeRouteId}) => {
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

    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        isEditing && e(RuleEditor, {
            rule: editingRule,
            onSave: handleSaveRule,
            onCancel: () => setIsEditing(false),
            onNavigateToDocs: onNavigateToDocs,
            context: isGlobal ? 'global' : currentRoute.incomingHost
        }),
        e('div', {className: "space-y-8"},
            e('div', {className: "cf-card border-t-indigo-500"},
                e('div', {className: "p-6"},
                    e('div', {className: "flex justify-between items-center mb-4"},
                        e('h2', {className: "text-xl font-semibold"}, "Active Rules ", e('span', {className: "text-gray-500 font-normal"}, `for ${currentRouteName}`)),
                        e('button', {
                            onClick: handleCreateRule,
                            className: "cf-button-primary px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
                        }, ICONS.plus, " Create Rule")
                    ),
                    e('div', {className: "space-y-3"},
                        activeRules.map((rule, index) =>
                            e('div', {
                                    key: rule.id,
                                    className: "border rounded-md p-4 bg-white hover:bg-gray-50 transition-colors flex items-center gap-4"
                                },
                                e('div', {className: "flex flex-col"},
                                    e('button', {
                                        onClick: () => handleMoveRule(index, -1),
                                        disabled: index === 0,
                                        className: "p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    }, ICONS.arrowUp),
                                    e('button', {
                                        onClick: () => handleMoveRule(index, 1),
                                        disabled: index === activeRules.length - 1,
                                        className: "p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    }, ICONS.arrowDown)
                                ),
                                e(RuleCardContent, {
                                    rule: rule,
                                    onToggle: () => handleRuleToggle(rule.id),
                                    onDelete: () => handleRuleDelete(rule.id),
                                    onEdit: () => handleEditRule(rule)
                                })
                            )
                        ),
                        activeRules.length === 0 && e('p', {className: "text-gray-500 text-center py-4"}, "No active rules. Create a rule or enable one below.")
                    )
                )
            ),
            e('div', {className: "cf-card border-t-gray-400"},
                e('div', {className: "p-6"},
                    e('h2', {className: "text-xl font-semibold mb-4"}, "Disabled Rules ", e('span', {className: "text-gray-500 font-normal"}, `for ${currentRouteName}`)),
                    e('div', {className: "space-y-3"},
                        disabledRules.map(rule =>
                            e('div', {
                                    key: rule.id,
                                    className: "border rounded-md p-4 bg-gray-50 flex items-center gap-4"
                                },
                                e('div', {className: "flex flex-col"},
                                    e('button', {
                                        className: "p-1 text-gray-300 cursor-not-allowed",
                                        disabled: true
                                    }, ICONS.arrowUp),
                                    e('button', {
                                        className: "p-1 text-gray-300 cursor-not-allowed",
                                        disabled: true
                                    }, ICONS.arrowDown)
                                ),
                                e(RuleCardContent, {
                                    rule: rule,
                                    onToggle: () => handleRuleToggle(rule.id),
                                    onDelete: () => handleRuleDelete(rule.id),
                                    onEdit: () => handleEditRule(rule)
                                })
                            )
                        ),
                        disabledRules.length === 0 && e('p', {className: "text-gray-500 text-center py-4"}, "No disabled rules.")
                    )
                )
            )
        )
    );
};

const RoutesView = ({config, setConfig}) => {
    const handleRouteEnabledChange = (routeId, isEnabled) => {
        setConfig(prev => {
            const newRoutes = prev.routes.map(r => r.id === routeId ? {...r, enabled: isEnabled} : r);
            const targetRoute = prev.routes.find(r => r.id === routeId);
            const newGlobalRules = prev.globalRules.map(gr => {
                if (gr.tags.includes('auto-generated') && gr.expression[0].value === targetRoute.incomingHost) {
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
                globalRules: prev.globalRules.filter(r => !(r.tags.includes('auto-generated') && r.expression[0].value === routeToRemove.incomingHost))
            }));
        }
    };

    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Origin Routes"),
        e('p', {className: "text-gray-600 mb-8"}, "Map incoming hostnames to your backend origin URLs. WAFu will proxy allowed requests to these origins."),
        e('div', {className: "cf-card border-t-indigo-500"},
            e('div', {className: "p-6"},
                e('div', {className: "space-y-4"},
                    config.routes.map((route, index) =>
                        e('div', {
                                key: route.id,
                                className: "grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-3 bg-gray-50 rounded-md border"
                            },
                            e('div', {className: "md:col-span-2"},
                                e('label', {className: "block text-sm font-medium text-gray-700 mb-1"}, "Incoming Host"),
                                e('input', {
                                    type: "text",
                                    value: route.incomingHost,
                                    disabled: true,
                                    className: "cf-input bg-gray-100"
                                })
                            ),
                            e('div', {className: "md:col-span-2"},
                                e('label', {className: "block text-sm font-medium text-gray-700 mb-1"}, "Origin URL"),
                                e('input', {
                                    type: "text",
                                    value: route.originUrl,
                                    disabled: true,
                                    className: "cf-input bg-gray-100"
                                })
                            ),
                            e('div', {className: "text-center pt-5"},
                                e('label', {
                                        htmlFor: `toggle-route-${route.id}`,
                                        className: "flex items-center cursor-pointer"
                                    },
                                    e('div', {className: "relative"},
                                        e('input', {
                                            id: `toggle-route-${route.id}`,
                                            type: "checkbox",
                                            className: "sr-only",
                                            checked: route.enabled,
                                            onChange: (ev) => handleRouteEnabledChange(route.id, ev.target.checked)
                                        }),
                                        e('div', {className: "block bg-gray-200 w-10 h-6 rounded-full cf-toggle-bg"})
                                    )
                                )
                            ),
                            e('div', {className: "text-right pt-5"},
                                e('button', {
                                    onClick: () => removeRoute(route),
                                    className: "p-2 text-gray-500 hover:text-red-600"
                                }, ICONS.trash)
                            )
                        )
                    )
                ),
                e('div', {className: "mt-6"},
                    e('button', {
                        onClick: addRoute,
                        className: "cf-button-secondary px-3 py-1.5 rounded-md text-sm flex items-center gap-2"
                    }, ICONS.plus, " Add Route")
                )
            )
        )
    );
};

const GeolocationView = ({config, setConfig, activeRouteId}) => {
    const mapContainer = useRef(null);
    const mapInstance = useRef(null);
    const geoJsonLayer = useRef(null);
    const [selectedCountry, setSelectedCountry] = useState(null);

    const isGlobal = activeRouteId === 'global';
    const currentRules = isGlobal ? config.globalRules : config.routes.find(r => r.id === activeRouteId)?.customRules || [];

    useEffect(() => {
        if (mapContainer.current && !mapInstance.current) {
            mapInstance.current = L.map(mapContainer.current, {center: [20, 0], zoom: 2, attributionControl: false});
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
                maxZoom: 10,
                minZoom: 2
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

    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Geolocation"),
        e('p', {className: "text-gray-600 mb-8"}, "Create country-based rules by clicking on the interactive map."),
        e('div', {className: "cf-card p-4 border-t-indigo-500"},
            e('div', {id: "map", ref: mapContainer, style: {height: '500px'}})
        ),
        selectedCountry && e('div', {className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"},
        e('div', {className: "cf-card w-full max-w-md border-t-indigo-500"},
            e('div', {className: "p-6"},
                e('h2', {className: "text-xl font-semibold mb-2"}, `Create Rule for ${selectedCountry.name} (${selectedCountry.code})`),
                e('p', {className: "text-gray-600 mb-6"}, "What action should WAFu take for traffic from this country?"),
                e('div', {className: "flex justify-end gap-4"},
                    e('button', {
                        onClick: () => setSelectedCountry(null),
                        className: "cf-button-secondary px-4 py-2 rounded-md"
                    }, "Cancel"),
                    e('button', {
                        onClick: () => handleGeoRuleCreate('ALLOW'),
                        className: "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-semibold"
                    }, "Allow"),
                    e('button', {
                        onClick: () => handleGeoRuleCreate('BLOCK'),
                        className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md font-semibold"
                    }, "Block")
                )
            )
        )
        )
    );
};

const FieldsView = ({onNavigateToDocs, activeRouteId, config}) => {
    const contextName = activeRouteId === 'global' ? 'GLOBAL' : config.routes.find(r => r.id === activeRouteId)?.incomingHost;

    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Fields"),
        e('p', {className: "text-gray-600 mb-8"}, "Browse all available fields for use in firewall rule expressions."),
        Object.entries(WAF_FIELD_GROUPS).map(([groupName, fields]) =>
            e('div', {key: groupName, className: "mb-8"},
                e('h2', {className: "text-xl font-semibold border-b pb-2 mb-4"}, groupName),
                e('div', {className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"},
                    fields.map(field =>
                        e('div', {
                                key: field.id,
                                className: "cf-card border-t-transparent p-4 hover:shadow-lg transition-shadow"
                            },
                            e('p', {className: "font-mono text-sm text-indigo-600"}, field.id),
                            e('p', {className: "font-semibold mt-1"}, field.name),
                            e('p', {className: "text-xs text-gray-500 mt-1"}, field.description)
                        )
                    )
                )
            )
        )
    );
};

const ThreatFeedsView = () => {
    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Threat Feeds"),
        e('p', {className: "text-gray-600 mb-8"}, "Manage and monitor third-party threat intelligence lists."),
        e('div', {className: "cf-card p-6 border-t-indigo-500"},
            e('p', {className: "text-center text-gray-500"}, "UI for managing threat intelligence feeds would be here.")
        )
    );
};

const AuthView = () => {
    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Authentication"),
        e('p', {className: "text-gray-600 mb-8"}, "Manage Gates, Users, and Groups."),
        e('div', {className: "cf-card p-6 border-t-indigo-500"},
            e('p', {className: "text-center text-gray-500"}, "A tabbed interface for managing Gates, Users, and User Groups would be here.")
        )
    );
};

const AuditLogView = () => {
    return e('div', {className: "p-4 sm:p-6 lg:p-8"},
        e('h1', {className: "text-3xl font-bold mb-2"}, "Audit Log"),
        e('p', {className: "text-gray-600 mb-8"}, "Review all configuration changes made to the WAFu platform."),
        e('div', {className: "cf-card p-6 border-t-indigo-500"},
            e('p', {className: "text-center text-gray-500"}, "A filterable, paginated view of all audit log entries would be here.")
        )
    );
};
