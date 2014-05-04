var ContactNode = (function () {
    function ContactNode(id, addresses, lastSeen) {
        this._id = null;
        this._addresses = null;
        this._lastSeen = 0;
        this._id = id;
        this._addresses = addresses;
        this._lastSeen = lastSeen;
    }
    ContactNode.prototype.getId = function () {
        return this._id;
    };

    ContactNode.prototype.getAddresses = function () {
        return this._addresses;
    };

    ContactNode.prototype.getLastSeen = function () {
        return this._lastSeen;
    };
    return ContactNode;
})();

module.exports = ContactNode;
//# sourceMappingURL=ContactNode.js.map
