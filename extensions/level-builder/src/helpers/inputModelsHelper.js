const InputField = require('../helpers/inputFieldHelper');

const models = {
    string: {
        type: 'string',
        name: 'string',
        value: '',
        getCallback: (value) => {
            return value.toString();
        },
        setCallback: (value) => {
            return value.toString();
        }
    },
    number: {
        type: 'number',
        name: 'number',
        value: '0',
        getCallback: (value) => {
            return +value;
        },
        setCallback: (value) => {
            return value.toString();
        }
    },
    boolean: {
        type: 'boolean',
        name: 'boolean',
        value: 'false',
        variants: ['true', 'false'],
        getCallback: (value) => {
            return value === 'true';
        },
        setCallback: (value) => {
            return value.toString();
        }
    },
    double: {
        type: 'double',
        name: 'double',
        value: { x: 0, y: 0 },
        getCallback: (value) => {
            for (let prop in value) {
                value[prop] = +value[prop];
            }
            return value;
        },
        setCallback: (value) => {
            for (let prop in value) {
                value[prop] = value[prop].toString();
            }
            return value;
        }
    },
    triple: {
        type: 'triple',
        name: 'triple',
        value: { x: 0, y: 0, z: 0 },
        getCallback: (value) => {
            for (let prop in value) {
                value[prop] = +value[prop];
            }
            return value;
        },
        setCallback: (value) => {
            for (let prop in value) {
                value[prop] = value[prop].toString();
            }
            return value;
        }
    },
    any: {
        type: 'any',
        name: 'any',
        value: '',
        getCallback: (value, model) => {
            return models[model.chosenType].getCallback(value, model);
        },
        setCallback: (value, model) => {
            return models[model.chosenType].setCallback(value, model);
        }
    },
    object: {
        type: 'object',
        name: 'object',
        value: [],
        isExtendable: true,
        defaultElement: {
            type: 'any',
            settings: {
                hasEditableName: true
            }
        },
        getCallback: (value) => {
            return value.reduce((pv, el) => { 
                pv[el.name] = el.getValue(); 
                return pv; 
            }, {});
        },
        setCallback: (value) => {
            const result = [];
            for (let prop in value) {
                const model = models.copyModel('any');

                if (model) {
                    model.name = prop;
                    model.value = value[prop];
                    model.hasEditableName = true;
                    model.isCollapsed = true;
                    model.isCloneable = true;
                    model.chosenType = typeof model.value;
                    if (model.chosenType === 'boolean') {
                        model.variants = ['true', 'false'];
                    }

                    result.push(new InputField(model));
                }
            }
            return result;
        }
    },
    array: {
        type: 'array',
        name: 'array',
        value: [],
        isExtendable: true,
        defaultElement: {
            type: 'any',
        },
        getCallback: (value) => {
            return value.map(el => el.getValue());
        },
        setCallback: (value) => {
            const result = [];

            if (Array.isArray(value)) {
                value.forEach((el, i) => {
                    const model = models.copyModel('any');

                    if (model) {
                        model.name = `[${i}]`;
                        model.value = el;
                        model.isCollapsed = true;
                        model.isCloneable = true;
                        model.chosenType = typeof model.value;
                        if (model.chosenType === 'boolean') {
                            model.variants = ['true', 'false'];
                        }

                        result.push(new InputField(model));
                    }
                });
            }
            return result;
        }
    },
    enum: {
        type: 'enum',
        name: 'enum',
        value: '',
        getCallback: (value, model) => {
            return { enum: model.chosenEnum, element: value };
        },
        setCallback: (value, model) => {
            model.chosenEnum = value.enum;
            return value.element;
        }
    },

    copyModel: (modelName) => {
        const etalon = models[modelName];
        if (etalon === undefined || etalon instanceof Function) return null;

        const result = models.cloneObject(etalon);
        for (let key in etalon) {
            if (etalon[key] instanceof Function) {
                result[key] = etalon[key];
            }
        }

        return result;
    },

    validateData(value, type, enums = {}) {
        let dataIsValid = true;
        switch(type) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'object': 
                dataIsValid = typeof value === type;
                break;
            case 'array':
                dataIsValid = Array.isArray(value);
                break;
            case 'double':
                dataIsValid = value instanceof Object && Object.keys(value).length === 2;
                break;
            case 'triple':
                dataIsValid = value instanceof Object && Object.keys(value).length === 3;
                break;
            case 'enum': 
                if (Object.keys(enums).includes(value.enum)) {
                    const targetEnum = enums[value.enum];
                    if (!targetEnum.includes(value.element)) {
                        value.element = targetEnum.length ? targetEnum[0] : null;
                    }
                } else {
                    dataIsValid = false;
                }
                break;
        }

        return dataIsValid;
    },

    cloneObject(data) {
        return JSON.parse(JSON.stringify(data));
    }
};

!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t)
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).inputModels = t);
})(this, models);