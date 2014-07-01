/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface QueryInterface extends NodeJS.EventEmitter {

	abort (abortMessageCode?:string):void;

	getQueryId ():string;

	kickOff ():void;
}

export = QueryInterface;