/// <reference path='../../main.d.ts' />
var http = require('http');
var https = require('https');
var path = require('path');
var fs = require('fs');

/**
* @class UiUpdateNotify
*/
var UiUpdateNotify = (function () {
    function UiUpdateNotify() {
    }
    UiUpdateNotify.checkForUpdates = function (gui) {
        var manifestPath = path.resolve(process.cwd(), 'package.json');

        fs.readFile(manifestPath, { encoding: 'utf8' }, function (err, data) {
            if (err)
                return;

            if (data) {
                var manifest = null;

                try  {
                    manifest = JSON.parse(data);
                } catch (e) {
                    console.log('Cannot read manifest');
                }

                if (manifest) {
                    var currentVersion = manifest.version;
                    var versionCheckUrl = manifest.versionCheckUrl;

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
                                    gui.Window.open('./public/update-notify.html', {
                                        "position": 'center',
                                        "focus": true,
                                        "toolbar": false,
                                        "frame": true,
                                        "resizable": false,
                                        "width": 400,
                                        "height": 200,
                                        "fullscreen": false,
                                        "always-on-top": true
                                    });
                                }
                            });
                        }).on('error', function (e) {
                            console.log(e);
                        });
                    }
                }
            }
        });
    };
    return UiUpdateNotify;
})();

module.exports = UiUpdateNotify;
//# sourceMappingURL=UiUpdateNotify.js.map
