/// <reference path='./main.d.ts' />

var gui = require('nw.gui');
//var logger = require('./core/utils/logger/LoggerFactory').create('/Volumes/HDD/logs/');

import App = require('./core/App');

//var logger = require('./core/utils/logger/LoggerFactory').create();

App.setLocale(window.navigator.language);
App.setConfigPath('../../config/environmentConfig.json');
App.start(gui, gui.App, gui.App.dataPath, gui.Window.get());

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
/*
var tray = new gui.Tray({
        title: 'A',
        icon: 'icon.png'
    }),
    menu = new gui.Menu();

/*menu.append(new gui.MenuItem({
    type: 'separator'
}));* /
var quitItem = new gui.MenuItem({
	label: 'Quit'
});

quitItem.click = function() {
	App.quit();

	/*if (process.env.UI_ENABLED) {
		App.quit();
	}
	else {
		setTimeout(function () {
			App.quit();
		}, 40000);
	}* /
};

menu.append(quitItem);

tray.menu = menu;*/
