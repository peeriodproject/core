import events = require('events');
import crypto = require('crypto');

import AdditiveSharingScheme = require('../../crypto/AdditiveSharingScheme');
import HKDF = require('../../crypto/HKDF');

import ConfigInterface = require('../../config/interfaces/ConfigInterface');
import CellManagerInterface = require('./interfaces/CellManagerInterface');
import HydraNode = require('./interfaces/HydraNode');
import PendingCreateCellRequest = require('./interfaces/PendingCreateCellRequest');
import ConnectionManagerInterface = require('./interfaces/ConnectionManagerInterface');
import HydraMessageCenterInterface = require('./interfaces/HydraMessageCenterInterface');
import HydraCellInterface = require('./interfaces/HydraCellInterface');
import HydraCellFactoryInterface = require('./interfaces/HydraCellFactoryInterface');
import ReadableCreateCellAdditiveMessageInterface = require('./messages/interfaces/ReadableCreateCellAdditiveMessageInterface');

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
class CellManager extends events.EventEmitter implements CellManagerInterface {

	/**
	 * The number of CREATE_CELL_ADDITIVE messages needed to complete a batch of additive messages.
	 *
	 * @member {number} core.protocol.hydra.CellManager~_additiveSharingMsgAmount
	 */
	private _additiveSharingMsgAmount:number = 0;

	/**
	 * Stores the hydra cell factory.
	 *
	 * @member {core.protocol.hydra.HydraCellFactoryInterface} core.protocol.hydra.CellManager~_cellFactory
	 */
	private _cellFactory:HydraCellFactoryInterface = null;

	/**
	 * Stores the connection manager.
	 *
	 * @member {core.protocol.hydra.ConnectionManagerInterface} core.protocol.hydra.CellManager~_connectionManager
	 */
	private _connectionManager:ConnectionManagerInterface = null;

	/**
	 * The list of maintained working - and thus production-ready - cells.
	 *
	 * @member {Array<core.protocol.hydra.HydraCellInterface>} core.protocol.hydra.CellManager~_maintainedCells
	 */
	private _maintainedCells:Array<HydraCellInterface> = [];

	/**
	 * The number of maximum circuits a client can participate in.
	 *
	 * @member {number} core.protocol.hydra.CellManager~_maximumNumberOfMaintainedCells
	 */
	private _maximumNumberOfMaintainedCells:number = 0;

	/**
	 * Stores the message center.
	 *
	 * @member {core.protocol.hydra.HydraMessageCenterInterface} core.protocol.hydra.CellManager~_messageCenter
	 */
	private _messageCenter:HydraMessageCenterInterface = null;

	/**
	 * The list of CREATE_CELL_ADDITIVE requests which do not have a complete batch of messages yet.
	 *
	 * @member {Array<core.protocol.hydra.PendingCreateCellRequest>} core.protocol.hydra.CellManager~_pendingRequests
	 */
	private _pendingRequests:Array<PendingCreateCellRequest> = [];

	/**
	 * Number of milliseconds to wait for the completion of an additive batch until the messages are discarded.
	 *
	 * @member {number} core.protocol.hydra.CellManager~_waitForAdditiveBatchFinishInMs
	 */
	private _waitForAdditiveBatchFinishInMs:number = 0;

	public constructor (hydraConfig:ConfigInterface, connectionManager:ConnectionManagerInterface, messageCenter:HydraMessageCenterInterface, cellFactory:HydraCellFactoryInterface) {
		super();

		this._maximumNumberOfMaintainedCells = hydraConfig.get('hydra.maximumNumberOfMaintainedCells');
		this._additiveSharingMsgAmount = hydraConfig.get('hydra.additiveSharingNodeAmount') + 1;
		this._waitForAdditiveBatchFinishInMs = hydraConfig.get('hydra.waitForAdditiveBatchFinishInSeconds') * 1000;
		this._messageCenter = messageCenter;
		this._connectionManager = connectionManager;
		this._cellFactory = cellFactory;

		this._setupListeners();
	}

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
	private _acceptCreateCellRequest (pending:PendingCreateCellRequest):void {
		var diffie:crypto.DiffieHellman = crypto.getDiffieHellman('modp14');
		var dhPublicKey:Buffer = diffie.generateKeys();
		var secret:Buffer = diffie.computeSecret(AdditiveSharingScheme.getCleartext(pending.additivePayloads, 256));
		var sha1:Buffer = crypto.createHash('sha1').update(secret).digest();
		var hkdf:HKDF = new HKDF('sha256', secret);
		var keysConcat:Buffer = hkdf.derive(32, new Buffer(pending.uuid, 'hex'));

		// this must be the opposite side, so switch keys
		var incomingKey:Buffer = keysConcat.slice(0, 16);
		var outgoingKey:Buffer = keysConcat.slice(16);

		var initiatorNode:HydraNode = pending.initiator;
		initiatorNode.incomingKey = incomingKey;
		initiatorNode.outgoingKey = outgoingKey;

		// @todo here we have to create the HydraCell (in the HydraCell, hook the temrination listener AT ONCE)

		this._messageCenter.sendCellCreatedRejectedMessage(initiatorNode, pending.uuid, sha1, dhPublicKey);

		var cell:HydraCellInterface = this._cellFactory.create(initiatorNode);

		this._maintainedCells.push(cell);

		cell.once('isTornDown', () => {
			this._onTornDownCell(cell);
		});
	}

	/**
	 * Self explanatory one-liner
	 *
	 * @method core.protocol.hydra.CellManager~_canMaintAdditionalCell
	 *
	 * @returns {boolean}
	 */
	private _canMaintainAdditionalCell ():boolean {
		return this._maintainedCells.length < this._maximumNumberOfMaintainedCells;
	}

	/**
	 * Self explanatory multi-liner.
	 *
	 * @method core.protocol.hydra.CellManager~_cleanupTimeoutAndTerminationListener
	 *
	 * @param {core.protocol.hydra.PendingCreateCellRequest) pending The request object with a timeout and / or termination listener
	 */
	private _cleanupTimeoutAndTerminationListener (pending:PendingCreateCellRequest):void {
		if (pending.timeout) {
			global.clearTimeout(pending.timeout);
			pending.timeout = null;
		}

		if (pending.terminationListener) {
			this._connectionManager.removeListener('circuitTermination', pending.terminationListener);
			pending.terminationListener = null;
		}
	}

	/**
	 * Method that gets called when the socket of a CircuitNode closes which is assigned to a pending request.
	 * Removes all listeners and cleans up.
	 *
	 * @method core.protocol.hydra.CellManager~_onCircuitTermination
	 *
	 * @param {string} uuid The UUID of the additive sharing scheme the closed socket of the initiator referred to.
	 */
	private _onCircuitTermination (uuid:string):void {
		var pending:PendingCreateCellRequest = this._pendingRequests[uuid];

		this._cleanupTimeoutAndTerminationListener(pending);

		delete this._pendingRequests[uuid];
	}


	/**
	 * Method that gets called when a pending request could complete its batch of additive messages.
	 * Checks if the client can endure another cell, if yes, accepts, else rejects.
	 * In any case, the pending object is cleared up.
	 *
	 * @method core.protocol.hydra.CellManager~_onCompleteBatchRequest
	 *
	 * @param {core.protocol.hydra.PendingCreateCellRequest} pending The pending request with the completed batch.
	 */
	private _onCompleteBatchRequest (pending:PendingCreateCellRequest):void {
		this._cleanupTimeoutAndTerminationListener(pending);

		if (this._canMaintainAdditionalCell()) {
			this._acceptCreateCellRequest(pending);
		}
		else {
			this._messageCenter.sendCellCreatedRejectedMessage(pending.initiator, pending.uuid);
			this._connectionManager.removeFromCircuitNodes(pending.initiator, false);
		}

		delete this._pendingRequests[pending.uuid];
	}

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
	private _onCreateCellMessage (socketIdentifier:string, message:ReadableCreateCellAdditiveMessageInterface):void {
		var uuid:string = message.getUUID();
		var pending:PendingCreateCellRequest = this._pendingRequests[uuid];

		if (!pending) {
			pending = this._pendingRequests[uuid] = {
				uuid            : uuid,
				additivePayloads: [],
				timeout         : global.setTimeout((uuid:string) => {
					this._onPendingRequestTimeout(uuid);
				}, this._waitForAdditiveBatchFinishInMs, uuid)
			};
		}

		pending.additivePayloads.push(message.getAdditivePayload());

		if (message.isInitiator()) {
			var circuitId:string = message.getCircuitId();
			var initiatorNode:HydraNode = {
				circuitId: circuitId
			};

			this._connectionManager.addToCircuitNodes(socketIdentifier, initiatorNode);

			pending.initiator = initiatorNode;
			pending.terminationListener = (terminatedCircId:string) => {
				if (terminatedCircId === circuitId) {
					this._onCircuitTermination(uuid);
				}
			};

			this._connectionManager.on('circuitTermination', pending.terminationListener);
		}

		if (pending.additivePayloads.length === this._additiveSharingMsgAmount && pending.initiator) {
			this._onCompleteBatchRequest(pending);
		}
	}

	/**
	 * Method that gets called when the batch of a request could not be completed in a given time and its
	 * timeout elapses. Basically cleans up everything and removes the initator node from the connection manager's
	 * circuitNode list (if present) (plus closing the socket).
	 *
	 * @method core.protocol.hydra.CellManager~_onPendingRequestTimeout
	 *
	 * @param {string} uuid The UUID of the additive sharing of the pending request.
	 */
	private _onPendingRequestTimeout (uuid:string):void {
		var pending:PendingCreateCellRequest = this._pendingRequests[uuid];
		var initiatorNode:HydraNode = pending.initiator;

		pending.timeout = null;
		this._cleanupTimeoutAndTerminationListener(pending);

		if (initiatorNode) {
			this._connectionManager.removeFromCircuitNodes(initiatorNode);
		}

		delete this._pendingRequests[uuid];
	}

	/**
	 * Method that gets called when an already created hydra cell has been torn down.
	 * Removes the cell from the list of maintained cells.
	 *
	 * @method core.protocol.hydra.CellManager~_onTornDownCell
	 *
	 * @param {core.protocol.hydra.HydraCellInterface} cell The torn-down cell
	 */
	private _onTornDownCell (cell:HydraCellInterface):void {
		for (var i = 0, l = this._maintainedCells.length; i < l; i++) {
			if (this._maintainedCells[i] === cell) {
				this._maintainedCells.splice(i, 1);
				break;
			}
		}
	}

	/**
	 * Sets up the listener on the CREATE_CELL_ADDITIVE event of the message center.
	 *
	 * @method core.protocol.hydra.CellManager~_setupListeners
	 */
	private _setupListeners ():void {
		this._messageCenter.on('CREATE_CELL_ADDITIVE', (socketIdentifier:string, msg:ReadableCreateCellAdditiveMessageInterface) => {
			this._onCreateCellMessage(socketIdentifier, msg);
		});
	}


}

export = CellManager;