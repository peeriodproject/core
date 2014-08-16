/// <reference path='../../../ts-definitions/node/node.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiDeamon
* @implements core.ui.UiDeamonInterface
*/
var UiDeamon = (function () {
    function UiDeamon(gui, appQuitHandler) {
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
    return UiDeamon;
})();

module.exports = UiDeamon;
//# sourceMappingURL=UiDeamon.js.map
