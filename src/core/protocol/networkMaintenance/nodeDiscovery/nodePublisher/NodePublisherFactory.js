var path = require('path');

var JSONStateHandlerFactory = require('../../../../utils/JSONStateHandlerFactory');

var HttpNodePublisher = require('./HttpNodePublisher');

/**
* Currently creates:
*
* - HTTP server node publisher
*
* @class core.protocol.nodeDiscovery.NodePublisherFactory
* @implements core.protocol.nodeDiscovery.NodePublisherFactoryInterface
*
* @param {core.config.ConfigInterface} appConfig
*/
var NodePublisherFactory = (function () {
    function NodePublisherFactory(appConfig, protocolConfig, myNode) {
        /**
        * @member {core.config.ConfigInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_appConfig
        */
        this._appConfig = null;
        /**
        * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.NodePublisherFactory~_httpServerList
        */
        this._httpServerList = null;
        /**
        * @member {core.topology.MyNodeInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_myNode
        */
        this._myNode = null;
        /**
        * @member {core.utils.StateHandlerInterface} core.protocol.nodeDiscovery.NodePublisherFactory~_nodeDiscoveryState
        */
        this._nodeDiscoveryState = null;
        /**
        * Number of seconds after which my node will be republished.
        *
        * @member {number} core.protocol.nodeDiscovery.NodePublisherFactory~_republishInSeconds
        */
        this._republishInSeconds = 0;
        this._appConfig = appConfig;
        this._republishInSeconds = protocolConfig.get('protocol.nodeDiscovery.republishInSeconds');
        this._myNode = myNode;
        this._jsonStateHandlerFactory = new JSONStateHandlerFactory();
    }
    NodePublisherFactory.prototype.createPublisherList = function (callback) {
        var _this = this;
        this._nodeDiscoveryState = this._jsonStateHandlerFactory.create(path.resolve(this._appConfig.get('app.dataPath'), 'nodeDiscovery.json'));
        this._nodeDiscoveryState.load(function (err, state) {
            if (err) {
                callback([]);
                return;
            }

            var retList = [];

            _this._httpServerList = state.nodeDiscovery.httpServerList;

            if (_this._httpServerList instanceof Array === true && _this._httpServerList.length) {
                var httpPublisher = new HttpNodePublisher(_this._httpServerList, _this._myNode, _this._republishInSeconds);

                retList.push(httpPublisher);
            }

            callback(retList);
        });
    };
    return NodePublisherFactory;
})();

module.exports = NodePublisherFactory;
//# sourceMappingURL=NodePublisherFactory.js.map
