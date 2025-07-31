/*
 * =============================================================================
 * FILE: public/components.js
 *
 * DESCRIPTION:
 * Contains all reusable React components for the WAFu application. This version
 * relies on global constants defined in globals.js.
 * =============================================================================
 */

const RuleEditor = ({rule, onSave, onCancel, onNavigateToDocs, context}) => {
    const [editedRule, setEditedRule] = useState(rule);
    const [hoveredField, setHoveredField] = useState(null);
    const [errors, setErrors] = useState({});

    const validateValue = (value, operator, fieldDetails) => {
        if (!fieldDetails) return 'Invalid field selected.';
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

    return e('div', {className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"},
        e('div', {className: "cf-card w-full max-w-3xl max-h-[90vh] overflow-y-auto"},
            e('div', {className: "p-6"},
                e('h2', {className: "text-xl font-semibold mb-4"}, rule.id.startsWith('new-rule') ? 'Create Rule' : 'Edit Rule'),
                e('div', {className: "space-y-4"},
                    e('div', null,
                        e('label', {className: "block text-sm font-medium text-gray-700"}, "Rule Name (Optional)"),
                        e('input', {
                            type: "text",
                            value: editedRule.name,
                            onChange: ev => setEditedRule(prev => ({...prev, name: ev.target.value})),
                            className: "cf-input",
                            placeholder: "Defaults to Rule ID"
                        })
                    ),
                    e('div', null,
                        e('label', {className: "block text-sm font-medium text-gray-700"}, "Description (Optional)"),
                        e('input', {
                            type: "text",
                            value: editedRule.description,
                            onChange: ev => setEditedRule(prev => ({...prev, description: ev.target.value})),
                            className: "cf-input",
                            placeholder: "Auto-generated if left blank"
                        })
                    ),
                    e('div', null,
                        e('label', {className: "block text-sm font-medium text-gray-700"}, "Action"),
                        e('select', {
                                value: editedRule.action,
                                onChange: ev => setEditedRule(prev => ({...prev, action: ev.target.value})),
                                className: "cf-select"
                            },
                            e('option', null, "BLOCK"),
                            e('option', null, "CHALLENGE"),
                            e('option', null, "ALLOW"),
                            e('option', null, "LOG")
                        )
                    ),
                    e('div', null,
                        e('label', {className: "block text-sm font-medium text-gray-700"}, "Custom Tags (comma-separated)"),
                        e('input', {
                            type: "text",
                            value: Array.isArray(editedRule.tags) ? editedRule.tags.filter(t => !ALL_FIELDS.some(f => f.id === t)).join(', ') : '',
                            onChange: ev => setEditedRule(prev => ({
                                ...prev,
                                tags: ev.target.value.split(',').map(t => t.trim())
                            })),
                            className: "cf-input",
                            placeholder: "e.g., critical, api-v1"
                        })
                    ),
                    e('div', {className: "border-t pt-4"},
                        e('h3', {className: "font-semibold text-lg mb-2"}, "Expression"),
                        e('p', {className: "text-sm text-gray-500 mb-4"}, "Requests will be matched if ALL of these conditions are true."),
                        e('div', {className: "space-y-3"},
                            editedRule.expression.map((expr, index) => {
                                const fieldDetails = getFieldDetails(expr.field);
                                const isNullOperator = expr.operator === 'is_null' || expr.operator === 'is_not_null';
                                return e('div', {key: index, className: "p-3 bg-gray-50 rounded-md border"},
                                    e('div', {className: "grid grid-cols-1 md:grid-cols-4 gap-2 items-start"},
                                        e('div', {className: "md:col-span-2"},
                                            e('div', {className: "flex items-center gap-2"},
                                                e('select', {
                                                        value: expr.field,
                                                        onChange: ev => handleExpressionChange(index, 'field', ev.target.value),
                                                        className: "cf-select"
                                                    },
                                                    Object.entries(WAF_FIELD_GROUPS).map(([groupName, fields]) =>
                                                        e('optgroup', {key: groupName, label: groupName},
                                                            fields.map(f => e('option', {
                                                                key: f.id,
                                                                value: f.id
                                                            }, `${f.id} (${f.name})`))
                                                        )
                                                    )
                                                ),
                                                e('a', {
                                                        href: fieldDetails?.docUrl || '#',
                                                        target: "_blank",
                                                        rel: "noopener noreferrer",
                                                        className: "text-gray-400 hover:text-indigo-600 p-2 cursor-pointer",
                                                        title: "View Documentation"
                                                    },
                                                    ICONS.info
                                                )
                                            )
                                        ),
                                        e('select', {
                                                value: expr.operator,
                                                onChange: ev => handleExpressionChange(index, 'operator', ev.target.value),
                                                className: "cf-select"
                                            },
                                            WAF_OPERATORS.map(o => e('option', {
                                                key: o,
                                                value: o
                                            }, o.replace(/_/g, ' ').toUpperCase()))
                                        ),
                                        e('div', {className: "relative flex items-center gap-2"},
                                            fieldDetails?.dataType === 'boolean' ?
                                                e('select', {
                                                        value: expr.value,
                                                        onChange: ev => handleExpressionChange(index, 'value', ev.target.value),
                                                        className: "cf-select",
                                                        disabled: isNullOperator
                                                    },
                                                    e('option', {value: "true"}, "True"),
                                                    e('option', {value: "false"}, "False")
                                                ) :
                                                e('input', {
                                                    type: "text",
                                                    value: isNullOperator ? '' : expr.value,
                                                    onChange: ev => handleExpressionChange(index, 'value', ev.target.value),
                                                    className: `cf-input ${isNullOperator ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors[index] ? 'border-red-500' : ''}`,
                                                    placeholder: isNullOperator ? "N/A" : "Value...",
                                                    disabled: isNullOperator
                                                }),
                                            e('button', {
                                                onClick: () => removeExpression(index),
                                                className: "p-2 text-gray-500 hover:text-red-600"
                                            }, ICONS.trash),
                                            errors[index] && e('div', {className: "absolute top-full left-0 text-xs text-red-600 mt-1"}, errors[index])
                                        )
                                    )
                                );
                            })
                        ),
                        e('button', {
                            onClick: addExpression,
                            className: "mt-4 flex items-center gap-2 text-sm cf-button-secondary px-3 py-1.5 rounded-md"
                        }, ICONS.plus, " Add Condition")
                    )
                )
            ),
            e('div', {className: "bg-gray-50 px-6 py-3 flex justify-end space-x-3 border-t"},
                e('button', {onClick: onCancel, className: "cf-button-secondary px-4 py-2 rounded-md"}, "Cancel"),
                e('button', {
                    onClick: handleSave,
                    disabled: hasErrors,
                    className: "cf-button-primary px-4 py-2 rounded-md"
                }, "Save Rule")
            )
        )
    );
};

const RuleCardContent = ({rule, onToggle, onDelete, onEdit}) => {
    const actionColor = {
        BLOCK: 'bg-red-100 text-red-800',
        CHALLENGE: 'bg-yellow-100 text-yellow-800',
        LOG: 'bg-blue-100 text-blue-800',
        ALLOW: 'bg-green-100 text-green-800'
    }[rule.action];
    const description = rule.description || generateRuleDescription(rule.expression);
    const name = rule.name || rule.id;

    return e(React.Fragment, null,
        rule.enabled && e('div', {className: "text-lg font-bold text-gray-400 w-6 text-center"}, rule.priority),
        e('div', {className: "flex-1 pr-4"},
            e('p', {className: "font-semibold text-gray-800"}, name),
            e('p', {className: "text-sm text-gray-500 mt-1"}, description),
            e('div', {className: "mt-2 flex items-center flex-wrap gap-2"},
                e('span', {className: `px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}, rule.action),
                rule.tags && rule.tags.map(tag =>
                    e('span', {
                        key: tag,
                        className: "px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700"
                    }, tag)
                )
            )
        ),
        e('div', {className: "flex items-center space-x-3"},
            e('label', {htmlFor: `toggle-${rule.id}`, className: "flex items-center cursor-pointer"},
                e('div', {className: "relative"},
                    e('input', {
                        id: `toggle-${rule.id}`,
                        type: "checkbox",
                        className: "sr-only",
                        checked: rule.enabled,
                        onChange: onToggle
                    }),
                    e('div', {className: "block bg-gray-200 w-10 h-6 rounded-full cf-toggle-bg"})
                )
            ),
            e('button', {onClick: onEdit, className: "p-1 text-gray-500 hover:text-indigo-600"}, ICONS.edit),
            e('button', {onClick: onDelete, className: "p-1 text-gray-500 hover:text-red-600"}, ICONS.trash)
        )
    );
};
