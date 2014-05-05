/**
* @class core.topology.ContactNode
* @implements core.topology.ContactNodeInterface
*
* @param {core.topology.IdInterface} id The id of the contact node
* @param {core.topology.ContactNodeAddressListInterface} addresses The addresses of the contact node
* @param {number} lastSeen The timestamp at which the contact node was last seen
*/
var ContactNode = (function () {
    function ContactNode(id, addresses, lastSeen) {
        /**
        * The addresses of the contact node
        *
        * @member {core.topology.ContactNodeAddressListInterface} core.topology.ContactNode~_addresses
        */
        this._addresses = null;
        /**
        * The Id of the contact node
        *
        * @member {core.topology.IdInterface} core.topology.ContactNode~_id
        */
        this._id = null;
        /**
        * A timestamp at which the contact node was last seen
        *
        * @member {number} core.topology.ContactNode~_lastSeen
        */
        this._lastSeen = 0;
        this._id = id;
        this._addresses = addresses;
        this._lastSeen = lastSeen;
    }
    ContactNode.prototype.getAddresses = function () {
        return this._addresses;
    };

    ContactNode.prototype.getId = function () {
        return this._id;
    };

    ContactNode.prototype.getLastSeen = function () {
        return this._lastSeen;
    };
    return ContactNode;
})();

module.exports = ContactNode;
//# sourceMappingURL=ContactNode.js.map
