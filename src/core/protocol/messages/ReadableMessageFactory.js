var ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');
var ContactNodeFactory = require('../../topology/ContactNodeFactory');
var ReadableMessage = require('./ReadableMessage');

/**
* @class core.protocol.messages.ReadableMessageFactory
* @implements core.protocol.messages.ReadableMessageFactoryInterface
*/
var ReadableMessageFactory = (function () {
    function ReadableMessageFactory() {
        /**
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.messages.ReadableMessageFactory~_nodeFactory
        */
        this._nodeFactory = null;
        /**
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
