/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.plugin.PluginGlobalsFactory
 * @implements core.plugin.PluginGlobalsFactoryInterface
 *
 * @param {string} itemPath
 * @param {fs.Stats} stats
 * @param {Object} tikaGlobals
 */
class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	private _cache = {};

	public create (itemPath:string, stats:fs.Stats, tikaGlobals:Object):Object {
		return ObjectUtils.extend({
			fileName: itemPath,
			fileStats: stats ? Object.freeze(stats) : stats
		}, tikaGlobals);
	}

}

export = PluginGlobalsFactory;