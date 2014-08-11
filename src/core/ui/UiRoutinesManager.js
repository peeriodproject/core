/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

/**
* @class core.ui.UiRoutinesManager
* @implements core.ui.UiRoutinesManagerInterface
*/
var UiRoutinesManager = (function () {
    function UiRoutinesManager(gui) {
        var _this = this;
        this._isOpen = false;
        this._loaded = false;
        this._routines = [];
        this._window = null;
        this._window = gui.Window.open('./public/ui-routines-installer.html', {
            position: 'center',
            width: 720,
            height: 400,
            frame: true,
            toolbar: false,
            resizable: true,
            show: false
        });

        this._window.once('loaded', function () {
            //this._window.showDevTools();
            //this._window.moveBy(0, 200);
            //this._updateStatus();
            _this._updateWindow();

            _this._loaded = true;

            if (_this._isOpen) {
                _this.open();
            }
        });
    }
    UiRoutinesManager.prototype.addUiRoutine = function (routine) {
        if (this.getUiRoutine(routine.getId()) === null) {
            this._routines.push(routine);
        }
    };

    UiRoutinesManager.prototype.close = function () {
        this._window.close(true);

        //this._window.hide();
        this._isOpen = false;
    };

    UiRoutinesManager.prototype.getInstalledRoutineIds = function (callback) {
        var _this = this;
        var installedRoutines = [];
        var returned = 0;
        var checkAndReturn = function () {
            if (returned === _this._routines.length) {
                returned = -1;

                return callback(null, installedRoutines);
            }
        };

        this._routines.forEach(function (routine) {
            routine.isInstalled(function (isInstalled) {
                if (isInstalled) {
                    installedRoutines.push(routine.getId());
                }

                returned++;

                return checkAndReturn();
            });
        });
        //return process.nextTick(callback.bind(null, null, []));
    };

    UiRoutinesManager.prototype.getUiRoutines = function () {
        return this._routines.slice();
    };

    UiRoutinesManager.prototype.getUiRoutine = function (routineId) {
        for (var i = 0, l = this._routines.length; i < l; i++) {
            if (this._routines[i].getId() === routineId) {
                return this._routines[i];
            }
        }

        return null;
    };

    UiRoutinesManager.prototype.isOpen = function () {
        return this._isOpen;
    };

    UiRoutinesManager.prototype.open = function () {
        if (this._loaded) {
            this._window.show();
            this._window.focus();
        }

        this._isOpen = true;
    };

    UiRoutinesManager.prototype._clickInstallRoutineButton = function (event) {
        var _this = this;
        event.preventDefault();

        var routine = this.getUiRoutine(event.target.getAttribute('data-id'));

        if (!routine) {
            return;
        }

        routine.install(function (err) {
            if (!err) {
                _this.close();

                routine.start();
            } else {
                console.error(err);
            }
        });
    };

    UiRoutinesManager.prototype._updateWindow = function () {
        var _this = this;
        this.getInstalledRoutineIds(function (err, ids) {
            var routines = _this.getUiRoutines();
            var doc = _this._window.window.document;
            var onClick = function (event) {
                event.target.removeEventListener(onClick);

                _this._clickInstallRoutineButton(event);
            };

            doc.getElementById('headline').innerHTML = i18n.__('uiRoutinesManager.installRoutinesHeadline');
            doc.getElementById('description').innerHTML = i18n.__('uiRoutinesManager.installRoutinesDescription');

            for (var i = 0, l = routines.length; i < l; i++) {
                var routine = routines[i];

                if (ids.indexOf(routine.getId()) !== -1) {
                    routine = null;

                    continue;
                }

                var item = doc.createElement('li');
                var heading = doc.createElement('h2');
                var desc = doc.createElement('p');
                var link = doc.createElement('a');

                heading.appendChild(doc.createTextNode(routine.getName()));
                desc.appendChild(doc.createTextNode(routine.getDescription()));

                link.appendChild(doc.createTextNode(routine.getInstallButtonLabel()));
                link.setAttribute('data-id', routine.getId());
                link.href = '#';
                link.addEventListener('click', onClick, false);

                item.appendChild(heading);
                item.appendChild(desc);
                item.appendChild(link);

                doc.getElementById('routines-list').appendChild(item);
            }
        });
    };
    return UiRoutinesManager;
})();

module.exports = UiRoutinesManager;
//# sourceMappingURL=UiRoutinesManager.js.map
