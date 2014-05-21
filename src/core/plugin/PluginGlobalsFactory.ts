/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	public create (itemPath:string, stats:fs.Stats):Object {
		return {
			fileName: itemPath,
			fileStats: Object.freeze(stats)
		};
	}

}

export = PluginGlobalsFactory;