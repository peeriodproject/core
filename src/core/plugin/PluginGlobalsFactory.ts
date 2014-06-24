/// <reference path='../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

import ObjectUtils = require('../utils/ObjectUtils');

/**
 * @class core.plugin.PluginGlobalsFactory
 * @implements core.plugin.PluginGlobalsFactoryInterface
 */
class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	private _cache = {};

	/**
	 * Extends the plugin globals by adding the file name nad fs.Stats object
	 *
	 * @method core.plugin.PluginGlobalsFactory#create
	 *
	 * @param {string} itemPath
	 * @param {fs.Stats} stats
	 * @param {Object} globals
	 * @returns {Object}
	 */
	public create (itemPath:string, stats:fs.Stats, globals:Object):Object {
		return ObjectUtils.extend({
			fileName  : itemPath, // todo remove path
			fileStats : stats ? Object.freeze(stats) : {}
		}, globals);
	}

}

export = PluginGlobalsFactory;