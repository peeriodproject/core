var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var UiComponent = require('../UiComponent');

/**
* @class core.ui.UiProtocolGatewayComponent
* @extends core.ui.UiComponent
*/
var UiProtocolGatewayComponent = (function (_super) {
    __extends(UiProtocolGatewayComponent, _super);
    function UiProtocolGatewayComponent(protocolGateway, splashScreen) {
        var _this = this;
        _super.call(this);
        /**
        * The current state of the component
        *
        * @member {Object} core.ui.UiProtocolGatewayComponent~_state
        */
        this._state = {};
        /**
        * The splash screen instance
        *
        * @member {core.ui.UiSplashScreenInterface} core.ui.UiProtocolGatewayComponent~_splashScreen
        */
        this._splashScreen = null;
        /**
        * The cached value of the desired amount of cirquits
        *
        * @member {number} core.ui.UiProtocolGatewayComponent~_desiredAmountOfCircuits
        */
        this._desiredAmountOfCirquits = 0;

        this._splashScreen = splashScreen;

        protocolGateway.once('JOIN_NETWORK', function () {
            _this._setKeyAndUpdateSplashScreen('joinNetwork');
        });

        protocolGateway.once('DESIRED_AMOUNT_OF_CIRCUITS', function (count) {
            _this._desiredAmountOfCirquits = count;
            _this._setKey('desiredAmountOfCircuits', count);
        });

        protocolGateway.once('FOUND_ENTRY_NODE', function () {
            _this._setKeyAndUpdateSplashScreen('foundEntryNode');
        });

        protocolGateway.once('INITIAL_CONTACT_QUERY_COMPLETE', function () {
            _this._setKeyAndUpdateSplashScreen('initialContactQueryComplete');
        });

        protocolGateway.once('TOPOLOGY_JOIN_COMPLETE', function () {
            _this._setKeyAndUpdateSplashScreen('topologyJoinComplete');
            if (_this._splashScreen) {
                _this._splashScreen.close();
            }
        });

        protocolGateway.once('NEEDS_PROXY', function (needsProxy) {
            _this._setKeyAndUpdateSplashScreen('needsProxy', needsProxy);
        });

        protocolGateway.on('NUM_OF_PROXIES', function (count) {
            _this._setKey('numOfProxies', count);
        });

        protocolGateway.on('NUM_OF_PROXYING_FOR', function (count) {
            _this._setKey('numOfProxyingFor', count);
        });

        protocolGateway.on('NUM_OF_HYDRA_CIRCUITS', function (count) {
            var reached = count >= _this._desiredAmountOfCirquits ? true : false;
            _this._setKey('numOfHydraCircuits', count);
            _this._setKey('hydraCirquitsDesiredAmountReached', reached);
        });

        protocolGateway.on('HYDRA_CIRCUITS_DESIRED_AMOUNT_REACHED', function () {
            _this._setKey('hydraCirquitsDesiredAmountReached', true);
        });

        protocolGateway.on('NUM_OF_HYDRA_CELLS', function (count) {
            _this._setKey('numOfHydraCells', count);
        });
    }
    UiProtocolGatewayComponent.prototype.getChannelName = function () {
        return 'protocol';
    };

    UiProtocolGatewayComponent.prototype.getState = function (callback) {
        return process.nextTick(callback.bind(null, this._state));
    };

    /**
    * Tiny helper that sets the value for the given key to `true` if no value was provided before triggering the UI update
    *
    * @method core.ui.UiProtocolGatewayComponent~_setKey
    *
    * @param {string} key
    * @param {string} [value] The optional value for the given key which will fall back to `true`
    */
    UiProtocolGatewayComponent.prototype._setKey = function (key, value) {
        if (typeof value === "undefined") { value = true; }
        this._state[key] = value;

        this.updateUi();
    };

    /**
    * Sets the key for the given value as well as setting the as the new splash screen status.
    *
    * @method core.ui.UiProtocolGatewayComponent~_setKeyAndUpdateSplashScreen
    *
    * @param {string} key
    * @param {Object} value
    */
    UiProtocolGatewayComponent.prototype._setKeyAndUpdateSplashScreen = function (key, value) {
        this._setKey(key, value);

        if (this._splashScreen) {
            this._splashScreen.setStatus(key);
        }
    };
    return UiProtocolGatewayComponent;
})(UiComponent);

module.exports = UiProtocolGatewayComponent;
//# sourceMappingURL=UiProtocolGatewayComponent.js.map
