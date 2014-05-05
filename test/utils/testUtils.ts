/// <reference path='../test.d.ts' />

import fs = require('fs');
import sinon = require('sinon');
import path = require('path');

/**
 *
 */
module testUtils {
	export interface publicApiCallbackList {
		[key:string]:Function;
	}

	export function stubPublicApi (sandbox:SinonSandbox, klass:Function, apiMethodCallbacks:publicApiCallbackList = {}):any {
		var proto = klass.constructor();
		var keys = Object.keys(klass.prototype);
		var stubbed:any = {};

		for (var attr in klass.prototype) {
			proto[attr] = klass.prototype[attr];
		}

		for (var i in keys) {
			var key = keys[i];
			var method = proto[key];

			// look for public methods
			if (typeof method === 'function' && key.charAt(0) !== '_') {
				if (apiMethodCallbacks[key]) {
					stubbed[key] = sandbox.stub(proto, key, apiMethodCallbacks[key]);
				}
				else {
					stubbed[key] = sandbox.stub(proto, key);
				}

				/*}
				 else {
				 console.log('spy on ' + key);
				 spies[key] = sandbox.spy()
				 }*/
			}
		}

		return stubbed;
	}

	export function getFixturePath (fixturePath:string):string {
		return path.join(process.cwd(), 'test/fixtures/', fixturePath);
	};

	export function createFolder (folderPath:string):void {
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath);
		}
	};

	/**
	 * @see http://www.geedew.com/2012/10/24/remove-a-directory-that-is-not-empty-in-nodejs/
	 */
	export function deleteFolderRecursive (path:string):void {
		if (fs.existsSync(path)) {
			fs.readdirSync(path).forEach(function (file, index) {
				var curPath = path + '/' + file;
				if (fs.lstatSync(curPath).isDirectory()) { // recurse
					testUtils.deleteFolderRecursive(curPath);
				}
				else { // delete file
					fs.unlinkSync(curPath);
				}
			});

			fs.rmdirSync(path);
		}
	};
}

export = testUtils;