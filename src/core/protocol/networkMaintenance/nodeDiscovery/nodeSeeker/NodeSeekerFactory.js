var path = require('path');

var JSONStateHandlerFactory = require('../../../../utils/JSONStateHandlerFactory');

var ContactNodeAddressFactory = require('../../../../topology/ContactNodeAddressFactory');
var ContactNodeFactory = require('../../../../topology/ContactNodeFactory');
var RoutingTableNodeSeeker = require('./RoutingTableNodeSeeker');
var HttpNodeSeeker = require('./HttpNodeSeeker');

/**
* Currently creates:
*
* - RoutingTable node seeker
* - HTTP server node seeker
*
* @class core.protocol.nodeDiscovery.NodeSeekerFactory
* @implements core.protocol.nodeDiscovery.NodeSeekerFactoryInterface
*
* @oaram {core.topology.RoutingTableInterface} routingTable
*/
var NodeSeekerFactory = (function () {
    function NodeSeekerFactory(appConfig, routingTable) {
        /**
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_addressFactory
        */
        this._addressFactory = null;
        /**
        * @member {core.config.ConfigInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_appConfig
        */
        this._appConfig = null;
        /**
        * @member {core.net.HttpServerList} core.protocol.nodeDiscovery.NodeSeekerFactory~_httpServerList
        */
        this._httpServerList = null;
        /**
        * @member {number} core.protocol.nodeDiscovery.NodeSeekerFactory~_httpServerTimeout
        */
        this._httpServerTimeout = 0;
        /**
        * @member {core.utils.StateHandlerInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_nodeDiscoveryState
        */
        this._nodeDiscoveryState = null;
        /**
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_nodeFactory
        */
        this._nodeFactory = null;
        /**
        * @member {core.topology.RoutingTableInterface} core.protocol.nodeDiscovery.NodeSeekerFactory~_routingTable
        */
        this._routingTable = null;
        /**
        * @member {core.protocol.nodeDiscovery.RoutingTableNodeSeeker} core.protocol.nodeDiscovery.NodeSeekerFactory~_routingTableNodeSeeker
        */
        this._routingTableNodeSeeker = null;
        this._appConfig = appConfig;
        this._jsonStateHandlerFactory = new JSONStateHandlerFactory();
        this._routingTable = routingTable;
        this._nodeFactory = new ContactNodeFactory();
        this._addressFactory = new ContactNodeAddressFactory();
        this._routingTableNodeSeeker = new RoutingTableNodeSeeker(this._routingTable);
    }
    NodeSeekerFactory.prototype.createSeekerList = function (callback) {
        var _this = this;
        this._nodeDiscoveryState = this._jsonStateHandlerFactory.create(path.resolve(this._appConfig.get('app.dataPath'), 'nodeDiscovery.json'));
        this._nodeDiscoveryState.load(function (err, state) {
            if (err) {
                console.log(err);
                callback([]);
                return;
            }

            var retList = [_this._routingTableNodeSeeker];

            _this._httpServerList = state.nodeDiscovery.httpServerList;
            _this._httpServerTimeout = state.nodeDiscovery.httpServerTimeout;

            if (_this._httpServerList instanceof Array === true && _this._httpServerList.length) {
                var httpSeeker = new HttpNodeSeeker(_this._httpServerList, _this._httpServerTimeout);

                httpSeeker.setAddressFactory(_this._addressFactory);
                httpSeeker.setNodeFactory(_this._nodeFactory);
                retList.push(httpSeeker);
            }

            callback(retList);
        });
    };
    return NodeSeekerFactory;
})();

module.exports = NodeSeekerFactory;
//# sourceMappingURL=NodeSeekerFactory.js.map
