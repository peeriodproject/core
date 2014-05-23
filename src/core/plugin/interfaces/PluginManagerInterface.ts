/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import fs = require('fs');

import ClosableAsyncInterface = require('../../utils/interfaces/ClosableAsyncInterface')
import PluginInterface = require('./PluginInterface');
import PluginMapInterface = require('./PluginMapInterface');
import PluginPathListInterface = require('./PluginPathListInterface');
import PluginRunnerInterface = require('./PluginRunnerInterface');
import PluginRunnerListInterface = require('./PluginRunnerListInterface');
import PluginStateInterface = require('./PluginStateInterface');

/**
 * The `PluginManagerInterface` is responsible for the state of plugins loaded into the application.
 *
 * It should:
 * - load the state from a persistant storage on open
 * - save the state to a persistant storage on close
 * - be able to find new plugins and add the specific plugin state to the storage
 * - it should be able to change the state of a specific plugin {@link core.plugin.PluginStateInterface}
 *
 *
 * @interface
 * @class core.plugin.PluginManagerInterface
 */
interface PluginManagerInterface extends ClosableAsyncInterface {

	/**
	 * Translates the plugin state into runnable plugin objects
	 *
	 * todo add counterpart
	 *
	 * @method core.plugin.PluginManagerInterface#activatePluginState
	 *
	 * @param {Function} callback
	 */
	activatePluginState (callback?:(err:Error) => void):void;

	/**
	 * Adds a listener to the specified event
	 *
	 * @param {string} eventName
	 * @param {Function} listener
	 */
	addEventListener (eventName:string, listener:Function):void;

	/**
	 * triggers the search to find new plugins within the plugin-folder
	 *
	 * @method core.plugin.PluginManagerInterface#findNewPlugins
	 *
	 * @param {Function} callback
	 */
	findNewPlugins (callback?:(err:Error) => void):void;

	/**
	 * Returns a single active plugin runner by identifier
	 *
	 * @method core.plugin.PluginManagerInterface#getActivePluginRunner
	 *
	 * @param {string} identifier
	 * @param {Function} callback
	 */
	getActivePluginRunner (identifier:string, callback:(pluginRunner:PluginRunnerInterface) => void):void;

	/**
	 * Returns a list of active plugin runners
	 *
	 * @method core.plugin.PluginManagerInterface#getActivePluginRunners
	 *
	 * @param {Function} callback
	 */
	getActivePluginRunners (callback:(pluginRunners:PluginRunnerListInterface) => void):void;

	/**
	 * Returns a list of plugins which are responsible for the given path
	 *
	 * @method core.plugin.PluginManagerInterface#getActivePluginRunners
	 *
	 * @param {string} itemPath
	 * @param {Function} callback
	 */
	getPluginRunnersForItem (itemPath:string, callback:(pluginRunners:PluginRunnerListInterface) => void):void;
	/**
	 * Returns the plugin state
	 *
	 * @method core.plugin.PluginManagerInterface#getPluginState
	 *
	 * @param callback
	 */
	getPluginState (callback:(pluinState:PluginStateInterface) => void):void;

	/**
	 * todo specify callback params
	 *
	 * @param itemPath
	 * @param stats
	 * @param callback
	 */
	onBeforeItemAdd (itemPath:string, stats:fs.Stats, callback:Function):void;

	/**
	 *
	 * @param eventName
	 * @param listener
	 */
	removeEventListener (eventName:string, listener:Function):void;
}

export = PluginManagerInterface;