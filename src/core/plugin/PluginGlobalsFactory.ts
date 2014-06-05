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
 * @param {Object} globals
 */
class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	private _cache = {};

	public create (itemPath:string, stats:fs.Stats, globals:Object):Object {
		return ObjectUtils.extend({
			fileName  : itemPath, // todo remove path
			fileStats : stats ? Object.freeze(stats) : stats
		}, globals);
	}

}

export = PluginGlobalsFactory;