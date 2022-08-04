const Vue = require('./vue');
    
!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t())
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).inputComponents = t());
})(this, function () {
    const groupHeader = Vue.component('group-header', {
        props: ['model'],
        methods: {
            toggleGroup() {
                this.model.isCollapsed = !this.model.isCollapsed;
            },
            removeElement() { 
                if (this.model.isRemoveable) {
                    this.$parent.$parent.model.removeElement(this.model);
                }
            },
            addElement() {
                if (this.model.isExtendable) {
                    this.model.isCollapsed = false;
                    this.$parent.model.addElement();
                }
            }, 
            cloneElement() {
                if (this.model.isCloneable) {
                    this.$parent.model.cloneElement(this.$parent.$parent.model.value);
                }
            }
        },
        template: `
        <div class="inputGroupHeader">
            <div class="inputGroupCollapser" @click="toggleGroup">
                <i class="gg gg-chevron-down"></i>
            </div>
            <span v-if="!model.hasEditableName" :title="model.tooltip">{{model.name}}</span>
            <input v-if="model.hasEditableName" :title="model.tooltip" class="groupName" type="text" v-model="model.name">
            <div class="inputGroupButtons">
                <button v-if="model.isRemoveable" @click="removeElement">
                    <i class="gg gg-close-r" title="Remove element"></i>
                </button>
                <button v-if="model.isExtendable" @click="addElement">
                    <i class="gg gg-add-r" title="Add element"></i>
                </button>
                <button v-if="model.isCloneable" @click="cloneElement">
                    <i class="gg gg-dice-2" title="Clone element"></i>
                </button>
            </div>
        </div>`
    });

    Vue.component('toolbox', {
        computed: {
            layerListMode() {
                return this.$root.states.layerListMode;
            },
            title() {
                return !this.$root.current.layer ? 'Settings:' : 'Layer elements:'; 
            },
            isNotEmpty() {
                return this.$root.current.layer ? this.$root.current.layer.data.map.length : this.$root.rootData.length;
            }
        },
        methods: {
            expandAll() {
                const list = this.$root.current.layer ? this.$root.current.layer.data.map : this.$root.rootData;
                list.forEach(el => { el.isCollapsed = false });
            },
            collapseAll() {
                const list = this.$root.current.layer ? this.$root.current.layer.data.map : this.$root.rootData;
                list.forEach(el => { el.isCollapsed = true });
            },
            sortAlphabetically() {
                const list = this.$root.current.layer ? this.$root.current.layer.data.map : this.$root.rootData;
                list.sort((a, b) => a.name < b.name ? -1 : 1);
            },
        },
        template: `
        <div class="elementsListToolbox" v-if="isNotEmpty">
            <button class="layerListModeToggler" :title="$root.layerListModeTogglerTitle" @click="$root.toggleLayerListMode">
                <i v-if="!layerListMode" class="gg gg-layout-list"></i>
                <i v-if="layerListMode" class="gg gg-format-line-height"></i>
            </button>

            <span v-if="layerListMode">{{title}}</span>
            <button v-if="layerListMode">
                <i class="gg gg-push-chevron-down-r" title="Expand all" @click="expandAll"></i>
            </button>
            <button v-if="layerListMode">
                <i class="gg gg-push-chevron-up-r" title="Collapse all" @click="collapseAll"></i>
            </button>
            <button v-if="layerListMode">
                <i class="gg gg-arrow-down-r" title="Sort alphabetically" @click="sortAlphabetically"></i>
            </button>

            <toolbox-selector v-if="!layerListMode"></toolbox-selector>
            <toolbox-plot v-if="!layerListMode"></toolbox-plot>
        </div>`
    });
    

    Vue.component('toolbox-selector', {
        computed: {
            chosenOption() {
                if (this.$root.current.layer) {
                    return this.$root.current.tile ? this.$root.current.tile.name : 'Choose tile...';
                } else {
                    return this.$root.current.rootProp ? this.$root.current.rootProp.name : 'Choose property...';
                }
            }
        },
        methods: {
            onClick() {
                this.$root.toggleToolboxSelector();
            }
        },
        template: `
        <div class="toolboxSelector" @click="onClick">
            <span>{{chosenOption}}</span>
            <i class="gg gg-chevron-down"></i>
        </div>`
    });

    Vue.component('toolbox-plot', {
        computed: {
            chosenOption() {
                return this.$root.current.layer ? 'Choose tile...' : 'Choose property...';
            },
            optionList() {
                if (this.$root.current.layer) {
                    return this.$root.current.layer.data.map;
                } else {
                    return this.$root.rootData;
                }
            },
            isCurrent() {
                if (this.$root.current.layer) {
                    return !this.$root.current.tile;
                } else {
                    return !this.$root.current.rootProp;
                }
            }
        },
        methods: {
            setToDefault() {
                if (this.$root.current.layer) {
                    this.$root.current.tile = null;
                } else {
                    this.$root.current.rootProp = null;
                }
                this.$root.states.isToolboxSelecting = false;
            }
        },
        template: `<div class="toolboxSelectorPlot">
            <div>
                <div :class="{ current: isCurrent }" @click="setToDefault">{{chosenOption}}</div>
                <hr v-if="optionList.length">
                <toolbox-option v-for="option in optionList" :model="option"></toolbox-option>
            </div>
        </div>`
    });

    Vue.component('toolbox-option', {
        props: ['model'],
        computed: {
            isCurrent() {
                if (this.$root.current.layer) {
                    return this.$root.current.tile === this.model;
                } else {
                    return this.$root.current.rootProp === this.model;
                }
            },
            visible() {
                return this.model.isActive || !this.$root.current.layer;
            }
        },
        methods: {
            onClick() {
                if (this.$root.current.layer) {
                    this.$root.current.tile = this.model;
                } else {
                    this.$root.current.rootProp = this.model;
                    this.model.isCollapsed = false;
                }
                this.$root.states.isToolboxSelecting = false;
            },
            onMouseEnter() {
                if (this.$root.current.layer) {
                    this.$root.setTileSelector(this.model);
                }
            },
            onMouseLeave() {
                if (this.$root.current.layer) {
                    this.$root.updateTileSelector();
                }
            },

        },
        template: `<div :class="{ current: isCurrent }" v-if="visible" @click="onClick" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">{{model.name}}</div>`
    });

    Vue.component('layer-element-header', {
        extends: groupHeader,
        methods: {
            removeElement() {
                if (this.model.isRemoveable) {
                    this.model.removeElement();
                    this.$root.onTileChanged();
                }
            }, 
            cloneElement() {
                if (this.model.isCloneable) {
                    const newElement = this.model.cloneElement(this.$root);
                    if (newElement) {
                        this.$root.onTileChanged();
                        this.$root.setMoveMode();
                        this.$root.current.tile = newElement;
                    }
                }
            }
        }
    });

    Vue.component('layer-tab-label', {
        props: ['layer'],
        computed: {
            tabClassName() {
                return `${this.layer.name}Tab`;
            },
            labelClass() {
                const classObject = {
                    current: this.$root.current.tab === this.tabClassName
                };
                classObject[this.tabClassName] = true;
                return classObject;
            },
            iconClass() {
                return `gg ${this.layer.icon}`;
            }
        },
        template: `
        <div :class="labelClass" :title="layer.title" :layer-name="layer.name">
            <i :class="iconClass"></i>
        </div>`
    });

    Vue.component('layer-element', {
        props: ['model'],
        mounted() {
            if (this.isCurrent) {
                setTimeout(() => {
                    this.$el.scrollIntoView({ block: 'center', inline: 'end', behavior: 'smooth' });
                });
            };
        },
        computed: {
            classObject: {
                get() {
                    return {
                        collapsed: this.model.isCollapsed && !this.isCurrent, 
                        current: this.isCurrent
                    }
                }
            },
            isCurrent: {
                get() {
                    return this.model === this.$root.current.tile;
                }
            }
        },
        methods: {
            onClick() {
                this.$root.current.tile = this.model;
            },
            onMouseEnter() {
                if (!this.isCurrent) {
                    this.$root.setTileSelector(this.model);
                }
            },
            onMouseLeave() {
                this.$root.updateTileSelector();
            }
        },
        watch: {
            'isCurrent': function () { 
                if (this.isCurrent) {
                    this.$el.scrollIntoView({ block: 'center', inline: 'end', behavior: 'smooth' });
                };
            }
        },
        template: `
        <div v-if="model.isActive" class="inputGroup" :class="classObject" @click="onClick" @mouseenter="onMouseEnter" @mouseleave="onMouseLeave">
            <layer-element-header :model="model"></layer-element-header>
            <div class="inputGroupBody" v-if="!model.isCollapsed || isCurrent">
                <position-field :model="model.position"></position-field>
                <hr v-if="model.properties.length">
                <component v-for="propModel in model.properties" :model="propModel" :is="propModel.field"></component>
            </div>
        </div>`
    });

    Vue.component('layer-div', {
        props: ['layer'],
        computed: {
            styleObject() {
                return `z-index: ${this.$root.layers.indexOf(this.layer)}`;
            }
        },
        template: `
        <div class="layer" :class="{ currentLayer: $root.current.layer && layer === $root.current.layer.data }" :style="styleObject">
            <layer-tile v-for="element in layer.map" :tile="element"></layer-tile>
        </div>`
    });

    Vue.component('layer-tile', {
        props: ['tile'],
        computed: {
            styleObject() {
                this.tile.isActive;
                this.tile.img;
                return `
                    top: calc(var(--cell-height-zoomed) * ${this.tile.position.value.y} * -1); 
                    left: calc(var(--cell-width-zoomed) * ${this.tile.position.value.x}); 
                    background-image: url(${this.tile.img});`;
            }
        },
        watch: {
            'tile.position.value.x': function () { this.$root.onTileChanged(this.tile); },
            'tile.position.value.y': function () { this.$root.onTileChanged(this.tile); }
        },
        template: `
        <div v-if="tile.isActive" class="layerTile" :style="styleObject"></div>`
    });

    Vue.component('tile-type-plate', {
        props: ['model'],
        computed: {
            styleObject() {
                return this.model.img ? `background-image: url(${this.model.img});` : '';
            },
            clearName() {
                const clearName = this.model.name.replace(/\#/g, '').trim();
                return `${clearName[0].toUpperCase()}${clearName.substring(1)}`;
            },
            selectMode() {
                return this.model.mode === this.$root.configs.tileModes.select;
            },
            moveMode() {
                return this.model.mode === this.$root.configs.tileModes.move;
            },
            eraseMode() {
                return this.model.mode === this.$root.configs.tileModes.erase;
            },
            isCurrent() {
                const modelData = this.model;
                const rootData = this.$root.currentTile.data;
                return modelData === rootData;
            }
        },
        methods: {
            selectTile() {
                this.$root.setCurrentTile(this.model, this.clearName);
            }
        },
        template: `
        <div :title="model.tooltip" :class="{ tileSelector: true, current: isCurrent }" @click="selectTile">
            <div class="tileImage" :style="styleObject">
                <i v-if="selectMode" class="gg gg-maximize"></i>
                <i v-if="moveMode" class="gg gg-controller"></i>
                <i v-if="eraseMode" class="gg gg-erase"></i>
            </div>
            <strong>{{clearName}}</strong>
            <i class="gg gg-check-o"></i>
        </div>`
    });

    Vue.component('export-button', {
        props: ['model'],
        methods: {
            exportProject() {
                this.$root.exportProject(this.model.callback, this.model.extension);
            }
        },
        template: `
        <button @click="exportProject">
            <i class="gg gg-enter"></i>
            <span>{{model.name}}</span>
        </button>`
    });
});