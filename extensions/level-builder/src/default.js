// TODO:
// добавить функционал редактирования конфигов и путей
// добавить попапы

'use strict';

const fs = require('fs');
const fs_path = require('path');

const Vue = require('./helpers/vue');
const UiComponent = require('./helpers/uiComponentHelper');
const InputComponent = require('./helpers/inputComponentHelper');
const LayerElement = require('./helpers/layerElementHelper');
const Exporter = require('./helpers/exportHelper');

const defaultProject = require('../src/configs/defaultProject.json');
const mainConfig = require('../src/configs/main.json');

const mainComponent = Vue.extend({
    data() {
        return {
            states: {
                mouseLeftHold: false,
                mouseRightHold: false,
                mouseLastDownCoords: null,

                gridIsActive: true,
                fieldBordersIsActive: true,

                rightPanelOpened: false,
                exportPopupOpened: false,

                layerListMode: false,
                isToolboxSelecting: false,

                smartSaveMode: true,
                blured: false
            },
            style: {
                cell: {
                    width: 25,
                    height: 25
                },
                field: {
                    size: {
                        left: 0,
                        right: 0,
                        up: 0,
                        down: 0,
                    },
                    offset: 25,
                    zoom: 1
                },
                tag: null
            },
            pointer: { x: 0, y: 0 },
            tileSelector: null,
            current:{
                tab: null,
                tile: null,
                layer: null,
                tileData: {},
                rootProp: null
            },
            project: {
                name: '',
                enums: {}
            },
            configs: null,
            rootData: [],
            layers: [],
            exportMethods: Exporter.methods
        };
    },
    beforeMount() {
        this.loadProject(defaultProject);
        console.log(this);
    },
    mounted() {
        this.onLoad();
    },
    computed: {
        appClassObject: {
            get() {
                return {  
                    isMovingTile: this.current.tile !== null && this.currentTile && this.currentTile.mode === this.configs.tileModes.move,
                    isToolboxSelecting: this.states.isToolboxSelecting && !this.states.layerListMode,
                    leftPanelOpened: this.current.tab !== null,
                    rightPanelOpened: this.states.rightPanelOpened, 
                    exportPopupOpened: this.states.exportPopupOpened,
                    blured: this.states.blured
                }
            }
        },
        fieldZoom: {
            get() {
                return this.style.field.zoom;
            },
            set(value) {
                this.style.field.zoom = value;
            }
        },
        fieldWidth: {
            get() {
                return this.style.field.size.left + this.style.field.size.right + 1;
            }
        },
        fieldHeight: {
            get() {
                return this.style.field.size.up + this.style.field.size.down;
            }
        },
        cellWidthZoomed: {
            get() {
                return this.style.field.zoom * this.style.cell.width;
            }
        },
        cellHeightZoomed: {
            get() {
                return this.style.field.zoom * this.style.cell.height;
            }
        },
        currentTile: {
            get() {
                this.current.tile; // hack to update this counted prop
                this.states.rightPanelOpened; // hack to update this counted prop

                const layer = this.current.layer;
                return layer ? this.current.tileData[this.current.layer.name] : null;
            },
            set(value) {
                this.current.tileData[this.current.layer.name] = value;
            }
        },
        layerListModeTogglerTitle: {
            get() {
                return `Change to ${this.states.layerListMode ? 'selectbox' : 'list'} view`;
            }
        }
    },
    methods: {
        init() {
            // init paths
            Object.keys(this.configs.paths).forEach(key => {
                this.configs.paths[key] = fs_path.join(Editor.Project.path, this.configs.paths[key]);
            });
            // init enums
            this.project.enums = {};
            if (fs.existsSync(this.configs.paths.enums)) {
                this.collectEnums(this.configs.paths.enums);
            }
            // init anyTypes
            this.configs.anyTypes = JSON.parse(JSON.stringify(mainConfig.anyTypes));
            if (Object.keys(this.project.enums).length === 0) {
                this.configs.anyTypes = this.configs.anyTypes.filter(t => t !== 'Enum');
            }
            // init defaultTileData
            Object.keys(this.configs.defaultTileData).forEach(key => {
                this.configs.defaultTileData[key].mode = this.configs.tileModes[key];
                this.configs.defaultTileData[key].data.mode = this.configs.tileModes[key];
            });
            // init errorImg
            this.configs.errorImg = fs_path.join(__dirname, this.configs.errorImg).replace(/\\/g, '/');
            // init layers
            this.layers = [];
            this.configs.layers.forEach(layer => {
                this.layers.push({
                    name: layer.name,
                    title: layer.title,
                    icon: layer.icon,
                    map: []
                });
            });

            // init rootData
            this.rootData = LayerElement.buildSchema(this.configs.rootSchema, this.project.enums);
            
            // check schema images
            this.configs.elementSchemas.forEach(schema => {
                schema.img = fs_path.join(this.configs.paths.assets, schema.img).replace(/\\/g, '/');
                if (!fs.existsSync(schema.img)) {
                    schema.tooltip = `Tile img "${schema.img}" not found.`;
                    schema.img = this.configs.errorImg;
                }
            });

            // init states
            this.states.mouseLeftHold = false;
            this.states.mouseRightHold = false;
            this.states.mouseLastDownCoords = null;
            this.states.rightPanelOpened = false;
            this.states.exportPopupOpened = false;
            this.states.isToolboxSelecting = false;
        },
        onLoad() {
            this.countFieldSize();
            this.updateStyleTag();
            setTimeout(() => {
                this.scrollToCenter();
                this.tileSelector = null;
            }, 0);
        },
        loadProject(projectData, name = 'Unnamed project') {
            this.project.name = name;

            this.current.tab = null;
            this.current.tile = null;
            this.current.layer = null;
            this.current.tileData = {};
            this.current.rootProp = null;
    
            this.tileSelector = null;
            this.pointer = { x: 0, y: 0 };
    
            this.configs = LayerElement.cloneObject(mainConfig);
    
            if (projectData instanceof Object) {
                if (projectData.paths instanceof Object) {
                    this.configs.paths.assets = projectData.paths.assets || mainConfig.path.assets;
                    this.configs.paths.enums = projectData.paths.enums || mainConfig.path.enums;
                } 
                if (projectData.rootSchema instanceof Object) {
                    this.configs.rootSchema = LayerElement.cloneObject(projectData.rootSchema);
                }
                if (projectData.elementSchemas instanceof Object) {
                    this.configs.elementSchemas = LayerElement.cloneObject(projectData.elementSchemas);
                }
            
                this.init();
                
                if (Array.isArray(projectData.layersData)) {
                    this.layers = [];
                    projectData.layersData.forEach(layer => {
                        const layerModel = {
                            name: layer.name,
                            title: layer.title,
                            icon: layer.icon,
                            map: []
                        };
    
                        if (Array.isArray(layer.map)) {
                            layer.map.forEach(el => {
                                const elementSchema = this.configs.elementSchemas.find(sch => sch.layer === layer.name && sch.name === el.type);
                                if (elementSchema) {
                                    layerModel.map.push(new LayerElement(el, elementSchema, layerModel.map, this.project.enums));
                                }
                            });
                        }
    
                        this.layers.push(layerModel);
                        this.current.tileData[layer.name] = this.configs.defaultTileData.select;
                    });
                }

                this.rootData = LayerElement.buildSchema(this.configs.rootSchema, this.project.enums, projectData.rootData);
            } else {
                this.init();
                this.rootData = LayerElement.buildSchema(this.configs.rootSchema, this.project.enums);
            }
        },
        updateStyleTag() {
            const field = this.style.field;
            const cell = this.style.cell;
            const pointer = this.pointer;

            const styleTag = this.style.tag || document.createElement('STYLE');
            this.style.tag = styleTag;
            styleTag.innerHTML = `
                div#app{ 
                    --cell-width: ${cell.width}px; 
                    --cell-height: ${cell.height}px; 
                    --cell-width-zoomed: ${this.cellWidthZoomed}px;
                    --cell-height-zoomed: ${this.cellHeightZoomed}px;

                    --field-width: ${this.fieldWidth - 1}; 
                    --field-height: ${this.fieldHeight}; 
                    --field-left: ${field.size.left}; 
                    --field-right: ${field.size.right}; 
                    --field-up: ${field.size.up}; 
                    --field-down: ${field.size.down}; 
                    --field-zoom: ${field.zoom}; 
                    --field-offset: ${field.offset}; 

                    --pointer-x: calc(var(--cell-width-zoomed) * ${pointer.x});
                    --pointer-y: calc(var(--cell-height-zoomed) * ${pointer.y} * -1);

                    --current-tile-img: ${ this.currentTile && this.currentTile.data.img ? `url(${ this.currentTile.data.img })` : 'none'};
                    --current-tile-left: calc(var(--cell-width-zoomed) * ${ this.tileSelector ? this.tileSelector.x : 0 });
                    --current-tile-top: calc(var(--cell-height-zoomed) * ${ this.tileSelector ? this.tileSelector.y : 0 } * -1);
                }
            `;
            this.$el.parentNode.appendChild(styleTag);
        },
        updateTileSelector() {  
            if (this.current.tile instanceof LayerElement) { 
                this.tileSelector ={
                    x: +this.current.tile.position.value.x, 
                    y: +this.current.tile.position.value.y
                };
            } else {
                this.current.tile = null;
                this.tileSelector = null;
            }
        },
        updateScrolling(x, y) {
            const scroll = { x: this.$el.scrollLeft, y: this.$el.scrollTop };
            this.$el.scroll(scroll.x + x * this.cellWidthZoomed, scroll.y + y * this.cellHeightZoomed);
        },
        scrollToCenter() {
            const elW = this.$el.offsetWidth;
            const elH = this.$el.offsetHeight;
            const field = this.style.field;

            this.$el.scroll((field.size.left + field.offset) * this.cellWidthZoomed - elW / 2, (field.size.up + field.offset) * this.cellHeightZoomed - elH / 2);
        },
        toggleZoom(increment) {
            this.fieldZoom = Math.round(Math.max(.1, this.fieldZoom + (increment ? .1 : -.1)) * 10) / 10;
        },
        toggleExportPopup() {
            this.states.exportPopupOpened = !this.states.exportPopupOpened;
            if (this.states.rightPanelOpened) {
                this.states.rightPanelOpened = false;
            }
        },
        toggleRightPanel() {
            this.states.rightPanelOpened = !this.states.rightPanelOpened;
            if (this.states.exportPopupOpened) {
                this.states.exportPopupOpened = false;
            }
        },
        toggleGrid() {
            this.states.gridIsActive = !this.states.gridIsActive;
        },
        toggleFieldBorders() {
            this.states.fieldBordersIsActive = !this.states.fieldBordersIsActive;
        },
        toggleLayerListMode() {
            this.states.layerListMode = !this.states.layerListMode;
        },
        toggleToolboxSelector() {
            this.states.isToolboxSelecting = !this.states.isToolboxSelecting;
        },
        toggleSmartSaveMode() {
            this.states.smartSaveMode = !this.states.smartSaveMode;
        },
        changeTab(event) {
            if (event && event.path) {
                const tabsIndex = event.path.indexOf(this.$refs.tabs);
                if (tabsIndex > 0) {
                    const tabLabel = event.path[tabsIndex - 1];
                    const currentTab = [...tabLabel.classList].filter(c => c !== 'current').join('');
                    this.current.tab = this.current.tab === currentTab ? null : currentTab;
                    this.current.tile = null;

                    this.current.layer = null;
                    if (tabLabel.hasAttribute('layer-name')) {
                        const layerName = tabLabel.getAttribute('layer-name');
                        const layerData = this.layers.find(l => l.name === layerName);
                        const layerSchemas = this.configs.elementSchemas.filter(schema => schema.layer === layerName);

                        if (layerData) this.current.layer = {
                            name: layerName,
                            data: layerData,
                            schemas: [
                                this.configs.defaultTileData.select.data,
                                this.configs.defaultTileData.move.data,
                                this.configs.defaultTileData.erase.data
                            ].concat(layerSchemas)
                        };
                    };
                }
            }
        },
        getMouseCoords(e) {
            if(e.target.closest('.workplace')){
                const target = e.target.closest('.workplace'); 
                
                const targetCoords = target.getBoundingClientRect();
                const xCoord = e.clientX - targetCoords.left;
                const yCoord = e.clientY - targetCoords.top;
              
                return { x: xCoord, y: yCoord };
            }
        },
        onMouseMove(e) {
            const coords = this.getMouseCoords(e);
            if (this.states.mouseRightHold) {
                const delta = { 
                    x: this.states.mouseLastDownCoords.x - coords.x,
                    y: this.states.mouseLastDownCoords.y - coords.y
                }
                
                this.states.mouseLastDownCoords = coords;

                const scroll = { x: this.$el.scrollLeft, y: this.$el.scrollTop };
                if (Math.abs(delta.x) >= 10) scroll.x += delta.x;
                if (Math.abs(delta.y) >= 10) scroll.y += delta.y;

                this.$el.scroll(scroll.x, scroll.y);
            }

            this.pointer.x = Math.floor(coords.x / (this.style.cell.width * this.style.field.zoom)) - (this.style.field.offset + this.style.field.size.left);
            this.pointer.y = (Math.floor(coords.y / (this.style.cell.height * this.style.field.zoom)) - (this.style.field.offset + this.style.field.size.up)) * -1 - 1;
        
            if (this.current.tile && this.currentTile.mode === this.configs.tileModes.move) {
                this.current.tile.position.setValue({ 
                    x: this.pointer.x,
                    y: this.pointer.y
                });
            }

            if (this.states.mouseLeftHold && (coords.x !== this.states.mouseLastDownCoords.x || coords.y !== this.states.mouseLastDownCoords.y)) {
                this.onMouseDown(e);
            }
        },
        onMouseDown(e) {
            switch(e.which) {
                case 1:
                    this.states.mouseLastDownCoords = this.getMouseCoords(e);
                    this.states.mouseLeftHold = true;

                    if (this.current.layer) {
                        const targetTile = this.current.layer.data.map.find(el => {
                            const eltPos = el.position.value; 
                            return +eltPos.x === this.pointer.x && +eltPos.y === this.pointer.y;
                        });

                        switch (this.currentTile.mode) {
                            case this.configs.tileModes.select: {
                                if (targetTile) this.current.tile = targetTile;
                            } break;
                            case this.configs.tileModes.move: {
                                if (this.current.tile) {
                                    this.current.tile = null;
                                    this.onTileChanged();
                                } else if (targetTile) {
                                    this.current.tile = targetTile;
                                }
                            } break;
                            case this.configs.tileModes.erase: {
                                if (targetTile) {
                                    targetTile.removeElement();
                                    this.onTileChanged();
                                }
                                this.current.tile = null;
                            } break;
                            case this.configs.tileModes.add: {
                                const element = { 
                                    type: this.currentTile.data.name, 
                                    position: {
                                        x: this.pointer.x,
                                        y: this.pointer.y
                                    }
                                };
                                const tileData = this.currentTile.data;
                                const elementSchema = this.configs.elementSchemas.find(sch => sch.layer === tileData.layer && sch.name === tileData.name);
                                if (elementSchema) {
                                    const newElement = new LayerElement(element, elementSchema, this.current.layer.data.map, this.project.enums);
                                    
                                    if (targetTile) {
                                        targetTile.replaceElement(newElement);
                                    } else {
                                        this.current.layer.data.map.push(newElement);
                                    }

                                    this.onTileChanged(newElement);
                                    this.current.tile = newElement;
                                }
                            } break;
                        }
                    }
                    break;
                case 3:
                    this.states.mouseLastDownCoords = this.getMouseCoords(e);
                    this.states.mouseRightHold = true;
                    break;
            }
        },
        onMouseUp(e) {
            this.states.mouseLastDownCoords = null;
            switch(e.which) {
                case 1:
                    this.states.mouseLeftHold = false;
                    break;
                case 3:
                    this.states.mouseRightHold = false;
                    break;
            }
        },
        countFieldSize() {
            const min = { x: 0, y: 0 };
            const max = { x: 0, y: 0 };

            this.layers.forEach(layer => {
                layer.map.forEach(el => {
                    if (el.isActive) {
                        min.x = Math.min(min.x, +el.position.value.x);
                        min.y = Math.min(min.y, +el.position.value.y);
                        
                        max.x = Math.max(max.x, +el.position.value.x);
                        max.y = Math.max(max.y, +el.position.value.y);
                    }
                });
            });

            const newLeft = Math.abs(min.x);
            const newUp = max.y + 1;
            const fieldSize = this.style.field.size;

            this.updateScrolling(newLeft - fieldSize.left, newUp - fieldSize.up);

            fieldSize.left = newLeft;
            fieldSize.right = max.x;
            
            fieldSize.down = Math.abs(min.y);
            fieldSize.up = newUp;
        }, 
        onTileChanged(tile = null) {
            if (tile) {
                this.tileSelector = {
                    x: +tile.position.value.x,
                    y: +tile.position.value.y
                };
            }
            this.countFieldSize();
        },
        setCurrentTile(tileData, clearName) {
            if (this.current.layer) {
                this.currentTile = {
                    name: clearName,
                    data: tileData,
                    mode: tileData.mode || this.configs.tileModes.add
                };

                this.states.rightPanelOpened = false;
                this.current.tile = null;
                
                this.onTileChanged();
                this.updateStyleTag();
            }
        },
        setMoveMode() {
            this.setCurrentTile(
                this.current.layer.schemas.find(schema => schema.mode === this.configs.tileModes.move), 
                'Move mode'
            );
        },
        setTileSelector(model) {
            this.tileSelector = {
                x: +model.position.value.x,
                y: +model.position.value.y,
            };
        },
        collectEnums(directory) {
            const plot = fs.readdirSync(directory, { withFileTypes: true });
            if (plot) {
                plot.forEach((file) => {
                    const url = fs_path.join(directory, file.name);
                    const extension = fs_path.extname(file.name);
                    const clearName = file.name.replace(extension, '');

                    if (file.isDirectory()) {
                        this.collectEnums(url);
                    } else if (['.js', '.ts'].includes(extension)) {
                        const data = fs.readFileSync(url);
                        if (data) {
                            switch(extension) {
                                case '.js': {
                                    const matches = data.toString().match(/\w*\s*\:\s*\d*/gs);
                                    if (matches) {
                                        this.project.enums[clearName] = matches.reduce((pv, el) => {
                                            const keyValue = el.split(':');
                                            if (keyValue.length > 1) {
                                                pv[keyValue[0].trim()] = +keyValue[1];
                                            }
                                            return pv;
                                        }, {});
                                    }
                                } break;
                                case '.ts': {
                                    const matches = data.toString().match(/\w*\s*\,/gs);
                                    if (matches) {
                                        this.project.enums[clearName] = matches.reduce((pv, el, i) => {
                                            const keyValue = el.split(',');
                                            pv[keyValue[0].trim()] = i;
                                            return pv;
                                        }, {});
                                    }
                                } break;
                            }
                            
                        }
                    }
                });
            }
        },
        exportProject(callback, extension = 'json') {
            let result = null;
            let resultExt = extension;
            let allowAllTypes = true;
            Vue.nextTick(() => {
                this.states.blured = true;

                if (callback instanceof Function) {
                    result = callback(this);
                } else {
                    result = Exporter.saveProject(this);
                    resultExt = 'tlp';
                    allowAllTypes = false;
                }

                if (result) {
                    const dialogOptions = {
                        title: 'Select file',
                        filters: [
                            { name: 'Tile projects', extensions: [resultExt] },
                        ]
                    };
                    const lastFolder = localStorage.getItem('lastExportFolder');

                    if (lastFolder) {
                        dialogOptions.defaultPath = lastFolder;
                    }
                    if (allowAllTypes) {
                        dialogOptions.filters.push({ name: 'All types', extensions: ['*'] })
                    }

                    Editor.Dialog.save(dialogOptions)
                        .then((data) => { 
                            if (!data.canceled && data.filePath) {
                                const clearPath = data.filePath.replace(/\\/g, '/');
                                if (this.states.smartSaveMode) {
                                    const filePlot = fs.readFileSync(clearPath, 'utf8');
                                    if (filePlot) {
                                        try {
                                            const fileData = JSON.parse(filePlot.toString());
                                            Object.keys(fileData).forEach(key => {
                                                if (result.hasOwnProperty(key)) {
                                                    fileData[key] = result[key];
                                                }
                                            });
                                            fs.writeFileSync(clearPath, JSON.stringify(fileData, null, 2));
                                        } catch(ex) {
                                            console.log('Unable to parse this file as JSON. Disable "Smart save mode" or choose another file.');
                                        }
                                    }
                                } else {
                                    fs.writeFileSync(clearPath, JSON.stringify(result, null, 2));
                                }
                                alert('Done');

                                localStorage.setItem('lastExportFolder', fs_path.dirname(clearPath));
                            } 
                        })
                        .finally(() => {
                            this.states.blured = false;
                        });
                } else {
                    this.states.blured = false;
                }
            });
        },
        openProject() {
            this.states.blured = true;

            Vue.nextTick(() => {
                const dialogOptions = {
                    title: 'Select project',
                    filters: [
                        { name: 'Tile projects', extensions: ['tlp'] }
                    ]
                };
                const lastFolder = localStorage.getItem('lastImportFolder');

                if (lastFolder) {
                    dialogOptions.defaultPath = lastFolder;
                }

                Editor.Dialog.select(dialogOptions)
                    .then((data) => { 
                        if (!data.canceled && data.filePaths.length) {
                            const clearPath = data.filePaths[0].replace(/\\/g, '/');
                            const projectData = JSON.parse(fs.readFileSync(clearPath, 'utf8').toString());
                            this.loadProject(projectData, clearPath);
                            this.onLoad();

                            localStorage.setItem('lastImportFolder', fs_path.dirname(clearPath));
                        } 
                    })
                    .finally(() => {
                        this.states.blured = false;
                    });
            });
        }
    },
    watch: {
        'style.cell.width': function () { this.updateStyleTag() },
        'style.cell.height': function () { this.updateStyleTag() },
        'style.field.size.left': function () { this.updateStyleTag() },
        'style.field.size.right': function () { this.updateStyleTag() },
        'style.field.size.up': function () { this.updateStyleTag() },
        'style.field.size.down': function () { this.updateStyleTag() },
        'style.field.zoom': function () { this.updateStyleTag() },
        'pointer.x': function () { this.updateStyleTag() },
        'pointer.y': function () { this.updateStyleTag() },
        'tileSelector': function () { this.updateStyleTag() },
        'current.tile': function () { this.updateTileSelector() },
        'states.layerListMode': function () { 
            if (this.states.layerListMode) {
                this.states.isToolboxSelecting = false;
            } 
        }
    }
});

// html text
exports.template = fs.readFileSync(fs_path.join(__dirname, '../static/template/default/index.html'), 'utf8');
// style text
exports.style = `
    ${fs.readFileSync(fs_path.join(__dirname, '../static/style/default/index.css'), 'utf8')}
    ${fs.readFileSync(fs_path.join(__dirname, '../static/style/default/icons.css'), 'utf8')}
`;
// html selector after rendering
exports.$ = {
    app: '#app'
};
// method on the panel
exports.methods = {};
// event triggered on the panel
exports.listeners = {};

// Triggered when the panel is rendered successfully
exports.ready = async function() {
    if (this.$.app) {
        const mc = new mainComponent();
        mc.$mount(this.$.app);
        
        document.body.addEventListener('keydown', function (event) {
            if (mc.current.tile) {
                // clone shortcut
                if (event.ctrlKey && event.key === 'd') {
                    mc.current.tile.cloneElement(mc);
                }
                // delete shortcut
                if (event.ctrlKey && (event.key === 'Backspace' || event.key === 'Delete')) {
                    mc.current.tile.removeElement();
                }
            }

            // open shortcut
            if (event.ctrlKey && event.key === 'o') {
                mc.openProject();
            }
            // save shortcut
            if (event.ctrlKey && event.key === 's') {
                if (!mc.states.exportPopupOpened) {
                    mc.toggleExportPopup();
                }
            }
        });
    }
};
// Triggered when trying to close the panel
exports.beforeClose = async function() {};
// Triggered when the panel is actually closed
exports.close = async function() {};