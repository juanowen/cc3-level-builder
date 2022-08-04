!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t)
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).Model = t);
})(this, class Model {
    constructor({ 
        type = 'string',
        name = 'string',
        tooltip = '',
        value = '', 
        variants = [],      // значения выпадающего списка
        chosenType,         // для выбранного типа данных поля типа any
        chosenEnum,
        defaultElement,     // для структуры нового элемента массива
        optional,       
        getCallback,
        setCallback,
        isRemoveable,
        isExtendable,
        isCloneable,
        isCollapsed,
        hasEditableName,
        needScroll
    }) {
        this.type = type;
        this.field = `${type === 'array' ? 'object' : type}-field`;
        this.name = name;
        this.tooltip = tooltip;

        this.value = value;
        this.variants = variants;
        this.chosenType = chosenType || typeof value;
        this.chosenEnum = chosenEnum;
        this.isStrictEnum = value instanceof Object && value.isStrictEnum !== undefined ? value.isStrictEnum  : true;
        this.defaultElement = defaultElement;

        this.optional = {
            use: false,
            value: false
        }
        if (optional instanceof Object) {
            if (optional.use !== undefined) this.optional.use = optional.use;
            if (optional.value !== undefined) this.optional.value = optional.value;
        }

        this.getCallback = getCallback instanceof Function ? getCallback : () => { return this.value.toString() };
        this.setCallback = setCallback instanceof Function ? setCallback : (value) => { return value.toString() };
    
        this.isRemoveable = isRemoveable || false;
        this.isExtendable = isExtendable || false;
        this.isCloneable = isCloneable || false;
        this.isCollapsed = isCollapsed !== undefined ? isCollapsed : true;

        this.hasEditableName = hasEditableName || false;
        this.needScroll = needScroll || false;

        this.setValue(value);
    }
    
    getValue() {
        return this.getCallback(this.value, this);
    }
    setValue(value) {
        this.value = this.setCallback(value, this);
    }

    addElement() {
        if (Array.isArray(this.value)) {
            if (this.defaultElement && this.defaultElement.type) {
                const InputModels = require('./inputModelsHelper');
                const model = InputModels.copyModel(this.defaultElement.type);
                model.name = `[${this.value.length}]`;
                model.needScroll = true;
                model.isCloneable = true;
                model.isCollapsed = false;
                
                if (this.defaultElement.settings instanceof Object) {
                    for (let key in this.defaultElement.settings) {
                        model[key] = this.defaultElement.settings[key];
                    }
                }

                const element = new Model(model);
                if (this.defaultElement.value !== undefined) {
                    element.setValue(this.defaultElement.value);
                }
                this.value.push(element);
            }
        }
    }
    removeElement(element) {
        if (Array.isArray(this.value)) {
            const index = this.value.indexOf(element);
            if (index > -1) {
                this.value.splice(index, 1);
                this.value.forEach((el, i) => { 
                    if (/\[\d\]/.test(el.name.trim())) {
                        el.name = `[${i}]`;
                    }
                });
            }
        }
    }
    cloneElement(map) {
        if (Array.isArray(map)) {
            const InputModels = require('./inputModelsHelper');
            const model = InputModels.copyModel(this.type);

            for (let key in this) {
                model[key] = this[key];
            }
            model.name = `[${map.length}]`;
            model.needScroll = true;
            model.isCollapsed = false;

            map.push(new Model(model));
        }
    }
});