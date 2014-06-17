/// <reference path='./main.d.ts' />

import gui = require('nw.gui');
import App = require('./core/App');

var logger = require('./core/utils/logger/LoggerFactory').create();

App.start(gui, gui.App, gui.App.dataPath, gui.Window.get());

// lifetime > 5 min < 1 day
/*var minSeconds:number = 300;
var maxSeconds:number = 86400;
var lifeTime = Math.max(minSeconds * 1000, Math.random() * maxSeconds * 1000);

setTimeout(function () {
	logger.info('quitting...');

	setTimeout(function () {
		gui.App.quit();
	}, 100);
}, lifeTime);*/


var tray = new gui.Tray({
        title: 'App',
        icon: 'icon.png'
    }),
    menu = new gui.Menu();

// Give it a menu
var addFolderItem = new gui.MenuItem({
	label: 'Add Folder'
});

addFolderItem.click = function () {
	alert('clicked');
};

menu.append(addFolderItem);

menu.append(new gui.MenuItem({
    type: 'separator'
}));

menu.append(new gui.MenuItem({
    label: 'Quit'
}));
menu.items[menu.items.length - 1].click = function() {
    //console.log('bye bye');
    App.quit();
};

tray.menu = menu;