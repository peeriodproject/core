/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

interface NetworkMaintainerInterface extends NodeJS.EventEmitter {

	joinNetwork ():void;
}

export = NetworkMaintainerInterface;