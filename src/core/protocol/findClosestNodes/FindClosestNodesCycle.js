var FindClosestNodesCycle = (function () {
    function FindClosestNodesCycle(searchForId, startWithList, manager, protocolConnectionManager, callback) {
        this._manager = null;
        this._protocolConnectionManager = null;
        this._k = 0;
        this._alpha = 0;
        this._cycleExpirationMillis = 0;
        this._parallelismDelayMillis = 0;
        this._searchForId = null;
        this._confirmedList = [];
        this._probeList = null;
        this._registeredIdentifiers = [];
        this._listener = null;
        this._cycleTimeout = 0;
        this._alphaTimeout = 0;
        this._searchForId = searchForId;
        this._probeList = startWithList;
        this._manager = manager;
        this._protocolConnectionManager = protocolConnectionManager;
        this._callback = callback;

        this._k = this._manager.getK();
        this._alpha = this._manager.getAlpha();
        this._cycleExpirationMillis = this._manager.getCycleExpirationMillis();
        this._parallelismDelayMillis = this._manager.getParallelismDelayMillis();

        for (var i = 0; i < this._probeList.length; i++) {
            this._registeredIdentifiers.push(this._probeList[i].getId().toHexString());
        }

        this._bindListener();

        this._requestAlphaNodes();
    }
    FindClosestNodesCycle.prototype._bindListener = function () {
        var _this = this;
        this._listener = function (from, message) {
            _this._handleReply(from, message);
        };

        this._manager.on(this._searchForId.toHexString(), this._listener);
    };

    FindClosestNodesCycle.prototype._unbindListener = function () {
        this._manager.removeListener(this._searchForId.toHexString(), this._listener);
    };

    FindClosestNodesCycle.prototype._handleReply = function (from, message) {
        this._sortInsertNodeInList(from, this._confirmedList);

        if (this._confirmedList.length >= this._k) {
            this._finish();
        } else {
            var returnedList = message.getFoundNodeList();
            var probedPrevLength = this._probeList.length;

            for (var i = 0; i < returnedList.length; i++) {
                var node = returnedList[i];
                var identifier = node.getId().toHexString();

                if (this._registeredIdentifiers.indexOf(identifier) === -1) {
                    this._sortInsertNodeInList(node, this._probeList);
                    this._registeredIdentifiers.push(identifier);
                }
            }

            if (probedPrevLength === 0 && this._probeList.length) {
                if (this._cycleTimeout) {
                    clearTimeout(this._cycleTimeout);
                    this._cycleTimeout = 0;
                }
                this._doAlphaTimeout();
            }
        }
    };

    FindClosestNodesCycle.prototype._sortInsertNodeInList = function (node, list) {
        var index = -1;
        var nodeId = node.getId();
        var doReturn = false;

        for (var i = 0; i < list.length; i++) {
            var dist = this._searchForId.compareDistance(nodeId, list[i].getId());
            if (dist > 0) {
                index = i;
                break;
            } else if (dist === 0) {
                doReturn = true;
                break;
            }
        }

        if (doReturn) {
            return;
        }

        if (index > -1) {
            list.splice(index, 0, node);
        } else {
            list.push(node);
        }
    };

    FindClosestNodesCycle.prototype._requestAlphaNodes = function () {
        var _this = this;
        var times = Math.min(this._probeList.length, this._alpha);

        while (times--) {
            this._protocolConnectionManager.writeMessageTo(this._probeList.splice(0, 1)[0], 'FIND_CLOSEST_NODES', this._searchForId.getBuffer());
        }

        if (!this._probeList.length) {
            if (this._cycleTimeout) {
                clearTimeout(this._cycleTimeout);
                this._cycleTimeout = 0;
            }

            this._cycleTimeout = setTimeout(function () {
                _this._finish();
            }, this._cycleExpirationMillis);
        } else {
            this._doAlphaTimeout();
        }
    };

    FindClosestNodesCycle.prototype._doAlphaTimeout = function () {
        var _this = this;
        if (!this._alphaTimeout) {
            this._alphaTimeout = setTimeout(function () {
                _this._alphaTimeout = 0;
                _this._requestAlphaNodes();
            }, this._parallelismDelayMillis);
        }
    };

    FindClosestNodesCycle.prototype._finish = function () {
        this._unbindListener();

        if (this._cycleTimeout) {
            clearTimeout(this._cycleTimeout);
            this._cycleTimeout = 0;
        }
        if (this._alphaTimeout) {
            clearTimeout(this._alphaTimeout);
            this._alphaTimeout = 0;
        }

        this._callback(this._confirmedList);
    };
    return FindClosestNodesCycle;
})();

module.exports = FindClosestNodesCycle;
//# sourceMappingURL=FindClosestNodesCycle.js.map
