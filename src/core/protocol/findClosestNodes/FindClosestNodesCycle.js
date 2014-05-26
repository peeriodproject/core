/**
* FindClosestNodesCycleInterface implementation.
*
* @class core.protocol.findClosestNodes.FindClosestNodeCycle
* @implements core.protocol.findClosestNodes.FindClosestNodeCycleInterface
*
* @param {core.topology.IdInterface} searchForId The ID to search for.
* @param {core.topology.ContactNodeListInterface} startWithList A list of nodes to request in the beginning (up to alpha).
* @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} A FindClosestNodesManagerInterface instance to obtain configuration details from.
* @param {core.protocol.net.ProtocolConnectionManagerInterface} Protocol connection manager, used to write messages.
* @param {Function} callback Function to call when the cycle is finished. Gets called with a list of the up to `k` closest confirmed nodes.
*/
var FindClosestNodesCycle = (function () {
    function FindClosestNodesCycle(searchForId, startWithList, manager, protocolConnectionManager, callback) {
        /**
        * Number indicating how many nodes from the probeList to request in one go.
        *
        * @member {number} core.protocol.findClosestNodes.FindClosestNodesCycle~_alpha
        */
        this._alpha = 0;
        /**
        * Holds the timeout, which requests further node when elapsed.
        *
        * @member {NodeJS.Timer|number} core.protocol.findClosestNodes.FindClosestNodesCycle~_alphaTimeout
        */
        this._alphaTimeout = 0;
        /**
        * The resulting list of close nodes, which have been successfully probed.
        *
        * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_confirmedList
        */
        this._confirmedList = [];
        /**
        * Milliseconds indicating how long the cycle should wait when all nodes from the probeList have been requested and
        * the confirmedList is not full yet, until the cycle is considered finished
        *
        * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_cycleExpirationMillis
        */
        this._cycleExpirationMillis = 0;
        /**
        * Holds the timeout, which finishes a cycle when elapsed.
        *
        * @member {NodeJS.Timer|number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_cycleTimeout
        */
        this._cycleTimeout = 0;
        /**
        * Maxmimum number of close nodes to return. Cycle is considered finished as soon as the confirmedList holds `k`
        * entries.
        *
        * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_k
        */
        this._k = 0;
        /**
        * The listener function on the cycle manager's event which gets emitted as the hex string representation
        * of the searched for ID.
        *
        * @member {Function} core.protocol.findClosestsNodes.FindClosestNodesCycle~_listener
        */
        this._listener = null;
        /**
        * The manager emitting the events on 'FOUND_CLOSEST_NODES' messages and which holds the configuration details.
        *
        * @member {core.protocol.findClosestsNodes.FindClosestNodesManagerInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_manager
        */
        this._manager = null;
        /**
        * Milliseconds indicating how much time should pass between to request flights.
        *
        * @member {number} core.protocol.findClosestsNodes.FindClosestNodesCycle~_parallelismDelayMillis
        */
        this._parallelismDelayMillis = 0;
        /**
        * The list of nodes who need probing. As soon as a node has been requested, it is removed from the list.
        *
        * @member {core.topology.ContactNodeListInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_probeList
        */
        this._probeList = null;
        /**
        * Protocol connection manager used for writing out 'FIND_CLOSEST_NODES' requests
        *
        * @member {core.protocol.net.ProtocolConnectionManagerInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_protocolConnectionManager
        */
        this._protocolConnectionManager = null;
        /**
        * As requested nodes are instantaneously removed from the probeList, this list of hex string represenations keeps track of
        * nodes which have either been probed or are still in the probeList. Used to avoid requesting nodes multiple times or cluttering
        * the lists with duplicated.
        *
        * @member {Array<string>} core.protocol.findClosestNodes.FindClosestNodesCycle~_registeredIdentifiers
        */
        this._registeredIdentifiers = [];
        /**
        * The ID to search for.
        *
        * @member {core.topology.IdInterface} core.protocol.findClosestNodes.FindClosestNodesCycle~_searchForId
        */
        this._searchForId = null;
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
