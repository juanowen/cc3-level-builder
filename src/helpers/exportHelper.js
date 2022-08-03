const exportMethods = {
    saveProject: (project) => {
        return {
            rootData: project.rootData.map(m => { 
                return { 
                    name: m.name, 
                    type: m.type, 
                    value: m.getValue() 
                } 
            }),
            layersData: project.layers.map(l => { 
                return { 
                    name: l.name, 
                    title: l.title, 
                    icon: l.icon, 
                    map: l.map.filter(el => el.isActive).map(el => {
                        return {
                            type: el.type,
                            position: el.position.getValue(),
                            properties: el.properties.map(p => {
                                return { 
                                    name: p.name, 
                                    type: p.type, 
                                    value: p.getValue() 
                                } 
                            })
                        }
                    })
                } 
            }),
            rootSchema: project.rootData.map(m => { 
                return { 
                    name: m.name, 
                    type: m.type 
                } 
            }),
            elementSchemas: project.configs.elementSchemas.map(s => {
                return {
                    name: s.name,
                    layer: s.layer,
                    img: s.img.replace(project.configs.paths.assets.replace(/\\/g, '/'), ''),
                    tooltip: s.tooltip,
                    properties: s.properties
                }
            }),
            paths: Object.keys(project.configs.paths).reduce((pv, key) => {
                pv[key] = project.configs.paths[key].replace(Editor.Project.path, '').replace(/\\/g, '/');
                return pv;
            }, {})
        };
    },
    methods: [
        {
            name: 'Export as array of types',
            extension: 'json',
            callback: (project) => {
                const result = { 
                    levelInfo: {
                        levelWidth: project.fieldWidth,
                        levelHeight: project.fieldHeight,
                        tileWidth: project.style.cell.width,
                        tileHeight: project.style.cell.height
                    }
                };
                
                project.layers.forEach(l => {
                    const layerArray = [];
                    const size = project.style.field.size
                    for (let y = -size.down; y < size.up; y++) {
                        for (let x = -size.left; x <= size.right; x++) {
                            const tile = l.map.find(t => t.isActive && +t.position.value.x === x && +t.position.value.y === y);
                            layerArray.push(tile ? tile.type : 'None');
                        }
                    }
                    result.levelInfo[l.name] = layerArray;
                });

                project.rootData.forEach(m => { 
                    result[m.name] = m.getValue();
                });

                return result;
            } 
        },
        {
            name: 'Export as object with props',
            extension: 'json',
            callback: (project) => {
                const result = { 
                    levelInfo: {
                        tileWidth: project.style.cell.width,
                        tileHeight: project.style.cell.height
                    }
                };

                project.layers.forEach(l => {
                    result.levelInfo[l.name] = l.map.filter(el => el.isActive).map(el => {
                        return { 
                            type: el.type,
                            position: el.position.getValue,
                            properties: el.properties.reduce((pv, m) => {
                                pv[m.name] = m.getValue();
                                return pv;
                            }, {})
                        };
                    });
                });
                
                project.rootData.forEach(m => { 
                    result[m.name] = m.getValue();
                });

                return result;
            } 
        }
    ]
};

!(function (e, t) {
    'object' == typeof exports && 'undefined' != typeof module
        ? (module.exports = t)
        : 'function' == typeof define && define.amd
        ? define(t)
        : ((e = e || self).inputModels = t);
})(this, exportMethods);