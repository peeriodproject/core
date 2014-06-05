/// <reference path='./main.d.ts' />
var gui = require('nw.gui');
var logger = require('./core/utils/logger/LoggerFactory').create();

var App = require('./core/App');

App.start(gui.App.dataPath, gui.Window.get());

// lifetime > 5 min < 1 day
var minSeconds = 60;
var maxSeconds = 180;

var lifeTime = Math.max(minSeconds * 1000, Math.random() * maxSeconds * 1000);
setTimeout(function () {
    logger.info('quitting...');

    setTimeout(function () {
        gui.App.quit();
    }, 100);
}, lifeTime);
/*import gui = require('nw.gui');
var tray = new gui.Tray({
title: 'Tray',
icon: 'icon.png'
}),
menu = new gui.Menu();
// Give it a menu
menu.append(new gui.MenuItem({
label: 'foo bar'
}));
menu.append(new gui.MenuItem({
type: 'separator'
}));
menu.append(new gui.MenuItem({
label: 'Quit'
}));
menu.items[menu.items.length - 1].click = function() {
console.log('bye bye');
gui.App.quit();
};
tray.menu = menu;*/
//# sourceMappingURL=main.js.map
