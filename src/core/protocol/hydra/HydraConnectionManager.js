var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');

var HydraConnectionManager = (function (_super) {
    __extends(HydraConnectionManager, _super);
    function HydraConnectionManager(hydraConfig, protocolConnectionManager) {
        _super.call(this);
        this._protocolConnectionManager = null;
        this._keepMessageInPipelineForMs = 0;
        this._waitForReconnectMs = 0;
        this._retryConnectionMax = 0;
        this._openSockets = {};
        this._circuitNodes = {};

        this._protocolConnectionManager = protocolConnectionManager;
        this._keepMessageInPipelineForMs = hydraConfig.get('hydra.keepMessageInPipelineForSeconds') * 1000;
        this._waitForReconnectMs = hydraConfig.get('hydra.waitForReconnectInSeconds') * 1000;
        this._retryConnectionMax = hydraConfig.get('hydra.retryConnectionMax');

        this._setupListeners();
    }
    /**
    * BEGIN Testing purposes only
    */
    HydraConnectionManager.prototype.getOpenSocketList = function () {
        return this._openSockets;
    };

    HydraConnectionManager.prototype.getCircuitNodeList = function () {
        return this._circuitNodes;
    };

    /**
    * END Testing purposes only
    */
    HydraConnectionManager.prototype.addToCircuitNodes = function (node) {
        var ip = node.ip;

        if (!this._circuitNodes[ip]) {
            this._circuitNodes[ip] = node;

            var ident = this._openSockets[ip];
            if (ident) {
                this._protocolConnectionManager.keepHydraSocketOpen(ident);
            }
        }
    };

    HydraConnectionManager.prototype.removeFromCircuitNodes = function (node) {
        var ip = node.ip;

        delete this._circuitNodes[ip];

        var ident = this._openSockets[ip];
        if (ident) {
            this._protocolConnectionManager.keepHydraSocketNoLongerOpen(ident);
        }
    };

    HydraConnectionManager.prototype.pipeMessage = function (payload, to) {
        var _this = this;
        var openSocketIdent = this._openSockets[to.ip];

        if (openSocketIdent) {
            this._protocolConnectionManager.hydraWriteMessageTo(openSocketIdent, payload);
        } else {
            var messageListener = function (identifier) {
                _this._protocolConnectionManager.hydraWriteMessageTo(identifier, payload);
                global.clearTimeout(messageTimeout);
            };

            var messageTimeout = global.setTimeout(function (listener) {
                _this.removeListener(to.ip, listener);
            }, this._keepMessageInPipelineForMs, messageListener);

            this.once(to.ip, messageListener);

            if (to.port) {
                this._protocolConnectionManager.hydraConnectTo(to.port, to.ip);
            }
        }
    };

    HydraConnectionManager.prototype._rehookConnection = function (node) {
        var _this = this;
        if (!node.port) {
            // we have to wait
            var waitTimeout = global.setTimeout(function () {
                _this.emit('globalConnectionFail', node.ip);
            }, this._waitForReconnectMs);

            this.once(node.ip, function () {
                global.clearTimeout(waitTimeout);
                _this.emit('reconnectedTo', node.ip);
            });
        } else {
            // we need to force it
            var connect = function (num) {
                if (num < _this._retryConnectionMax) {
                    _this._protocolConnectionManager.hydraConnectTo(node.port, node.ip, function (err) {
                        if (err) {
                            connect(++num);
                        } else {
                            _this.emit('reconnectedTo', node.ip);
                        }
                    });
                } else {
                    _this.emit('globalConnectionFail', node.ip);
                }
            };

            connect(0);
        }
    };

    HydraConnectionManager.prototype._setupListeners = function () {
        var _this = this;
        this._protocolConnectionManager.on('hydraSocket', function (identifier, socket) {
            var ip = socket.getIP();

            if (ip && !_this._openSockets[ip]) {
                _this._openSockets[ip] = identifier;

                if (_this._circuitNodes[ip]) {
                    _this._protocolConnectionManager.keepHydraSocketOpen(identifier);
                }

                _this.emit(ip, identifier);
            } else {
                socket.end();
            }
        });

        this._protocolConnectionManager.on('terminatedConnection', function (identifier) {
            var ips = Object.keys(_this._openSockets);
            var ipsLength = ips.length;
            var theIp = null;

            for (var i = 0; i < ipsLength; i++) {
                if (_this._openSockets[ips[i]] === identifier) {
                    theIp = ips[i];
                }
            }

            if (theIp) {
                delete _this._openSockets[theIp];
            }

            var node = _this._circuitNodes[theIp];
            if (node) {
                _this._rehookConnection(node);
            }
        });
    };
    return HydraConnectionManager;
})(events.EventEmitter);

module.exports = HydraConnectionManager;
//# sourceMappingURL=HydraConnectionManager.js.map
