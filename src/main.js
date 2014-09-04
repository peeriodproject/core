/// <reference path='./main.d.ts' />
var path = require('path');
var usage = require('usage');
var gui;

try  {
    gui = require('nw.gui');
} catch (e) {
    //console.log('node runner');
}

//var logger = require('./core/utils/logger/LoggerFactory').create('/Volumes/HDD/logs/');
var App = require('./core/App');

var logger = require('./core/utils/logger/LoggerFactory').create();

var language;
try  {
    language = window && window.navigator;
} catch (e) {
    language = 'en';
}

App.setLocale(language);
App.setConfigPath('../../config/environmentConfig.json');

var guiApp = gui && gui.App ? gui.App : {
    quit: function () {
        process.exit();
    }
};

var dataPath = null;

if (gui && gui.App) {
    dataPath = gui.App.dataPath;
    process.env.IS_NODE_WEBKIT = true;
} else {
    dataPath = path.resolve('./appDataFolder');
}

var guiWindow = gui && gui.Window ? gui.Window.get() : null;

var logUsageTimeout = null;

var createUsageTimeout = function () {
    logUsageTimeout = setTimeout(function () {
        usage.lookup(process.pid, function (err, result) {
            if (err) {
                return;
            }

            logger.log('usage', 'current cpu and memory usage', result);
        });
        logUsageTimeout = null;

        createUsageTimeout();
    }, 10000);
};

var _tray = null;

//createUsageTimeout();
App.start(gui, guiApp, dataPath, guiWindow);
_tray = App.getTray();
/*
// lifetime > 5 min < 1 day
var minSeconds:number = 30;//300;
var maxSeconds:number =120;//86400;
var lifeTime = Math.max(minSeconds * 1000, Math.random() * maxSeconds * 1000);
setTimeout(function () {
logger.info('quitting...');
return process.nextTick(function () {
gui.App.quit();
});
}, lifeTime);
*/
//# sourceMappingURL=main.js.map
