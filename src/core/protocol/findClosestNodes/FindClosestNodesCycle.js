/// <reference path='../../../../ts-definitions/node/node.d.ts' />
/**
* FindClosestNodesCycleInterface implementation.
*
* @class core.protocol.findClosestNodes.FindClosestNodesCycle
* @implements core.protocol.findClosestNodes.FindClosestNodesCycleInterface
*
* @param {core.topology.IdInterface} searchForId The ID to search for.
* @param {core.topology.ContactNodeListInterface} startWithList A list of nodes to request in the beginning (up to alpha).
* @param {core.protocol.findClosestNodes.FindClosestNodesManagerInterface} A FindClosestNodesManagerInterface instance to obtain configuration details from.
* @param {core.protocol.net.ProtocolConnectionManagerInterface} Protocol connection manager, used to write messages.
* @param {Function} callback Function to call when the cycle is finished. Gets called with a list of the up to `k` closest confirmed nodes.
*/
var FindClosestNodesCycle = (function () {
    function FindClosestNodesCycle(myNode, searchForId, startWithList, manager, protocolConnectionManager, callback) {
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
        * @member {core.topology.MyNodeInterface} core.protocol.findClosestsNodes.FindClosestNodesCycle~_myNode
        */
        this._myNode = null;
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
        this._myNode = myNode;
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
    /**
    * BEGIN TESTING PURPOSES ONLY
    */
    FindClosestNodesCycle.prototype.getRegisteredIdentifiers = function () {
        return this._registeredIdentifiers;
    };

    FindClosestNodesCycle.prototype.getProbeList = function () {
        return this._probeList;
    };

    FindClosestNodesCycle.prototype.getConfirmedList = function () {
        return this._confirmedList;
    };

    FindClosestNodesCycle.prototype.getAlphaTimeout = function () {
        return this._alphaTimeout;
    };

    FindClosestNodesCycle.prototype.getCycleTimeout = function () {
        return this._cycleTimeout;
    };

    /**
    *
    * END TESTING PURPOSES ONLY
    */
    /**
    * Binds the correct listener to the FindClosestNodesManager instance for received 'FOUND_CLOSEST_NODES' messages.
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_bindListener
    */
    FindClosestNodesCycle.prototype._bindListener = function () {
        var _this = this;
        this._listener = function (from, message) {
            _this._handleReply(from, message);
        };

        this._manager.on(this._searchForId.toHexString(), this._listener);
    };

    /**
    * Sets the timeout, which requests the next alpha nodes in the probeList when elapsed.
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_doAlphaTimeout
    */
    FindClosestNodesCycle.prototype._doAlphaTimeout = function () {
        var _this = this;
        if (!this._alphaTimeout) {
            this._alphaTimeout = setTimeout(function () {
                _this._alphaTimeout = 0;
                _this._requestAlphaNodes();
            }, this._parallelismDelayMillis);
        }
    };

    /**
    * Finishes up the cycle and calls the callback-function provided in the constructor.
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_finish
    */
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

    /**
    * Handles a reply on the searched for ID, i.e. a 'FOUND_CLOSEST_NODES' message.
    * Adds the originating node to the confirmedList. If it is full, the cycle is finished.
    * Otherwise the specified contact node information in the message is added to the probeList (if not yet present).
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_handleReply
    *
    * @param {core.topology.ContactNodeInterface} from The sender of the FOUND_CLOSEST_NODES message
    * @param {core.protocol.findClosestNodes.messages.FoundClosestNodesReadableMessageInterface} message The message payload.
    */
    FindClosestNodesCycle.prototype._handleReply = function (from, message) {
        this._sortInsertNodeInList(from, this._confirmedList);

        if (this._confirmedList.length >= this._k) {
            this._finish();
        } else {
            var returnedList = message.getFoundNodeList();
            var probedPrevLength = this._probeList.length;

            message.discard();

            for (var i = 0; i < returnedList.length; i++) {
                var node = returnedList[i];

                if (node.getId().equals(this._myNode.getId())) {
                    continue;
                }

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

    /**
    * Takes up to alpha nodes from the probeList and writes a 'FIND_CLOSEST_NODES' request to them, thus removing them
    * from the probeList.
    * If at the end the probeList is empty, a timeout is set which finishes up the cycle when elapsed (and no new nodes to probe fly in).
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_requestAlphaNodes
    */
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

    /**
    * Inserts a node in a list at the correct position. Correct position means that the list is sorted by distance to
    * the searched for ID, from shorter distance to longer distance.
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_sortInsertNodeList
    *
    * @param {core.topology.ContactNodeInterface} node The node to insert.
    * @param {core.topology.ContactNodeListInterface} list The list in which to insert the node.
    */
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

    /**
    * Removes the bound listener from the FindClosestNodesManager
    *
    * @method core.protocol.findClosestNodes.FindClosestNodesCycle~_unbindListener
    */
    FindClosestNodesCycle.prototype._unbindListener = function () {
        this._manager.removeListener(this._searchForId.toHexString(), this._listener);
    };
    return FindClosestNodesCycle;
})();

module.exports = FindClosestNodesCycle;
//# sourceMappingURL=FindClosestNodesCycle.js.map
