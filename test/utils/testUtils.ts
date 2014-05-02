/// <reference path='../test.d.ts' />

import sinon = require('sinon');

/**
 *
 */
module testUtils {
	export interface publicApiCallbackList {
		[key:string]:Function;
	}

	export function stubPublicApi(sandbox:SinonSandbox, klass:Function, apiMethodCallbacks:publicApiCallbackList):any {
		var proto = klass.prototype;
		var keys = Object.keys(proto);
		var stubbed:any = {};

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
}

export = testUtils;