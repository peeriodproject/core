import ProtocolGatewayInterface = require('../../protocol/interfaces/ProtocolGatewayInterface');
import UiSplashScreenInterface = require('../interfaces/UiSplashScreenInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiProtocolGatewayComponent
 * @extends core.ui.UiComponent
 */
class UiProtocolGatewayComponent extends UiComponent {

	private _state = {};

	private _splashScreen:UiSplashScreenInterface = null;

	private _desiredAmountOfCirquits:number = 0;

	constructor(protocolGateway:ProtocolGatewayInterface, splashScreen:UiSplashScreenInterface) {
		super();

		this._splashScreen = splashScreen;

		protocolGateway.once('JOIN_NETWORK', () => {
			this._setKeyAndUpdateSplashScreen('joinNetwork');
		});

		protocolGateway.once('DESIRED_AMOUNT_OF_CIRCUITS', (count:number) => {
			this._desiredAmountOfCirquits = count;
			this._setKey('desiredAmountOfCircuits', count);
		});

		protocolGateway.once('FOUND_ENTRY_NODE', () => {
			this._setKeyAndUpdateSplashScreen('foundEntryNode');
		});

		protocolGateway.once('INITIAL_CONTACT_QUERY_COMPLETE', () => {
			this._setKeyAndUpdateSplashScreen('initialContactQueryComplete');
		});

		protocolGateway.once('TOPOLOGY_JOIN_COMPLETE', () => {
			this._setKeyAndUpdateSplashScreen('topologyJoinComplete');
			this._splashScreen.close();
		});

		protocolGateway.once('NEEDS_PROXY', (needsProxy:boolean) => {
			this._setKeyAndUpdateSplashScreen('needsProxy', needsProxy);
		});

		protocolGateway.on('NUM_OF_PROXIES', (count:number) => {
			this._setKey('numOfProxies', count);
		});

		protocolGateway.on('NUM_OF_PROXYING_FOR', (count:number) => {
			this._setKey('numOfProxyingFor', count);
		});

		protocolGateway.on('NUM_OF_HYDRA_CIRCUITS', (count:number) => {
			var reached:boolean = count >= this._desiredAmountOfCirquits ? true : false;
			this._setKey('numOfHydraCircuits', count);
			this._setKey('hydraCirquitsDesiredAmountReached', reached);
		});

		protocolGateway.on('HYDRA_CIRCUITS_DESIRED_AMOUNT_REACHED', () => {
			this._setKey('hydraCirquitsDesiredAmountReached', true);
		});

		protocolGateway.on('NUM_OF_HYDRA_CELLS', (count:number) => {
			this._setKey('numOfHydraCells', count);
		});


	}

	getChannelName ():string {
		return 'protocol';
	}

	getState (callback:(state) => any):void {
		console.log(this._state);

		return process.nextTick(callback.bind(null, this._state));
	}

	/**
	 * Tiny helper that sets the value for the given key to `true` if no value was provided before triggering the UI update
	 *
	 * @param {string} key
	 */
	private _setKey (key:string, value:any = true) {
		this._state[key] = value;

		this.updateUi();
	}

	_setKeyAndUpdateSplashScreen (key:string, value?:any) {
		this._setKey(key, value);
		this._splashScreen.setStatus(key);
	}
}

export = UiProtocolGatewayComponent;