/// <reference path='../../main.d.ts' />
var http = require('http');
var https = require('https');

/**
* @class core.ui.UiUpdateNotify
*/
var UiUpdateNotify = (function () {
    function UiUpdateNotify() {
    }
    UiUpdateNotify.checkForUpdates = function (gui) {
        var currentVersion = gui.App.manifest.version;
        var versionCheckUrl = gui.App.manifest.versionCheckUrl;

        if (currentVersion && versionCheckUrl) {
            // check for protocol
            var protocol = (versionCheckUrl.indexOf('https') === 0) ? https : http;

            // get the new version
            protocol.get(versionCheckUrl, function (res) {
                var body = '';

                res.on('data', function (d) {
                    body += d;
                });

                res.on('end', function () {
                    var vObj = null;

                    try  {
                        vObj = JSON.parse(body);
                    } catch (e) {
                        console.log(e);
                    }

                    if (vObj && vObj.version && vObj.version !== currentVersion) {
                        var win = gui.Window.open('./public/update-notify.html', {
                            position: 'center',
                            focus: true,
                            toolbar: false,
                            frame: true,
                            resizable: false,
                            width: 620,
                            height: 360,
                            fullscreen: false,
                            "always-on-top": true
                        });
                    }
                });
            }).on('error', function (e) {
                console.log(e);
            });
        }
    };
    return UiUpdateNotify;
})();

module.exports = UiUpdateNotify;
//# sourceMappingURL=UiUpdateNotify.js.map
