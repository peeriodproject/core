/// <reference path='../../main.d.ts' />

import http = require('http');
import https = require('https');
import path = require('path');
import fs = require('fs');

var logger = require('../utils/logger/LoggerFactory').create();

/**
 * @class UiUpdateNotify
 */
class UiUpdateNotify {

	public static checkForUpdates (gui) {
		var manifestPath:string = path.resolve(process.cwd(), 'package.json');

		fs.readFile(manifestPath, {encoding: 'utf8'}, (err, data) => {
			if (err) return;

			if (data) {
				var manifest = null;

				try {
					manifest = JSON.parse(data);
				}
				catch (e) {
					logger.error('Cannot read package.json manifest', {emsg: e.message});
				}

				if (manifest) {
					var currentVersion:string = manifest.version;
					var versionCheckUrl:string = manifest.versionCheckUrl;

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
									logger.error('Response from update server is invalid', {emsg: e.message});
								}

								if (vObj && vObj.version && vObj.version !== currentVersion) {
									gui.Window.open('./public/update-notify.html', {
										"position"  : 'center',
										"focus"     : true,
										"toolbar"   : false,
										"frame"     : true,
										"resizable" : false,
										"width"     : 400,
										"height"    : 200,
										"fullscreen": false,
										"always-on-top": true
									});
								}
							});
						}).on('error', function (e) {
							logger.error('Update server ping error', {emsg: e.message});
						});
					}
				}
			}
		});
	}

}

export = UiUpdateNotify;