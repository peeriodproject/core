/**
 * Created by joernroeder on 4/21/14.
 */

/// <reference path='./main.d.ts' />

import gui = require('nw.gui');

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

tray.menu = menu;