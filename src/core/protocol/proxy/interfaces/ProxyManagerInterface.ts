/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.proxy.ProxyManagerInterface
 * @extends NodeJS.EventEmitter
 *
 * The ProxyManager is the class that takes care of all proxy actions. A node can be a proxy if it can be reached
 * from outside and the number of nodes it already proxies for doesn't exceed a certain limit. A node needs a proxy if
 * it cannot be reached from outside and the number of currently requested proxies plus the number of already established
 * proxies does not exceed a certain limit.
 *
 * If a node needs a proxy it chooses randomly a node from its routing table and checks if it can be used as a proxy. A
 * node is theoretically usable as a proxy if:
 * - it has not been requested
 * - it is not already a confirmed proxy
 * - it is not part of a temporary ignore list
 *
 * It the node is not usable, a number is increased. If this number exceeds a certain limit, a timeout is set. Until this
 * timeout expires, a new proxy cannot be requested.
 *
 * If the node is usable, it is sent a PROXY_REQUEST message. If the node accepts with PROXY_ACCEPT, it is added to the
 * confirmed proxies and added to the ignore list as well.
 * If the node rejects the request with PROXY_REJECT (e.g. when it cannot proxy, or it already proxies for a lot of other
 * nodes), it is removed from the requested list and added to the ignore list.
 *
 * The ProxyManager listens to the `message` event of the ProtocolConnectionManager. If a message rolls in, it checks
 * whether the received message is intented for itself. If the message is of PROXY_REJECT or PROXY_ACCEPT type it acts
 * accordingly (see above). If the message is a PROXY_REQUEST, it checks if it can be a proxy for the node (see above)
 * and either rejects or accepts the request.
 * If a message is of PROXY_THROUGH type it means that the sender of the message is one of the node's own proxies. It
 * unwraps the message and forces it back through the message pipeline, so that the ProtocolConnecitonManager emits a
 * new `message` event with the unwrapped message.
 *
 * If the message is not intended for the node itself, it checks if it is inteded for any of the nodes it proxies for.
 * If yes, it wrapes the whole message within a PROXY_THROUGH message and sends it to the node.
 *
 * In all other cases, the proxy manager emits `message` event itself with the ReadableMessage.
 * Furthermore, the sender of all incoming messages is extracted and emitted in a `contactNodeInformation` event, so that
 * another class can perform the appropriate routing table update / PING-PONG actions.
 *
 */
interface ProxyManagerInterface extends NodeJS.EventEmitter {

}

export = ProxyManagerInterface;