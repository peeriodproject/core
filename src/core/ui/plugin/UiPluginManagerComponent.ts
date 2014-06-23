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
			pluginManager.activatePluginState(() => {
				this._setInitialState();
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
			this._addPlugin(identifier);
		});
	}

	private _setInitialState ():void {
		this._pluginManager.getActivePluginRunners((runners:PluginRunnerMapInterface) => {
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

				runners[identifier].getSearchFields((err:Error, fields:Object) => {
					this._addSearchFields(identifier, err, fields);

					callbackCount++;
					checkAndUpdate();
				});

			}
		});
	}

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

			runner.getSearchFields((err, fields) => {
				this._addSearchFields(identifier, err, fields);

				//this._updateUi();
			});
		});
	}

	/**
	 * Adds the givent fields to the specified identifier and logs an error to the console if present
	 *
	 * @member core.ui.UiPluginManagerComponent~_addSearchFields
	 *
	 * @param {string} identifier
	 * @param {Error} err
	 * @param {Object} fields
	 */
	private _addSearchFields (identifier:string, err:Error, fields:Object):void {
		if (err) {
			console.error(err);
		}
		else if (fields) {
			this._state[identifier] = fields;
		}
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

			for (var i = 0, l = this._connections.length; i < l; i++) {
				this._connections[i].send('update', state);
			}
		}
	}

}

export = UiPluginManagerComponent;