var ContactNodeAddress = (function () {
    function ContactNodeAddress(ip, port) {
        this._ip = null;
        this._port = 0;
        this._ip = ip;
        this._port = port;
    }
    ContactNodeAddress.prototype.getIp = function () {
        return this._ip;
    };

    ContactNodeAddress.prototype.getPort = function () {
        return this._port;
    };
    return ContactNodeAddress;
})();

module.exports = ContactNodeAddress;
//# sourceMappingURL=ContactNodeAddress.js.map
