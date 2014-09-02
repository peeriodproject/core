/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiDaemon
* @implements core.ui.UiDaemonInterface
*/
var UiDaemon = (function () {
    function UiDaemon(gui, appQuitHandler) {
        this._menu = null;
        this._tray = null;
        this._tray = new gui.Tray({
            title: 'A'
        });

        this._menu = new gui.Menu();

        /*menu.append(new gui.MenuItem({
        type: 'separator'
        }));*/
        var quitItem = new gui.MenuItem({
            label: 'Quit'
        });

        quitItem.click = function () {
            appQuitHandler.quit();
        };

        this._menu.append(quitItem);

        this._tray.menu = this._menu;

        console.log('added ui deamon');
        /*if (process.env.UI_ENABLED) {
        App.quit();
        }
        else {
        setTimeout(function () {
        App.quit();
        }, 40000);
        }* /
        };
        */
    }
    UiDaemon.prototype.getTray = function () {
        return this._tray;
    };
    return UiDaemon;
})();

module.exports = UiDaemon;
//# sourceMappingURL=UiDaemon.js.map
