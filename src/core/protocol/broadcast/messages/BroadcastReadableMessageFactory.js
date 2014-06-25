var BroadcastReadableMessage = require('./BroadcastReadableMessage');

/**
* BroadcastReadableMessageFactoryInterface implementation
*
* @class core.protocol.broadcast.BroadcastReadableMessageFactory
* @implements core.protocol.broadcast.BroadcastReadableMessageFactoryInterface
*/
var BroadcastReadableMessageFactory = (function () {
    function BroadcastReadableMessageFactory() {
    }
    BroadcastReadableMessageFactory.prototype.create = function (buffer) {
        var msg = null;

        try  {
            msg = new BroadcastReadableMessage(buffer);
        } catch (e) {
        }

        return msg;
    };
    return BroadcastReadableMessageFactory;
})();

module.exports = BroadcastReadableMessageFactory;
//# sourceMappingURL=BroadcastReadableMessageFactory.js.map
