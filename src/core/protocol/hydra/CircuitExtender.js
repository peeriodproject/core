var crypto = require('crypto');

var AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');

var CircuitExtender = (function () {
    function CircuitExtender(reactionTimeInMs, connectionManager, messageCenter, encDecHandler) {
        this._reactionTimeInMs = 0;
        this._connectionManager = null;
        this._messageCenter = null;
        this._encDecHandler = null;
        this._nodes = [];
        this._circuitId = null;
        this._currentDiffieHellman = null;
        this._currentCallback = null;
        this._currentUUID = null;
        this._reactionTimeInMs = reactionTimeInMs;
        this._connectionManager = connectionManager;
        this._messageCenter = messageCenter;
        this._encDecHandler = encDecHandler;

        this._nodes = this._encDecHandler.getNodes();
    }
    CircuitExtender.prototype.extend = function (nodeToExtendWith, additiveNodes, callback) {
        var isFirst = this._nodes.length === 0;

        this._currentCallback = callback;

        if (isFirst) {
            this._circuitId = crypto.pseudoRandomBytes(16).toString('hex');
            /**
            * @todo: Setup the listener here
            */
        }

        this._currentUUID = crypto.pseudoRandomBytes(16).toString('hex');

        this._currentDiffieHellman = crypto.getDiffieHellman('modp14');

        var dhPublicKey = this._currentDiffieHellman.generateKeys();

        AdditiveSharingScheme.getShares(dhPublicKey, additiveNodes.length + 1, 2048, function (shares) {
            // okay, now let the message center pipe it through
        });
    };
    return CircuitExtender;
})();

module.exports = CircuitExtender;
//# sourceMappingURL=CircuitExtender.js.map
