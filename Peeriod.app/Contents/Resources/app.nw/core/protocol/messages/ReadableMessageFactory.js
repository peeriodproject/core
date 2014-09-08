var ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');
var ContactNodeFactory = require('../../topology/ContactNodeFactory');
var ReadableMessage = require('./ReadableMessage');

/**
* ReadableMessageFactoryInterface implementation.
*
* @class core.protocol.messages.ReadableMessageFactory
* @implements core.protocol.messages.ReadableMessageFactoryInterface
*/
var ReadableMessageFactory = (function () {
    function ReadableMessageFactory() {
        /**
        * A ContactNodeFactory which gets passed to all ReadableMessages.
        *
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessageFactory~_nodeFactory
        */
        this._nodeFactory = null;
        /**
        * A ContractNodeAddressFactory which gets passed to all ReadableMessages.
        *
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.messages.ReadableMessageFactory~_addressFactory
        */
        this._addressFactory = null;
        this._nodeFactory = new ContactNodeFactory();
        this._addressFactory = new ContactNodeAddressFactory();
    }
    ReadableMessageFactory.prototype.create = function (buffer) {
        return new ReadableMessage(buffer, this._nodeFactory, this._addressFactory);
    };
    return ReadableMessageFactory;
})();

module.exports = ReadableMessageFactory;
//# sourceMappingURL=ReadableMessageFactory.js.map
