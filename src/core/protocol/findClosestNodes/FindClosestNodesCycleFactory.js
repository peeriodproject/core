var FindClosestNodesCycle = require('./FindClosestNodesCycle');

/**
* @class core.protocol.findClosestNodes.FindClosestNodesCycleFactory
* @implements core.protocol.findClosestNodes.FindClosestNodesCycleFactoryInterface
*
* @param {core.protocol.net.ProtocolConnectionManagerInterface} protocolConnectionManager
*/
var FindClosestNodesCycleFactory = (function () {
    function FindClosestNodesCycleFactory(protocolConnectionManager) {
        /**
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycleFactory~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * @member {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycleFactory~_findClosestNodesManager
        */
        this._findClosestNodesManager = null;
        this._protocolConnectionManager = protocolConnectionManager;
    }
    FindClosestNodesCycleFactory.prototype.create = function (searchForId, startWithList, callback) {
        return new FindClosestNodesCycle(searchForId, startWithList, this._findClosestNodesManager, this._protocolConnectionManager, callback);
    };

    FindClosestNodesCycleFactory.prototype.setManager = function (manager) {
        this._findClosestNodesManager = manager;
    };
    return FindClosestNodesCycleFactory;
})();

module.exports = FindClosestNodesCycleFactory;
//# sourceMappingURL=FindClosestNodesCycleFactory.js.map
