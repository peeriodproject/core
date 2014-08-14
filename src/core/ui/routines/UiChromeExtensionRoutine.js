/// <reference path='../../../main.d.ts' />
var path = require('path');
var fs = require('fs-extra');

var i18n = require('i18n');

var UiChromeExtensionRoutine = (function () {
    function UiChromeExtensionRoutine(config) {
        this._config = null;
        this._config = config;
    }
    UiChromeExtensionRoutine.prototype.getDescription = function () {
        return this._geti18n('description');
    };

    UiChromeExtensionRoutine.prototype.getIcon = function () {
        return this._config.get('extension.icon');
    };

    UiChromeExtensionRoutine.prototype.getId = function () {
        return this._config.get('extension.id');
    };

    UiChromeExtensionRoutine.prototype.getName = function () {
        return this._geti18n('name');
    };

    UiChromeExtensionRoutine.prototype.getInstallButtonLabel = function () {
        return this._geti18n('installButtonLabel');
    };

    UiChromeExtensionRoutine.prototype.install = function (callback) {
        var _this = this;
        var internalCallback = callback || function () {
        };

        this.isInstalled(function (installed) {
            if (installed) {
                return internalCallback(null);
            }

            var installPath = _this._getInstallPath();

            console.log(path.resolve(process.cwd(), _this._config.get('extension.crxPath')));

            fs.writeJson(installPath, {
                external_crx: path.resolve(process.cwd(), _this._config.get('extension.crxPath')),
                external_version: _this._config.get('extension.version')
            }, function (err) {
                console.log(err);

                return internalCallback(err);
            });
        });
    };

    UiChromeExtensionRoutine.prototype.isInstalled = function (callback) {
        fs.exists(this._getInstallPath(), callback);
    };

    UiChromeExtensionRoutine.prototype.start = function (callback) {
        var internalCallback = callback || function () {
        };

        var host = this._config.get('extension.host');
        var url = this._config.get('extension.hostUrl');

        url = 'file://' + path.resolve(path.join(process.cwd(), url));

        // todo windows starter
        // todo pull request to node.d.ts -> exec.unref
        // todo pull request to node.d.ts -> exec with a single argument
        /*var exec:any = childProcess.exec('open -a "' + host + '" "' + url + '"', function () {});
        exec.unref();*/
        return internalCallback(null);
    };

    UiChromeExtensionRoutine.prototype.stop = function (callback) {
        var internalCallback = callback || function () {
        };

        return process.nextTick(callback.bind(null, new Error('UiChromeExtensionRoutine#stop: Can not stop "Google Chrome" programmatically. The user must close the browser manually.')));
    };

    UiChromeExtensionRoutine.prototype.uninstall = function (callback) {
        var internalCallback = callback || function () {
        };

        fs.unlink(this._getInstallPath(), internalCallback);
    };

    UiChromeExtensionRoutine.prototype._geti18n = function (key) {
        return i18n.__(this.getId() + '.' + key);
    };

    UiChromeExtensionRoutine.prototype._getInstallPath = function () {
        var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

        return path.resolve(path.join(home, this._config.get('extension.installPath'), this._config.get('extension.extensionId') + '.json'));
    };
    return UiChromeExtensionRoutine;
})();

module.exports = UiChromeExtensionRoutine;
//# sourceMappingURL=UiChromeExtensionRoutine.js.map
