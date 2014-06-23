import PluginManagerInterface = require('../../plugin/interfaces/PluginManagerInterface');
import PluginRunnerMapInterface = require('../../plugin/interfaces/PluginRunnerMapInterface');
import UiComponentInterface = require('../interfaces/UiComponentInterface');

/**
 * @class core.ui.UiPluginManagerComponent
 * @implements core.ui.UiComponentInterface
 */
class UiPluginManagerComponent  implements UiComponentInterface {

	/**
	 * todo ts-definition
	 */
	private _connections:Array<any> = [];

	private _pluginManager:PluginManagerInterface = null;

	private _state:Object = {};

	constructor (pluginManager:PluginManagerInterface) {
		this._pluginManager = pluginManager;

		this._setupPluginManagerEvents();

		pluginManager.open((err)  => {
			/*pluginManager.findNewPlugins(function (err, data) {
				console.log(err, data);
			});*/
			console.log('opened!');
			pluginManager.activatePluginState(() => {
				console.log('plugin state activated!');
				//this._setInitialState();
			});
		});
	}

	public getChannelName ():string {
		return 'plugin';
	}

	public getState():Object {
		return this._state;
	}

	public onConnection (spark:any):void {
		this._connections.push(spark);

	}

	private _setupPluginManagerEvents ():void {
		this._pluginManager.addEventListener('pluginAdded', (identifier) => {
			console.log('plugin added!', identifier);
			this._addPlugin(identifier);
		});
	}

	/*private _setInitialState ():void {
		console.log('_setInitialState');
		this._pluginManager.getActivePluginRunners((runners:PluginRunnerMapInterface) => {
			/ *console.log('RUNNERS', runners);
			var runnerIdentifiers:Array<string> = Object.keys(runners);
			var callbackCount:number = 0;
			var checkAndUpdate:Function = () => {
				if (callbackCount === runnerIdentifiers.length) {
					this._updateUi();
				}
			};

			if (!runnerIdentifiers.length) {
				return;
			}

			for (var i = 0, l = runnerIdentifiers.length; i < l; i++) {
				var identifier:string = runnerIdentifiers[i];

				console.log('getting search fields', identifier);
				runners[identifier].getSearchFields((fields) => {
					console.log('got search fields', fields);
					this._state[identifier] = fields;

					callbackCount++;
					checkAndUpdate();
				});

			}* /
		});
	}*/

	/**
	 * Adds the fields of the corresponding PluginRunner to the state
	 *
	 * @param {string} identifier The PluginRunner identifier
	 */
	private _addPlugin (identifier:string):void {
		this._pluginManager.getActivePluginRunner(identifier, (runner) => {
			if (!runner) {
				return;
			}

			console.log('--------------');
			console.log('get mapping fields');
			runner.getMapping((err, mapping) => {
				console.log('MAPPING');
				console.log(mapping);
			});

			console.log('get search fields');
			runner.getSearchFields((err, fields) => {
				console.log('got search fields');
				console.log(err);
				if (err) {
					console.error(err);
				}
				console.log(fields);
				this._state[identifier] = fields;

				//this._updateUi();
			});
			console.log('-------');
		});
	}

	/**
	 * Sends the updates to all connected clients via `update` message.
	 *
	 * todo move this to the base class!
	 *
	 * @member core.ui.UiPluginManagerComponent~_updateUi
	 */
	private _updateUi():void {
		if (this._connections.length) {
			var state:Object = this.getState();

			console.log(state);

			for (var i = 0, l = this._connections.length; i < l; i++) {
				this._connections[i].send('update', state);
			}
		}
	}


}

export = UiPluginManagerComponent;