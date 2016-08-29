var ns = process.argv[2];
var fs = require('fs');
var json = require('./' + ns +'.json');
var i18n = require('i18next');
var _ = require('lodash');

var createRibbons = null;
var app = null;

console.log('Loading yasoon core api...');
fs.readdirSync('./core').forEach(function(file) {
    if (file.endsWith('js')) {
        var coreLib = fs.readFileSync('./core/' + file)+'';
        coreLib = coreLib.replace(/native function .*?\(\);.?return .*?\(.*?\);(?:}\))?/g, '');
        eval.apply(global, [coreLib]);
    }
});

yasoon.app.load = function(ns, obj) {
    app = obj;
};

yasoon.addHook = function(hookName, cbk) {
    if (hookName === 'CreateRibbons') {
        console.log('CreateRibbons hook found!');
        createRibbons = cbk;
    }
};

yasoon.feed.addFilter = function() {
};

if (fs.statSync('./' + ns + '/locale/en.json').isFile()) {
    var enRes = require('./' + ns + '/locale/en.json');
    i18n.init({
        lng: 'en',
        resources: enRes
    });

    yasoon.i18n = function(key) {
        return i18n.t(key);
    };
}

console.log('Loading app files...');
json.files.forEach(function(element) {
    if (element.endsWith('js')) {
        console.log('  --> ' + element);
        eval.apply(global, [fs.readFileSync('./' + ns + '/' + element)+'']);
    }
});

console.log('Initialising app...');
app.init();

var explorerRibbons = {};
var ribbonFactory = {
    create: function(ribbonObj) {
        if (ribbonObj.renderTo.indexOf('Microsoft.Outlook.Explorer') >= 0) {
            explorerRibbons[ribbonObj.type] = _.merge(explorerRibbons[ribbonObj.type], ribbonObj);
        }
    }
}

var renderNode = function(node) {
    
}

if (createRibbons) {
    createRibbons(ribbonFactory);
    
    var xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<customUI xmlns="http://schemas.microsoft.com/office/2009/07/customui" onLoad="Ribbon_onLoad">');
    _.forOwn(explorerRibbons, function(value, key) {
        xml += renderNode(value);
    });
    xml += '</customUI>';

    console.log(xml);
}
else {
    console.log('CreateRibbons hook not found.. exiting');
}