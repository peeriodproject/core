/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	public create (itemPath:string, stats:fs.Stats):Object {
		return {
			getItemFileName: function ():string {
				return itemPath;
			},

			getStats: function ():Object {
				return Object.freeze(stats);
			}

			//request: function (type:string, )
		};
	}

}

export = PluginGlobalsFactory;