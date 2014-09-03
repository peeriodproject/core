/// <reference path='../../main.d.ts' />

import http = require('http');
import https = require('https');

/**
 * @class core.ui.UiUpdateNotify
 */
class UiUpdateNotify {

	public static checkForUpdates (gui:any) {
		var currentVersion:string = gui.App.manifest.version;
		var versionCheckUrl:string = gui.App.manifest.versionCheckUrl;

		if (currentVersion && versionCheckUrl) {
			// check for protocol
			var protocol:any = (versionCheckUrl.indexOf('https') === 0) ? https : http;

			// get the new version
			protocol.get(versionCheckUrl, function (res) {

				var body:string = '';

				res.on('data', function (d) {
					body += d;
				});

				res.on('end', function () {
					var vObj = null;

					try {
						vObj = JSON.parse(body);
					}
					catch (e) {
						console.log(e);
					}

					if (vObj && vObj.version && vObj.version !== currentVersion) {
						var win =  gui.Window.open('./public/update-notify.html', {
							position       : 'center',
							focus          : true,
							toolbar        : false,
							frame          : true,
							resizable      : false,
							width          : 620,
							height         : 360,
							fullscreen     : false,
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

export = UiUpdateNotify;