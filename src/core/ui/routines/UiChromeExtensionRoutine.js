/// <reference path='../../../main.d.ts' />
var path = require('path');
var fs = require('fs-extra');
var childProcess = require('child_process');

var i18n = require('i18n');

var logger = require('../../utils/logger/LoggerFactory').create();

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

    UiChromeExtensionRoutine.prototype.getNotice = function () {
        return this._geti18n('subnotice');
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

            logger.log('Chrome routing extension install path ' + path.resolve(process.cwd(), _this._config.get('extension.crxPath')));

            var externalCrxPath = _this._moveCrxAndGetPath();

            if (!externalCrxPath) {
                return internalCallback(null);
            }

            fs.outputJson(installPath, {
                external_crx: externalCrxPath,
                external_version: _this._config.get('extension.version')
            }, function (err) {
                return internalCallback(err);
            });
        });
    };

    UiChromeExtensionRoutine.prototype.isInstalled = function (callback) {
        var installed = fs.existsSync(this._getInstallPath()) && fs.existsSync(this._getDestinationCrxPath());

        var doCallback = function (isInstalled) {
            process.nextTick(function () {
                callback(isInstalled);
            });
        };

        if (!installed) {
            doCallback(false);
            return;
        } else {
            try  {
                var contents = fs.readFileSync(this._getInstallPath(), { encoding: 'utf8' });
                var obj = JSON.parse(contents);

                if (obj && obj.external_version === this._config.get('extension.version')) {
                    doCallback(true);
                    return;
                }
            } catch (e) {
            }
        }

        // fallback
        doCallback(false);
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
        var exec = childProcess.exec('open -a "' + host + '" "' + url + '"', function () {
        });
        exec.unref();

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

    UiChromeExtensionRoutine.prototype._getDestinationCrxPath = function () {
        var destCrxFolderPath = path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']), this._config.get('extension.crxPathTo'));

        return path.join(destCrxFolderPath, 'peeriod-chrome.crx');
    };

    UiChromeExtensionRoutine.prototype._moveCrxAndGetPath = function () {
        var origCrxPath = path.resolve(process.cwd(), this._config.get('extension.crxPath'));
        var destCrxFolderPath = path.resolve(path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']), this._config.get('extension.crxPathTo'));
        var destCrxPath = this._getDestinationCrxPath();

        try  {
            fs.ensureDirSync(destCrxFolderPath);
            fs.copySync(origCrxPath, destCrxPath);
        } catch (e) {
            return null;
        }

        return destCrxPath;
    };
    return UiChromeExtensionRoutine;
})();

module.exports = UiChromeExtensionRoutine;
//# sourceMappingURL=UiChromeExtensionRoutine.js.map
