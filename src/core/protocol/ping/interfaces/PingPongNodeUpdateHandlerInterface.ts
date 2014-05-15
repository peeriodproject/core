/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.protocol.ping.PingPongNodeUpdateHandlerInterface
 * @extends NodeJS.EventEmitter
 *
 * The PingPongNodeUpdateHandler (PPNUH) takes care of keeping the routing table up to date. When a message rolls in,
 * and a `contactNodeInformation` event is fired off by the Proxy manager (which handles all protocol messages of course),
 * it is catched by the PPNUH. It then tries to put it into the routing table. If the routing table is full, however,
 * it adds the least recently seen node to a PING waiting list. PPNUH maintains one waiting list for each bucket. (160)
 * If the waiting list is full, the new node informatino is discarded and not added to the list.
 *
 * Then all nodes within a waiting list are taken care of in strict parallelism fashion:
 * The first is taken, and checked again if it doesn't fit into the bucket. Then the least recently seen node is
 * PINGed. If it succeeds in sending a PONG back in a specific time window, the new node is discarded and the PONG
 * node updated. It if fails in sending a PONG, it gets replaced by the new node.
 */
interface PingPongNodeUpdateHandlerInterface extends NodeJS.EventEmitter {

}

export = PingPongNodeUpdateHandlerInterface;