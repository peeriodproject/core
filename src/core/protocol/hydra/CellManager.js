var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var events = require('events');
var crypto = require('crypto');

var AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
var HKDF = require('../../crypto/HKDF');

/**
* CellManagerInterface implementation.
*
* @class core.protocol.hydra.CellManager
* @extends NodeJS.EventEmitter
* @implements core.protocol.hydra.CellManager
*
* @param {core.config.ConfigInterface} hydraConfig Hydra configuration.
* @param {core.protocol.hydra.ConnectionManagerInterface} A working connection manager instance.
* @param {core.protocol.hydra.HydraMessageCenterInterface} A working message center.
* @param {core.protocol.hydra.HydraCellFactoryInterface} A cell factory.
*/
var CellManager = (function (_super) {
    __extends(CellManager, _super);
    function CellManager(hydraConfig, connectionManager, messageCenter, cellFactory) {
        _super.call(this);
        /**
        * The number of CREATE_CELL_ADDITIVE messages needed to complete a batch of additive messages.
        *
        * @member {number} core.protocol.hydra.CellManager~_additiveSharingMsgAmount
        */
        this._additiveSharingMsgAmount = 0;
        /**
        * Stores the hydra cell factory.
        *
        * @member {core.protocol.hydra.HydraCellFactoryInterface} core.protocol.hydra.CellManager~_cellFactory
        */
        this._cellFactory = null;
        /**
        * Stores the maintained cells by their predecessor's circuit id.
        *
        * @member {Object} core.protocol.hydra.CellManager~_cellsByPredecessorCircuitId
        */
        this._cellsByPredecessorCircuitId = {};
        /**
        * Stores the connection manager.
        *
        * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.CellManager~_connectionManager
        */
        this._connectionManager = null;
        /**
        * The list of maintained working - and thus production-ready - cells.
        *
        * @member {Array<core.protocol.hydra.HydraCellInterface>} core.protocol.hydra.CellManager~_maintainedCells
        */
        this._maintainedCells = [];
        /**
        * The number of maximum circuits a client can participate in.
        *
        * @member {number} core.protocol.hydra.CellManager~_maximumNumberOfMaintainedCells
        */
        this._maximumNumberOfMaintainedCells = 0;
        /**
        * Stores the message center.
        *
        * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.CellManager~_messageCenter
        */
        this._messageCenter = null;
        /**
        * The list of CREATE_CELL_ADDITIVE requests which do not have a complete batch of messages yet.
        *
        * @member {Object} core.protocol.hydra.CellManager~_pendingRequests
        */
        this._pendingRequests = {};
        /**
        * Number of milliseconds to wait for the completion of an additive batch until the messages are discarded.
        *
        * @member {number} core.protocol.hydra.CellManager~_waitForAdditiveBatchFinishInMs
        */
        this._waitForAdditiveBatchFinishInMs = 0;

        this._maximumNumberOfMaintainedCells = hydraConfig.get('hydra.maximumNumberOfMaintainedCells');
        this._additiveSharingMsgAmount = hydraConfig.get('hydra.additiveSharingNodeAmount') + 1;
        this._waitForAdditiveBatchFinishInMs = hydraConfig.get('hydra.waitForAdditiveBatchFinishInSeconds') * 1000;
        this._messageCenter = messageCenter;
        this._connectionManager = connectionManager;
        this._cellFactory = cellFactory;

        this._setupListeners();
    }
    /**
    * BEGIN TESTING PURPOSES
    */
    CellManager.prototype.getPending = function () {
        return this._pendingRequests;
    };

    CellManager.prototype.getCells = function () {
        return this._maintainedCells;
    };

    /**
    * END TESTING PURPOSES
    */
    CellManager.prototype.pipeFileTransferMessage = function (predecessorCircuitId, payload) {
        var cell = this._cellsByPredecessorCircuitId[predecessorCircuitId];

        if (cell) {
            cell.sendFileMessage(payload);
            return true;
        }

        return false;
    };

    CellManager.prototype.teardownCell = function (predecessorCircuitId) {
        var cell = this._cellsByPredecessorCircuitId[predecessorCircuitId];

        if (cell) {
            cell.teardown();
        }
    };

    /**
    * Accepts a CREATE_CELL_ADDITIVE request.
    * Computes the secrets, adds the keys, and finally pipes out the CELL_CREATED_REJECTED message.
    * Creates a hydra cell and hooks the 'isTornDown' event to it.
    *
    * Note to myself: It is absolutely crucial that the termination listener is hook to the cell in its constructor (or subsequent calls)
    *
    * @method core.protocol.hydra.CellManager~_acceptCreateCellRequest
    *
    * @param {core.protocol.hydra.PendingCreateCellRequest} pending The request object to accept.
    */
    CellManager.prototype._acceptCreateCellRequest = function (pending) {
        var _this = this;
        var diffie = crypto.getDiffieHellman('modp14');
        var dhPublicKey = diffie.generateKeys();
        var secret = diffie.computeSecret(AdditiveSharingScheme.getCleartext(pending.additivePayloads, 256));
        var sha1 = crypto.createHash('sha1').update(secret).digest();
        var hkdf = new HKDF('sha256', secret);
        var keysConcat = hkdf.derive(32, new Buffer(pending.uuid, 'hex'));

        // this must be the opposite side, so switch keys
        var incomingKey = keysConcat.slice(0, 16);
        var outgoingKey = keysConcat.slice(16);

        var initiatorNode = pending.initiator;
        initiatorNode.incomingKey = incomingKey;
        initiatorNode.outgoingKey = outgoingKey;

        this._messageCenter.sendCellCreatedRejectedMessage(initiatorNode, pending.uuid, sha1, dhPublicKey);

        var cell = this._cellFactory.create(initiatorNode);

        this._maintainedCells.push(cell);
        this._cellsByPredecessorCircuitId[cell.getPredecessorCircuitId()] = cell;

        cell.once('isTornDown', function () {
            _this._onTornDownCell(cell);
        });

        cell.on('fileTransferMessage', function (circuitId, payload) {
            _this.emit('cellReceivedTransferMessage', circuitId, payload);
        });
    };

    /**
    * Self explanatory one-liner
    *
    * @method core.protocol.hydra.CellManager~_canMaintAdditionalCell
    *
    * @returns {boolean}
    */
    CellManager.prototype._canMaintainAdditionalCell = function () {
        return this._maintainedCells.length < this._maximumNumberOfMaintainedCells;
    };

    /**
    * Self explanatory multi-liner.
    *
    * @method core.protocol.hydra.CellManager~_cleanupTimeoutAndTerminationListener
    *
    * @param {core.protocol.hydra.PendingCreateCellRequest) pending The request object with a timeout and / or termination listener
    */
    CellManager.prototype._cleanupTimeoutAndTerminationListener = function (pending) {
        if (pending.timeout) {
            global.clearTimeout(pending.timeout);
            pending.timeout = null;
        }

        if (pending.terminationListener) {
            this._connectionManager.removeListener('circuitTermination', pending.terminationListener);
            pending.terminationListener = null;
        }
    };

    /**
    * Method that gets called when the socket of a CircuitNode closes which is assigned to a pending request.
    * Removes all listeners and cleans up.
    *
    * @method core.protocol.hydra.CellManager~_onCircuitTermination
    *
    * @param {string} uuid The UUID of the additive sharing scheme the closed socket of the initiator referred to.
    */
    CellManager.prototype._onCircuitTermination = function (uuid) {
        var pending = this._pendingRequests[uuid];

        this._cleanupTimeoutAndTerminationListener(pending);

        delete this._pendingRequests[uuid];
    };

    /**
    * Method that gets called when a pending request could complete its batch of additive messages.
    * Checks if the client can endure another cell, if yes, accepts, else rejects.
    * In any case, the pending object is cleared up.
    *
    * @method core.protocol.hydra.CellManager~_onCompleteBatchRequest
    *
    * @param {core.protocol.hydra.PendingCreateCellRequest} pending The pending request with the completed batch.
    */
    CellManager.prototype._onCompleteBatchRequest = function (pending) {
        this._cleanupTimeoutAndTerminationListener(pending);

        if (this._canMaintainAdditionalCell()) {
            this._acceptCreateCellRequest(pending);
        } else {
            this._messageCenter.sendCellCreatedRejectedMessage(pending.initiator, pending.uuid);
            this._connectionManager.removeFromCircuitNodes(pending.initiator, false);
        }

        delete this._pendingRequests[pending.uuid];
    };

    /**
    * The main method when a CREATE_CELL_ADDITIVE message rolls in.
    * Constructs a new pending request (and its timeout) or merely appends the additive payload to it.
    * If the message is from the initiator of the request, a node is created, the socket assigned to it and
    * added to the circuit nodes of the connection manager. The the circuit termination event is bound to it.
    *
    * Finalizes the request if the batch is complete.
    *
    * @method core.protocol.hydra.CellManager~_onCreateCellMessage
    *
    * @param {string} socketIdentifier The identifier of the socket the message came through.
    * @param {core.protocol.hydra.ReadableCreateCellAdditiveMessageInterface} message The received CREATE_CELL_ADDITIVE message
    */
    CellManager.prototype._onCreateCellMessage = function (socketIdentifier, message) {
        var _this = this;
        var uuid = message.getUUID();
        var pending = this._pendingRequests[uuid];

        if (!pending) {
            pending = this._pendingRequests[uuid] = {
                uuid: uuid,
                additivePayloads: [],
                timeout: global.setTimeout(function (uuid) {
                    _this._onPendingRequestTimeout(uuid);
                    _this.emit('timeout'); // testing only
                }, this._waitForAdditiveBatchFinishInMs, uuid)
            };
        }

        pending.additivePayloads.push(message.getAdditivePayload());

        if (message.isInitiator()) {
            var circuitId = message.getCircuitId();
            var initiatorNode = {
                circuitId: circuitId
            };

            this._connectionManager.addToCircuitNodes(socketIdentifier, initiatorNode);

            pending.circuitId = circuitId;
            pending.initiator = initiatorNode;
            pending.terminationListener = function (terminatedCircId) {
                if (terminatedCircId === circuitId) {
                    _this._onCircuitTermination(uuid);
                }
            };

            this._connectionManager.on('circuitTermination', pending.terminationListener);
        }

        if (pending.additivePayloads.length === this._additiveSharingMsgAmount && pending.initiator) {
            this._onCompleteBatchRequest(pending);
        }
    };

    /**
    * Method that gets called when the batch of a request could not be completed in a given time and its
    * timeout elapses. Basically cleans up everything and removes the initator node from the connection manager's
    * circuitNode list (if present) (plus closing the socket).
    *
    * @method core.protocol.hydra.CellManager~_onPendingRequestTimeout
    *
    * @param {string} uuid The UUID of the additive sharing of the pending request.
    */
    CellManager.prototype._onPendingRequestTimeout = function (uuid) {
        var pending = this._pendingRequests[uuid];
        var initiatorNode = pending.initiator;

        pending.timeout = null;
        this._cleanupTimeoutAndTerminationListener(pending);

        if (initiatorNode) {
            this._connectionManager.removeFromCircuitNodes(initiatorNode);
        }

        delete this._pendingRequests[uuid];
    };

    /**
    * Method that gets called when an already created hydra cell has been torn down.
    * Removes the cell from the list of maintained cells.
    *
    * @method core.protocol.hydra.CellManager~_onTornDownCell
    *
    * @param {core.protocol.hydra.HydraCellInterface} cell The torn-down cell
    */
    CellManager.prototype._onTornDownCell = function (cell) {
        cell.removeAllListeners('fileTransferMessage');

        delete this._cellsByPredecessorCircuitId[cell.getPredecessorCircuitId()];

        for (var i = 0, l = this._maintainedCells.length; i < l; i++) {
            if (this._maintainedCells[i] === cell) {
                this._maintainedCells.splice(i, 1);
                break;
            }
        }
    };

    /**
    * Sets up the listener on the CREATE_CELL_ADDITIVE event of the message center.
    *
    * @method core.protocol.hydra.CellManager~_setupListeners
    */
    CellManager.prototype._setupListeners = function () {
        var _this = this;
        this._messageCenter.on('CREATE_CELL_ADDITIVE', function (socketIdentifier, msg) {
            _this._onCreateCellMessage(socketIdentifier, msg);
        });
    };
    return CellManager;
})(events.EventEmitter);

module.exports = CellManager;
//# sourceMappingURL=CellManager.js.map
