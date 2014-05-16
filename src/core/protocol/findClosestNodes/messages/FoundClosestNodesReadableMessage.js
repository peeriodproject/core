var Id = require('../../../topology/Id');
var ContactNodeAddressExtractor = require('../../messages/ContactNodeAddressExtractor');

/**
* FoundClosestNodesReadableMessageInterface implementation.
*
* @class core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessage
* @implements core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface
*
* @param {Buffer} payload The buffer to extract the information from.
* @param {core.topology.ContactNodeFactoryInterface} nodeFactory A contact node factory.
* @param {core.topology.ContactNodeAddressFactoryInterface} addressFactory An address factory.
*/
var FoundClosestNodesReadableMessage = (function () {
    function FoundClosestNodesReadableMessage(payload, nodeFactory, addressFactory) {
        /**
        * An address factory used to create the addresses of the found nodes.
        *
        * @member {core.topology.ContactNodeAddressFactoryInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_addressFactory
        */
        this._addressFactory = null;
        /**
        * List of the found nodes.
        *
        * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_foundNodeList
        */
        this._foundNodeList = null;
        /**
        * A node factory used to create the extracted found nodes.
        *
        * @member {core.topology.ContactNodeFactoryInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_nodeFactory
        */
        this._nodeFactory = null;
        /**
        * The byte buffer to work with.
        *
        * @member {Buffer} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_payload
        */
        this._payload = null;
        /**
        * The extracted originally searched for ID.
        *
        * @member {core.topology.IdInterface} core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_searchedForId
        */
        this._searchedForId = null;
        this._payload = payload;
        this._nodeFactory = nodeFactory;
        this._addressFactory = addressFactory;

        this._deconstruct();
    }
    FoundClosestNodesReadableMessage.prototype.discard = function () {
        this._payload = null;
    };

    FoundClosestNodesReadableMessage.prototype.getFoundNodeList = function () {
        return this._foundNodeList;
    };

    FoundClosestNodesReadableMessage.prototype.getSearchedForId = function () {
        return this._searchedForId;
    };

    /**
    * Deconstructs the message into its parts.
    *
    * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_deconstruct
    */
    FoundClosestNodesReadableMessage.prototype._deconstruct = function () {
        this._searchedForId = this._extractId(0);
        this._extractFoundNodeList();
    };

    /**
    * Extracts the found node list from the payload.
    *
    * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_extractFoundNodeList
    */
    FoundClosestNodesReadableMessage.prototype._extractFoundNodeList = function () {
        var doRead = true;
        var result = [];

        var pos = 20;

        while (doRead) {
            if (!this._followedByDelimiter(pos)) {
                doRead = false;
            } else {
                pos += 20;
                var id = this._extractId(pos);
                pos += 20;
                var res = ContactNodeAddressExtractor.extractAddressesAndBytesReadAsArray(this._payload, this._addressFactory, pos);
                result.push(this._nodeFactory.create(id, res[0]));

                pos = res[1];
            }
        }

        this._foundNodeList = result;
    };

    /**
    * Extracts an ID from the given position in the payload.
    *
    * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_extractId
    *
    * @param {number} from The position in the buffer to start from.
    * @returns {core.topology.IdInterface}
    */
    FoundClosestNodesReadableMessage.prototype._extractId = function (from) {
        var idBuffer = new Buffer(20);

        this._payload.copy(idBuffer, 0, from, from + 20);

        return new Id(idBuffer, 160);
    };

    /**
    * Checks if from the given position the next 20 bytes are null bytes.
    *
    * @method core.protocol.findClosestNodes.FoundClosestNodesReadableMessage~_followedByDelimiter
    *
    * @param {number} from The position in the buffer to start from.
    * @returns {boolean}
    */
    FoundClosestNodesReadableMessage.prototype._followedByDelimiter = function (from) {
        var is = true;

        for (var i = 0; i < 20; i++) {
            if (this._payload[from + i] === undefined || this._payload[from + i] !== 0x00) {
                is = false;
            }
        }
        return is;
    };
    return FoundClosestNodesReadableMessage;
})();

module.exports = FoundClosestNodesReadableMessage;
//# sourceMappingURL=FoundClosestNodesReadableMessage.js.map
