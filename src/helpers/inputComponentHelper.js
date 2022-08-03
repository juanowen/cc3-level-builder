const Vue = require('./vue');
    
!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t())
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).inputComponents = t());
})(this, function () {
    const inputComponent = Vue.component('input-field', {
        props: ['model'],
        beforeMount() {
            this.model.isRemoveable = this.$parent && this.$parent !== this.$root;
        },
        mounted() {
            if (this.model.needScroll) {
                setTimeout(() => {
                    this.$el.scrollIntoView({ block: 'center', inline: 'end', behavior: 'smooth' });
                    this.model.needScroll = false;
                });
            };
        },
    });
    Vue.component('string-field', {
        extends: inputComponent,
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value">
                <input type="string" v-model="model.value">
            </div>
        </div>`
    });
    Vue.component('number-field', {
        extends: inputComponent,
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value">
                <input type="number" v-model="model.value">
            </div>
        </div>`
    });
    Vue.component('boolean-field', {
        extends: inputComponent,
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value">
                <select v-model="model.value">
                    <option v-for="variant in model.variants" :value="variant">{{variant}}</option>
                </select>
            </div>
        </div>`
    });
    Vue.component('double-field', {
        extends: inputComponent,
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value double">
                <input type="number" v-model="model.value[Object.keys(model.value)[0]]" :title="Object.keys(model.value)[0]">
                <input type="number" v-model="model.value[Object.keys(model.value)[1]]" :title="Object.keys(model.value)[1]">
            </div>
        </div>`
    });
    Vue.component('position-field', {
        extends: inputComponent,
        methods: {
            moveTile() {
                if (this.$parent.model.isMoveable) {
                    this.$root.setMoveMode();
                    this.$root.current.tile = this.$parent.model;
                }
            }
        },
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value position">
                <input type="number" v-model="model.value[Object.keys(model.value)[0]]" :title="Object.keys(model.value)[0]">
                <input type="number" v-model="model.value[Object.keys(model.value)[1]]" :title="Object.keys(model.value)[1]">
                <button @click="moveTile" title="Move element">
                    <i class="gg gg-maximize-alt"></i>
                </button>
            </div>
        </div>`
    });
    Vue.component('triple-field', {
        extends: inputComponent,
        template: `
        <div class="inputField">
            <span :title="model.tooltip">{{model.name}}</span>
            <div class="value triple">
                <input type="number" v-model="model.value[Object.keys(model.value)[0]]" :title="Object.keys(model.value)[0]">
                <input type="number" v-model="model.value[Object.keys(model.value)[1]]" :title="Object.keys(model.value)[1]">
                <input type="number" v-model="model.value[Object.keys(model.value)[2]]" :title="Object.keys(model.value)[2]">
            </div>
        </div>`
    });
    Vue.component('any-field', {
        extends: inputComponent,
        methods: {
            chosenTypeChanged() {
                switch (this.model.chosenType) {
                    case 'string':
                        this.model.variants = [];
                        this.model.setValue('');
                        break;
                    case 'number': 
                        this.model.variants = [];
                        this.model.setValue(0);
                        break;
                    case 'boolean':
                        this.model.variants = ['true', 'false'];
                        this.model.setValue(false);
                        break;
                    case 'object':
                        this.model.value = [];
                        this.model.variants = [];
                        this.model.defaultElement = {
                            type: 'any',
                            settings: {
                                hasEditableName: true
                            }
                        };
                        Vue.nextTick(() => {
                            this.model.setValue({ '[0]': '' });
                        });
                        break;
                    case 'array':
                        this.model.value = [];
                        this.model.variants = [];
                        this.model.defaultElement = {
                            type: 'any',
                        };
                        Vue.nextTick(() => {
                            this.model.setValue(['']);
                        });
                        break;
                    case 'enum':
                        const defaultEnumName = Object.keys(this.$root.project.enums)[0];
                        const defaultEnum = this.$root.project.enums[defaultEnumName];

                        this.model.variants = defaultEnum;
                        if (defaultEnum.length) {
                            this.model.value = defaultEnum[0];
                        } 
                        this.model.setValue({ enum: defaultEnumName, element: this.model.value });
                        break;
                }
            },
            chosenEnumChanged() {
                this.model.variants = [];

                const chosenEnum = this.$root.project.enums[this.model.chosenEnum];
                if (chosenEnum !== undefined) {
                    this.model.variants = JSON.parse(JSON.stringify(chosenEnum));
                    if (this.model.variants.length) {
                        if (!this.model.variants.includes(this.model.value)) {
                            this.model.value = this.model.variants[0];
                        }
                    } else {
                        this.model.value = '';
                    }
                }
            }
        },
        template: `
        <div class="inputGroup" :class="{ collapsed: model.isCollapsed }">
            <group-header :model="model"></group-header>
            <div class="inputGroupBody" v-if="!model.isCollapsed">
                <div class="inputField">
                    <span>Type</span>
                    <div class="value">
                        <select v-model="model.chosenType" @change="chosenTypeChanged">
                            <option v-for="type in $root.configs.anyTypes" :value="type.toLowerCase()">{{type}}</option>
                        </select>
                    </div>
                </div>
                <div class="inputField" v-if="!['object', 'array', 'enum'].includes(model.chosenType)">
                    <span :title="model.tooltip">Value</span>
                    <div class="value" v-if="model.chosenType === 'string'">
                        <input type="string" v-model="model.value">
                    </div>
                    <div class="value" v-if="model.chosenType === 'number'">
                        <input type="number" v-model="model.value">
                    </div>
                    <div class="value" v-if="model.chosenType === 'boolean'">
                        <select v-model="model.value">
                            <option v-for="variant in model.variants" :value="variant">{{variant}}</option>
                        </select>
                    </div>
                </div>
                <div class="inputField fullWidth" v-if="['object', 'array'].includes(model.chosenType)">
                    <div class="inputGroup uncollapsable">
                        <group-header :model="{ name: 'Value', isExtendable: true }"></group-header>
                        <div class="inputGroupBody">
                            <any-field v-for="comp in model.value" :model="comp"></any-field>
                        </div>
                    </div>
                </div>
                <div class="inputField" v-if="model.chosenType === 'enum'">
                    <span>Enum</span>
                    <div class="value">
                        <select v-model="model.chosenEnum" @change="chosenEnumChanged">
                            <option v-for="name in Object.keys($root.project.enums)" :value="name">{{name}}</option>
                        </select>
                    </div>
                </div>
                <div class="inputField" v-if="model.chosenType === 'enum'">
                    <span>Value</span>
                    <div class="value">
                        <select v-model="model.value">
                            <option v-for="variant in model.variants" :value="variant">{{variant}}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>`
    });
    Vue.component('object-field', {
        extends: inputComponent,
        template: `
        <div class="inputGroup" :class="{ collapsed: model.isCollapsed }">
            <group-header :model="model"></group-header>
            <div class="inputGroupBody" v-if="!model.isCollapsed">
                <any-field v-for="comp in model.value" :model="comp"></any-field>
            </div>
        </div>`
    });
    Vue.component('enum-field', {
        extends: inputComponent,
        mounted() {
            this.chosenEnumChanged();
        },
        methods: {
            chosenEnumChanged() {
                this.model.variants = [];

                const chosenEnum = this.$root.project.enums[this.model.chosenEnum];
                if (chosenEnum !== undefined) {
                    this.model.variants = JSON.parse(JSON.stringify(chosenEnum));
                    if (this.model.variants.length) {
                        if (!this.model.variants.includes(this.model.value)) {
                            this.model.value = this.model.variants[0];
                        }
                    } else {
                        this.model.value = '';
                    }
                }
            }
        },
        template: `
        <div class="inputGroup" :class="{ collapsed: model.isCollapsed }">
            <group-header :model="model"></group-header>
            <div class="inputGroupBody" v-if="!model.isCollapsed">
                <div class="inputField" v-if="!model.isStrictEnum">
                    <span>Enum</span>
                    <div class="value">
                        <select v-model="model.chosenEnum" @change="chosenEnumChanged">
                            <option v-for="name in Object.keys($root.project.enums)" :value="name">{{name}}</option>
                        </select>
                    </div>
                </div>
                <div class="inputField">
                    <span>Value</span>
                    <div class="value">
                        <select v-model="model.value">
                            <option v-for="variant in model.variants" :value="variant">{{variant}}</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>`
    });
});