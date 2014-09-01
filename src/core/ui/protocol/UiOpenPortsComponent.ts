/// <reference path='../../../../ts-definitions/node/node.d.ts' />

import StateHandlerInterface = require('../../utils/interfaces/StateHandlerInterface');
import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiOpenPortsComponent
 * @extends core.ui.UiComponent
 */
class UiOpenPortsComponent extends UiComponent {

	/**
	 * Keeps track of the initial open ports which are used to show a "restart app to activate new ports" message
	 *
	 * @member {Array} core.ui.UiOpenPortsComponent~_initialPorts
	 */
	private _initialPorts:Array<number> = [];

	/**
	 *
	 * @member {Array} core.ui.UiOpenPortsComponent~_currentPorts
	 */
	private _currentPorts:Array<number> = [];

	/**
	 * @member {core.utils.StateHandlerInterface} core.ui.UiOpenPortsComponent~_openPortsStateHandler
	 */
	private _openPortsStateHandler:StateHandlerInterface;

	constructor (openPortsStateHandler:StateHandlerInterface) {
		super();

		this._openPortsStateHandler = openPortsStateHandler;

		this._openPortsStateHandler.load((err:Error, state:any) => {
			this._initialPorts = state && state.openPorts ? state.openPorts : [];
			this._initialPorts.sort();

			this._currentPorts = this._initialPorts;
		});

		this._setupEventListeners();
	}

	public getChannelName ():string {
		return 'openports';
	}

	public getEventNames ():Array<string> {
		return ['addPort', 'removePort'];
	}

	public getState (callback:(state) => any):void {
		var portsChanged:Boolean = JSON.stringify(this._currentPorts) !== JSON.stringify(this._initialPorts);

		return process.nextTick(callback.bind(null, {
			ports: this._currentPorts,
			portsChanged: portsChanged
		}));
	}

	private _setupEventListeners ():void {
		this.on('addPort',(portToAdd:any) => {
			if (isNaN(portToAdd)) {
				return;
			}

			portToAdd = parseInt(portToAdd, 10);

			if (this._currentPorts.indexOf(portToAdd) === -1) {
				var portsToSave = this._currentPorts.slice();
				portsToSave.push(portToAdd);

				this._saveState(portsToSave);
			}
		});

		this.on('removePort', (portToRemove:number) => {
			var index:number = this._currentPorts.indexOf(portToRemove);

			if (index === -1) {
				return;
			}
			var portsToSave = this._currentPorts.slice();
			portsToSave.splice(index, 1);

			this._saveState(portsToSave);
		});
	}

	private _saveState (portsToSave:Array<number>):void {
		this._openPortsStateHandler.save({ openPorts: portsToSave }, (err:Error) => {
			if (!err) {
				this._currentPorts = portsToSave;

				this._currentPorts.sort();
			}

			this.updateUi();
		});
	}
}

export = UiOpenPortsComponent;