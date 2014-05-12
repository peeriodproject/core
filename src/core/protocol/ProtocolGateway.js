var ProtocolGateway = (function () {
    function ProtocolGateway(myNode, tcpSocketHandler) {
        this._myNode = null;
        this._tcpSocketHandler = null;
        this._myNode = myNode;
        this._tcpSocketHandler = tcpSocketHandler;
    }
    return ProtocolGateway;
})();

module.exports = ProtocolGateway;
//# sourceMappingURL=ProtocolGateway.js.map
