/// <reference path='../../../main.d.ts' />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiFolderDropzoneComponent
* @implements core.ui.UiComponentInterface
*/
var UiFolderDropzoneComponent = (function (_super) {
    __extends(UiFolderDropzoneComponent, _super);
    function UiFolderDropzoneComponent(window) {
        _super.call(this);
        // todo ts-declaration gui.Window
        this._window = null;
        this._guiWindow = null;
        this._windowDimensions = {};
        this._windowPosition = {};
        this._paths = [];
        this._currentPathKey = '';

        this._guiWindow = window;

        this._windowDimensions.height = 450;
        this._windowDimensions.width = 450;

        this._setupEventListeners();
    }
    UiFolderDropzoneComponent.prototype.getChannelName = function () {
        return 'folderdropzone';
    };

    UiFolderDropzoneComponent.prototype.getEventNames = function () {
        return ['open', 'close'];
    };

    UiFolderDropzoneComponent.prototype.getState = function (callback) {
        var state = {};

        if (this._currentPathKey) {
            state[this._currentPathKey] = this._paths;
        }
        return process.nextTick(callback.bind(null, state));
    };

    UiFolderDropzoneComponent.prototype.onAfterUiUpdate = function () {
        this._paths = null;
        this._paths = [];
        this._currentPathKey = '';
    };

    UiFolderDropzoneComponent.prototype._setupEventListeners = function () {
        var _this = this;
        this.on('background', function (background) {
            var localStorage = _this._guiWindow.get().window.localStorage;

            localStorage.setItem('background', background.background);
            localStorage.setItem('color', background.color);
            localStorage.setItem('inverted', background.inverted);
            localStorage.setItem('invertedBackgroundColor', background.invertedBackgroundColor);
        });

        this.on('open', function (key, backgroundSource, button) {
            var w = _this._getWindow();

            _this._currentPathKey = key || '';

            backgroundSource = backgroundSource || '';

            //buttonSource = buttonSource || '';
            //title  = title || '__Title__';
            //description = description || '__Description__';
            w.once('loaded', function () {
                if (backgroundSource) {
                    w.window.document.getElementById('background-wrapper').style.backgroundImage = _this._getBackgroundUrl(backgroundSource);
                }

                if (button) {
                    var buttonEl = w.window.document.getElementById('close-button');

                    buttonEl.style.backgroundImage = _this._getBackgroundUrl(button.source);
                    buttonEl.style.height = button.height + 'px';
                    buttonEl.style.width = button.width + 'px';
                    buttonEl.style.marginLeft = (button.width / -2) + 'px';
                }

                w.focus();
                //w.showDevTools();
            });
        });

        this.on('close', function () {
            if (_this._window) {
                _this._window.close();
            }
        });
    };

    /**
    * Adds the image metadata to the base64 data png string to prevent base64 content attacks.
    *
    * @param {string} source
    * @returns {string}
    */
    UiFolderDropzoneComponent.prototype._getBackgroundUrl = function (source) {
        if (!source) {
            return '';
        }

        return 'url("data:image/png;base64,' + source.replace('data:image/png;base64,', '') + '")';
    };

    /**
    * Returns the window instance.
    *
    * todo ts-declaration
    */
    UiFolderDropzoneComponent.prototype._getWindow = function () {
        var _this = this;
        if (!this._window) {
            this._window = this._guiWindow.open('./public/components/folderDropzone/index.html', {
                name: 'Dropzone',
                frame: false,
                toolbar: false,
                show: false,
                width: this._windowDimensions.width,
                height: this._windowDimensions.height
            });

            this._window.on('blur', function () {
                //this.close();
            });

            this._window.once('close', function () {
                if (_this._window) {
                    _this._window.hide(); // Pretend to be closed already
                    _this._window.close(true);
                    _this._window = null;
                }
            });

            this._window.on('move', function (x, y) {
                _this._windowPosition.x = x;
                _this._windowPosition.y = y;
            });

            this._window.on('resize', function (width, height) {
                _this._windowDimensions.width = width;
                _this._windowDimensions.height = height;
            });

            this._window.on('drop', function (paths) {
                _this._paths = paths;
                _this.updateUi();
            });
        }

        this._window.resizeTo(this._windowDimensions.width, this._windowDimensions.height);
        this._window.moveTo(this._windowPosition.x, this._windowPosition.y);
        this._window.show();
        this._window.setAlwaysOnTop(true);

        return this._window;
    };
    return UiFolderDropzoneComponent;
})(UiComponent);

module.exports = UiFolderDropzoneComponent;
//# sourceMappingURL=UiFolderDropzoneComponent.js.map
