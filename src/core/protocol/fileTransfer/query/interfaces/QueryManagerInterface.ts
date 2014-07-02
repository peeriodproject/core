/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The QueryManager uses a bridge between the search manager / databases / frontend to issue new queries (broadcast-based or
 * hash-based). It takes two parameters to decide whether a new query can be issued:
 *
 * 1. A minimum number of constructed circuits in order to provide anonymity
 * 2. A maxmimum number of parallel queries.
 *
 * It maps the queries to the identifiers received from the search manager and also emit the 'end' and 'result' events with
 * theses identifiers to allow correct mapping on the other side.
 *
 * @interface
 * @class core.protocol.fileTransfer.QueryManagerInterface
 * @extend NodeJS.EventEmitter
 */
interface QueryManagerInterface extends NodeJS.EventEmitter {

}

export = QueryManagerInterface;