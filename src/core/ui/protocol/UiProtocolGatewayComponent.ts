import ProtocolGatewayInterface = require('../../protocol/interfaces/ProtocolGatewayInterface');
import UiSplashScreenInterface = require('../interfaces/UiSplashScreenInterface');

import UiComponent = require('../UiComponent');

/**
 * @class core.ui.UiProtocolGatewayComponent
 * @extends core.ui.UiComponent
 */
class UiProtocolGatewayComponent extends UiComponent {

	/**
	 * The current state of the component
	 *
	 * @member {Object} core.ui.UiProtocolGatewayComponent~_state
	 */
	private _state = {};

	/**
	 * The splash screen instance
	 *
	 * @member {core.ui.UiSplashScreenInterface} core.ui.UiProtocolGatewayComponent~_splashScreen
	 */
	private _splashScreen:UiSplashScreenInterface = null;

	/**
	 * The cached value of the desired amount of cirquits
	 *
	 * @member {number} core.ui.UiProtocolGatewayComponent~_desiredAmountOfCircuits
	 */
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
		return process.nextTick(callback.bind(null, this._state));
	}

	/**
	 * Tiny helper that sets the value for the given key to `true` if no value was provided before triggering the UI update
	 *
	 * @method core.ui.UiProtocolGatewayComponent~_setKey
	 *
	 * @param {string} key
	 * @param {string} [value] The optional value for the given key which will fall back to `true`
	 */
	private _setKey (key:string, value:any = true) {
		this._state[key] = value;

		this.updateUi();
	}

	/**
	 * Sets the key for the given value as well as setting the as the new splash screen status.
	 *
	 * @method core.ui.UiProtocolGatewayComponent~_setKeyAndUpdateSplashScreen
	 *
	 * @param {string} key
	 * @param {Object} value
	 */
	_setKeyAndUpdateSplashScreen (key:string, value?:any) {
		this._setKey(key, value);

		if (this._splashScreen) {
			this._splashScreen.setStatus(key);
		}
	}
}

export = UiProtocolGatewayComponent;