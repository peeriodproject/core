/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

/**
 * The CellManager collects CREATE_CELL_ADDITIVE messages and tries to achieve a full batch of additive shares.
 * It then decides whether it still can be part of hydra circuit and acts accordingly by either rejecting the request
 * or accepting it and creating a {@link core.protocol.hydra.HydraCellInterface}
 *
 * @interface
 * @class CellManagerInterface
 * @extends NodeJS.EventEmitter
 */
interface CellManagerInterface extends NodeJS.EventEmitter {

}

export = CellManagerInterface;