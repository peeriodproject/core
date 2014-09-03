import AppQuitHandlerInterface = require('../utils/interfaces/AppQuitHandlerInterface');
import ClosableAsyncOptions = require('../utils/interfaces/ClosableAsyncOptions');
import ConfigInterface = require('../config/interfaces/ConfigInterface');
import PluginManagerInterface = require('../plugin/interfaces/PluginManagerInterface');
import PluginRunnerInterface = require('../plugin/interfaces/PluginRunnerInterface');
import PluginRunnerMapInterface = require('../plugin/interfaces/PluginRunnerMapInterface');
import SearchFormResultsManagerInterface = require('./interfaces/SearchFormResultsManagerInterface');
import StateHandlerFactoryInterface = require('../utils/interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('../utils/interfaces/StateHandlerInterface');
import SearchRequestManagerInterface = require('./interfaces/SearchRequestManagerInterface');

import SearchFormManager = require('./SearchFormManager');

/**
 * @class core.search.SearchFormResultsManager
 * @implements core.search.SearchFormResultsManagerInterface
 * @extends core.search.SearchFormManager
 */
class SearchFormResultsManager extends SearchFormManager implements SearchFormResultsManagerInterface {

	/**
	 * The internally uses PluginManagerInterface instance
	 *
	 * @member {core.plugin.PluginManagerInterface} core.search.SearchFormResultManager~_pluginManager
	 */
	private __pluginManager:PluginManagerInterface = null;

	private _pluginFieldsMap:{ [identifier:string]:Object } = {};

	/**
	 * The internally used SearchRequestManagerInterface instance to start queries
	 *
	 * @member {core.search.SearchRequestManagerInterface} core.search.SearchFormResultManager~_searchRequestManager
	 */
	private __searchRequestManager:SearchRequestManagerInterface = null;

	constructor (config:ConfigInterface, appQuitHandler:AppQuitHandlerInterface, stateHandlerFactory:StateHandlerFactoryInterface, pluginManager:PluginManagerInterface, searchRequestManager:SearchRequestManagerInterface, options:ClosableAsyncOptions = {}) {
		super(config, appQuitHandler, stateHandlerFactory, pluginManager, searchRequestManager, options);

		this.__pluginManager = pluginManager;
		this.__searchRequestManager = searchRequestManager;
	}

	public open (callback?:(err:Error) => any):void {
		var internalCallback = callback || function () {};

		super.open((err) => {
			if (err) {
				//console.error(err.message);

				return internalCallback(err);
			}

			return this._fetchAllPluginFields(internalCallback);
		});
	}

	public setForm (identifier:string, callback?:(err:Error) => any):void {
		var internalCallback = callback || function (err:Error) {};

		super.setForm(identifier, (err:Error) => {
			if (err) {
				return internalCallback(err);
			}

			return this._fetchAllPluginFields(callback);
		});
	}

	// todo ts-definitions
	public transformResponses (responses:Array<any>, cleanupFields:boolean, callback:(err:Error, transformedResults:any) => any):void {
		var transformedResults:Array<any> = [];

		if (!responses || !responses.length) {
			return process.nextTick(callback.bind(null, null, []));
		}

		for (var i = 0, l = responses.length; i < l; i++) {
			var response = responses[i];
			var type:string = response._source ? response._source._type : '';
			var fields:Object = this._pluginFieldsMap[type.toLowerCase()] || null;

			if (cleanupFields) {
				response = this._cleanupFields(response);
			}

			transformedResults.push({
				response: response,
				fields: fields
			});
		}

		return process.nextTick(callback.bind(null, null, transformedResults));
	}

	private _cleanupFields (response:any):any {
		delete response._index;
		delete response._type;
		delete response._source._meta;

		if (response.fields && response.fields._timestamp) {
			response._timestamp = response.fields._timestamp;

			delete response.fields._timestamp;

			if (!Object.keys(response.fields).length) {
				delete response.fields;
			}
		}

		return response;
	}

	private _fetchAllPluginFields (callback:(err:Error) => any):void {
		this.__pluginManager.getActivePluginRunners((pluginRunners:PluginRunnerMapInterface) => {
			var identifiers:Array<string> = Object.keys(pluginRunners);
			var returned:number = 0;
			var checkAndCallback = function (err:Error):any {
				returned++;

				if (returned === identifiers.length || err) {
					returned = -1;

					return callback(err);
				}
			};

			if (!identifiers.length) {
				return callback(null);
			}

			for (var i = 0, l = identifiers.length; i < l; i++) {
				this._fetchPluginFields(identifiers[i], pluginRunners[identifiers[i]], checkAndCallback);
			}
		});
	}

	private _fetchPluginFields (identifier:string, pluginRunner:PluginRunnerInterface, callback:(err:Error) => any):void {
		pluginRunner.getResultFields((err:Error, fields:Object) => {
			if (err) {
				return callback(err);
			}

			this._pluginFieldsMap[identifier.toLowerCase()] = fields;

			return callback(null);
		});
	}
}

export = SearchFormResultsManager;