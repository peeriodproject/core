var ContactNodeFactory = require('../../topology/ContactNodeFactory');

var ContactNodeAddressFactory = require('../../topology/ContactNodeAddressFactory');

var ReadableMessage = require('./ReadableMessage');

var ReadableMessageFactory = (function () {
    function ReadableMessageFactory() {
        this._nodeFactory = null;
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
