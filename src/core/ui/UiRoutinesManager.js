/// <reference path='../../main.d.ts' />
var i18n = require('i18n');

var logger = require('../utils/logger/LoggerFactory').create();

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
            min_width: 1050,
            width: 1050,
            min_height: 600,
            height: 600,
            frame: true,
            toolbar: false,
            resizable: true,
            show: false,
            show_in_taskbar: false,
            fullscreen: false
        });

        this._window.once('loaded', function () {
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
                logger.error('Error installing UI routine', { errmsg: err.message });
            }
        });
    };

    UiRoutinesManager.prototype._updateWindow = function () {
        var _this = this;
        this.getInstalledRoutineIds(function (err, ids) {
            var routines = _this.getUiRoutines();
            var doc = _this._window.window.document;
            var routinesList = doc.getElementById('routines-list');
            var items = [];
            var getClosest = function (el, tag) {
                // this is necessary since nodeName is always in upper case
                tag = tag.toUpperCase();
                do {
                    if (el.nodeName === tag) {
                        // tag name is found! let's return it. :)
                        return el;
                    }
                } while(el = el.parentNode);

                // not found :(
                return null;
            };
            var onItemClick = function (event) {
                var target = event.target.tagName === 'LI' ? event.target : getClosest(event.target, 'LI');
                var newClassName = target.className.indexOf('active') === -1 ? target.className + ' active' : target.className.replace('active', '');

                event.preventDefault();

                for (var i = 0, l = items.length; i < l; i++) {
                    items[i].className = '';
                }

                target.className = newClassName;
            };
            var onLinkClick = function (event) {
                event.target.removeEventListener(onLinkClick);

                _this._clickInstallRoutineButton(event);
            };

            routinesList.innerHTML = '';

            doc.title = i18n.__('uiRoutinesManager.installRoutinesWindowTitle');

            doc.getElementById('headline').innerHTML = i18n.__('uiRoutinesManager.installRoutinesHeadline');
            doc.getElementById('description').innerHTML = i18n.__('uiRoutinesManager.installRoutinesDescription');
            doc.getElementById('install-btn-placeholder').innerHTML = i18n.__('uiRoutinesManager.installRoutinesButtonPlaceholder');

            for (var i = 0, l = routines.length; i < l; i++) {
                var routine = routines[i];

                if (ids.indexOf(routine.getId()) !== -1) {
                    routine = null;

                    continue;
                }

                var item = doc.createElement('li');
                var icon = routine.getIcon();

                item.className = icon ? 'has-icon' : '';
                item.addEventListener('click', onItemClick, false);

                var iconEl;

                var contentEl = doc.createElement('div');
                var heading = doc.createElement('h2');
                var desc = doc.createElement('p');
                var notice = doc.createElement('p');
                var linkWrapper = doc.createElement('div');
                var link = doc.createElement('a');

                if (icon) {
                    iconEl = doc.createElement('div');
                    iconEl.className = 'icon';
                    iconEl.style.backgroundImage = 'url(data:image/svg+xml;base64,' + icon + ')';
                }

                contentEl.className = 'content';
                desc.className = 'description';
                notice.className = 'notice';

                heading.appendChild(doc.createTextNode(routine.getName()));
                desc.appendChild(doc.createTextNode(routine.getDescription()));
                notice.appendChild(doc.createTextNode(routine.getNotice()));

                linkWrapper.className = 'install-btn-wrapper';

                link.appendChild(doc.createTextNode(routine.getInstallButtonLabel()));
                link.setAttribute('data-id', routine.getId());
                link.href = '#';
                link.className = 'install-btn';
                link.addEventListener('click', onLinkClick, false);

                if (iconEl) {
                    item.appendChild(iconEl);
                }

                contentEl.appendChild(heading);
                contentEl.appendChild(desc);
                contentEl.appendChild(notice);
                item.appendChild(contentEl);

                linkWrapper.appendChild(link);
                item.appendChild(linkWrapper);

                routinesList.appendChild(item);

                items.push(item);
            }
        });
    };
    return UiRoutinesManager;
})();

module.exports = UiRoutinesManager;
//# sourceMappingURL=UiRoutinesManager.js.map
