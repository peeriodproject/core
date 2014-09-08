var FoundClosestNodesReadableMessage = require('./FoundClosestNodesReadableMessage');

var ContactNodeFactory = require('../../../topology/ContactNodeFactory');

var ContactNodeAddressFactory = require('../../../topology/ContactNodeAddressFactory');

/**
* FoundClosestNodesReadableMessageFactoryInterface implementation.
*
* @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory
* @implements core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactoryInterface
*/
var FoundClosestNodesReadableMessageFactory = (function () {
    function FoundClosestNodesReadableMessageFactory() {
        /**
        * @member {core.protocol.topology.ContactNodeFactoryInterface} core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory~_nodeFactory
        */
        this._nodeFactory = null;
        /**
        * @member {core.protocol.topology.ContactNodeAddressFactoryInterface} core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageFactory~_addressFactory
        */
        this._addressFactory = null;
        this._nodeFactory = new ContactNodeFactory();
        this._addressFactory = new ContactNodeAddressFactory();
    }
    FoundClosestNodesReadableMessageFactory.prototype.create = function (payload) {
        return new FoundClosestNodesReadableMessage(payload, this._nodeFactory, this._addressFactory);
    };
    return FoundClosestNodesReadableMessageFactory;
})();

module.exports = FoundClosestNodesReadableMessageFactory;
//# sourceMappingURL=FoundClosestNodesReadableMessageFactory.js.map
