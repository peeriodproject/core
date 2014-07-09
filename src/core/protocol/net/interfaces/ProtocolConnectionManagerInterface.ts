/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import ContactNodeInterface = require('../../../topology/interfaces/ContactNodeInterface');
import ContactNodeAddressListInterface = require('../../../topology/interfaces/ContactNodeAddressListInterface');
import IdInterface = require('../../../topology/interfaces/IdInterface');
import MyNodeInterface = require('../../../topology/interfaces/MyNodeInterface');
import TCPSocketInterface = require('../../../net/tcp/interfaces/TCPSocketInterface');

/**
 * The basic concept of the ProtocolConnectionManager is to provide the first interface between networking, messaging and
 * topology. It tries to assign sockets to ContactNodes, but does not differentiate between proxys (which it may not have
 * knowledge about) and 'direct' connections.
 * In order to do so, it can easily assign outgoing sockets to ContactNodes, however has to wait for a first message before being
 * able to assign an incoming socket to a ContactNode.
 *
 * Thus it strictly has to follow some rules:
 * 1.) Outgoing connections are directly referenced, without needing to wait for a first message.
 * 2.) Incoming connections have to wait for a first message before being referenced.
 * 3.) Only one socket per node.
 * 4.) As it may be that an outgoing connection is being proxied, incoming always beats outgoing.
 *
 *
 * Those rules do not, however, apply to all sockets intended for HYDRA messages. They have a special role and are not counted
 * for a specific node. They are judged only by their temporary identifiers.
 * HYDRA messages are only allowed on hydra sockets and vice versa. Sending regular messages on hydra sockets, or sending hydra
 * messages on regular sockets will not be tolerated and leads to termination of the connection.
 *
 * ################
 * The detailed flow goes like this:
 * If there is a new incoming socket, it is provided with a temporary identifier und kept track of. Now it will be waited
 * for an incoming message on this socket to correctly get the identifier (which is the hex-string representation of the ID).
 * If a timeout elapses and the incoming message could not be assigned to an ID (and thus a node) the socket gets destroyed.
 *
 * If a message comes in on an incoming socket and the socket can be assigned an ID, the timeout gets invalidatet, the socket
 * is updated with the new identifier, and it will be added to the confirmed sockets. The message itself is propagated.
 * If there are any outgoing pending connections on the same identifier, a flag `closeAtOnce` is set on them to indicate
 * it is no longer needed (as incoming connections always beat outgoing).
 *
 * If a message comes in and the identifier of the socket is neither a temporary identifier nor is it the same as the one
 * extracted from the message, something must be not protocol compliable and the responsible socket will be destroyed.
 *
 * If an outgoing connection is initiated, it is kept track of until a socket is successfully connected. If it has connected,
 * however an incoming socket has also been opened in the same time window (thus `closeAtOnce` is true), the outgoing connection
 * is immediately closed. Otherwise the socket is added to the confirmed sockets.
 *
 * When a socket is added to the confirmed sockets, the only time when an old socket does not get replaced by the new one
 * is when the old socket is an incoming socket and the new socket is an outgoing socket.
 *
 * Incoming always beats outgoing because it may be that the outgoing is being proxied on the remote end, while direct incoming
 * sockets are obviously never proxied. (if one uses a proxy this simply means that the only incoming socket it will ever
 * have is the one of the proxy socket)
 *
 * Furthermore there is a functionality to add ContactNodes to a "keep open list", which says that all new confirmed sockets
 * (and existing confirmed sockets) do not destroy themselves on a timeout.
 *
 * #################
 *
 * The only method one will probably ever need is "writeBufferTo". Everything is handled for you.
 *
 * #################
 *
 * Following events are emitted:
 *
 * - 'confirmedSocket': Is emitted when a new confirmed socket was added / replaced. Argument is the identifier + socket.
 * Is used internally and should probably never need listening to.
 *
 * - 'terminatedConnection': Is emitted when there is no longer an open connection to an ID. Emitted with the ID as argument.
 * Will probably be used for proxy handling / deciding when to use other connections etc.
 *
 *
 * @interface
 * @class core.protocol.ProtocolConnectionManagerInterface
 */
interface ProtocolConnectionManagerInterface extends NodeJS.EventEmitter {

	/**
	 * Tries to close a hydra socket by the given identifier.
	 *
	 * @method core.protocol.ProtocolConnectionManagerInterface#closeHydraSocket
	 *
	 * @param {string} identifier The socket identifier.
	 */
	closeHydraSocket (identifier:string):void;

	/**
	 * Forces a raw buffer through the incoming data pipeline. Lets the pipeline deformat the buffer.
	 * If a ReadableMessage will be returned, AND IT IS NO HYDRA MESSAGE, the message will be emitted in
	 * a `message` event. If it is a hydra message or the unwrapped message is not intended for MyNode,
	 * the socket to the original sender will be terminated due to protocol non-compliance.
	 * Used by the proxy when deformatting a proxied through message.
	 *
	 * @method core.protocol.ProtocolConnectionManagerInterface#forceMessageThroughPipe
	 *
	 * @param {core.topology.ContactNodeInterface} originalSender
	 * @param (Buffer} rawBuffer
	 */
	forceMessageThroughPipe (originalSender:ContactNodeInterface, rawBuffer:Buffer):void;

	/**
	 * Returns the IP of a socket stored in the hydra socket list under the given identifier, `undefined` if none is found.
	 *
	 * @method core.protocol.ProtocolConnectionManagerInterface#getHydraSocketIp
	 *
	 * @param (string} identifier
	 * @returns {string} The IP address
	 */
	getHydraSocketIp (identifier:string):string;

	/**
	 * Forces an outgoing connection to the specified port and ip. It doesn't matter which node sits behind it.
	 * If successful, the socket is saved within the hydra list, and the identifier (a prefix plus an increasing number)
	 * used for it is returned.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#hydraConnectTo
	 *
	 * @param {number} port The port to connect to
	 * @param {string} ip The ip to connect to
	 * @param {Function} callback Mandatory callback which gets called with an error (if the connection was not successful)
	 * and the identifier used as arguments.
	 */
	hydraConnectTo (port:number, ip:string, callback?:(err:Error, identifier:string) => any):void;

	/**
	 * Writes a buffer to a socket stored under the specified hydra identifier. Generates an error if there is no socket
	 * under this identifier.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#hydraWriteBufferTo
	 *
	 * @param {string} identifier
	 * @param {Buffer} buffer
	 * @param {Function} callback
	 */
	hydraWriteBufferTo (identifier:string, buffer:Buffer, callback?:(err:Error) => any):void;

	/**
	 * Wraps the specified payload buffer in a general hydra message and calls `hydraWriteBufferTo` afterwards.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#hydraWriteMessageTo
	 *
	 * @param {string} identifier
	 * @param {Buffer} buffer
	 * @param {Function} callback
	 */
	hydraWriteMessageTo (identifier:string, payload:Buffer, callback?:(err:Error) => any):void;

	/**
	 * Returns a confirmed socket by the speicifed contact node. Returns `null` if tehre is none.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getConfirmedSocketById
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @returns {core.net.tcp.TCPSocketInterface}
	 */
	getConfirmedSocketByContactNode (node:ContactNodeInterface):TCPSocketInterface;

	/**
	 * Returns a confirmed socket by the specified ID. Returns `null` if there is none.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getConfirmedSocketById
	 *
	 * @param {core.topology.IdInterface} id
	 * @returns {core.net.tcp.TCPSocketInterface}
	 */
	getConfirmedSocketById (id:IdInterface):TCPSocketInterface;

	/**
	 * Returns a list of external addresses of the machine. Returns an empty array if it cannot be reached from outside.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getExternalAddressList
	 *
	 * @returns {core.topology.ContactNodeAddressListInterface}
	 */
	getExternalAddressList ():ContactNodeAddressListInterface;

	/**
	 * Returns myNode, provided in the constructor
	 *
	 * @returns {core.topology.MyNodeInterface}
	 */
	getMyNode ():MyNodeInterface;

	/**
	 * If the machine can be reached from outside, i.e. it has open ports, this method returns an object
	 * with an ip and a port attribute, where the port is chosen randomly from the open ports.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#getRandomExternalIpPortPair
	 *
	 * @returns {any} Object containing ip and random open port. If it does not have an open port, returns `null`
	 */
	getRandomExternalIpPortPair ():any;

	/**
	 * The anti-version to {@link core.topology.net.ProtocolConnectionManagerInterface#keepHydraSocketOpen}.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepHydraSocketNoLongerOpen
	 *
	 * @param {string} identifier
	 */
	keepHydraSocketNoLongerOpen (identifier:string):void;

	/**
	 * Says that a hydra socket stored under the specified identifier should not be closed on idle timeout.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepHydraSocketOpen
	 *
	 * @param {string} identifier
	 */
	keepHydraSocketOpen (identifier:string):void;

	/**
	 * The anti-version to {@link core.topology.net.ProtocolConnectionManagerInterface#keepSocketsOpenFromNode}.
	 * The timeout of existing confirmed sockets will be refreshed.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepSocketsNoLongerOpenFromNode
	 *
	 * @param {core.topology.ContactNodeInterface} contactNode
	 */
	keepSocketsNoLongerOpenFromNode (contactNode:ContactNodeInterface):void;

	/**
	 * Says that from now on, all sockets to this node should not be closed on timeout. Applies the same to any existing
	 * confirmed sockets as well.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#keepSocketsOpenFromNode
	 *
	 * @param {core.topology.ContactNodeInterface} contactNode
	 */
	keepSocketsOpenFromNode (contactNode:ContactNodeInterface):void;

	/**
	 * Tries to get an established connection to a contact node. Used internally, should normally not be needed in another
	 * context. Calls a callback as soon as an established connection is available or an error occurs. Called with
	 * error and the socket as arguments.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#obtainConnectionTo
	 *
	 * @param {core.topology.ContactNodeInterface} node The contact node to connect to-
	 * @param {Function} callback Callback function (mandatory)
	 */
	obtainConnectionTo (node:ContactNodeInterface, callback:(err:Error, socket:TCPSocketInterface) => any):void;

	/**
	 * The most important method. Tries to write a byte buffer to a contact node. If there is already an established
	 * connection, it is used. If not, a connection will be established and after that written to it.
	 *
	 * Calls the callback with an error object or `null`. An error may occur if no connection could be established.
	 * If the callback is called without an error, it means that the buffer has been successfully written out.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#writeBufferTo
	 *
	 * @param {core.topology.ContactNodeInterface} node The contact node to write to
	 * @param {Buffer} buffer The byte buffer to write
	 * @param {Function} callback Optional callback function that gets called.
	 */
	writeBufferTo (node:ContactNodeInterface, buffer:Buffer, callback?:(err:Error) => any):void;

	/**
	 * Takes the provided messageType and payload and lets it being wrapped within a valid non-anonymous protocol message.
	 * Calls `writeBufferTo` with the resulting buffer.
	 *
	 * @method core.protocol.net.ProtocolConnectionManagerInterface#writeMessageTo
	 *
	 * @param {core.topology.ContactNodeInterface} node
	 * @param {string} messageType The human readable protocol message type
	 * @param {NodeJS.Buffer} payload The buffer representing the payload
	 * @param {Function} callback Optional callback function that gets called.
	 */
	writeMessageTo (node:ContactNodeInterface, messageType:string, payload:Buffer, callback?:(err:Error) => any):void;

}

export = ProtocolConnectionManagerInterface;