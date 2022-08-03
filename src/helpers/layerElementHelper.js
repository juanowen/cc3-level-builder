const InputModels = require('./inputModelsHelper');
const InputField = require('./inputFieldHelper');

!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t)
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).Model = t);
})(this, class LayerElement {
    constructor(data, schema, map, enums) {
        this.isActive = true;
        this.parentMap = map;

        this.isCollapsed = false;
        this.isRemoveable = true;
        this.isMoveable = true;
        this.isCloneable = true;

        this.name = data.type;
        this.type = data.type;
        this.img = schema.img;
        this.tooltip = schema.tooltip;
        this.properties = LayerElement.buildSchema(schema.properties, data.properties, enums);

        const positionModel = InputModels.copyModel('double');
        positionModel.name = 'position';
        positionModel.value = data.position;
        this.position = new InputField(positionModel);
    }

    static buildSchema(schema, enums = {}, data = []) {
        const result = [];
        schema.forEach(prop => {
            const model = InputModels.copyModel(prop.type);
            if (model) {
                let inputProp = null;
                let realValue = prop.value;
                if (Array.isArray(data)) {
                    inputProp = data.find(p => p.name === prop.name && p.type === prop.type);
                    if (inputProp && inputProp.value !== undefined) realValue = inputProp instanceof InputField ? inputProp.getValue() : inputProp.value;
                }

                const dataIsValid = InputModels.validateData(realValue, prop.type, enums);
                if (dataIsValid) {
                    model.value = realValue;
                    
                    if (prop.name !== undefined) model.name = prop.name;
                    if (prop.tooltip !== undefined) model.tooltip = prop.tooltip;
                    if (prop.isCollapsed !== undefined) model.isCollapsed = prop.isCollapsed;
                    if (prop.hasEditableName !== undefined) model.hasEditableName = prop.hasEditableName;

                    result.push(new InputField(model));
                }
            }
        });

        return result;
    }

    static cloneObject(data) {
        return InputModels.cloneObject(data);
    }

    removeElement() {
        this.isActive = false;
    }

    replaceElement(element) {
        if (Array.isArray(this.parentMap)) {
            const index = this.parentMap.indexOf(this);
            if (index > -1) {
                this.parentMap.splice(index, 1, element);
            }
        }
    }
    
    cloneElement(root) {
        if (Array.isArray(this.parentMap)) {
            const model = {};

            for (let key in this) {
                model[key] = this[key];
            }
            model.isCollapsed = false;
            model.position = model.position.getValue();

            const element = new LayerElement(
                model, 
                root.configs.elementSchemas.find(schema => schema.layer === root.current.layer.name && schema.name === model.type), 
                root.current.layer.data.map, 
                root.project.enums
            );
            this.parentMap.push(element);
        
            return element;
        }

        return null;
    }
});