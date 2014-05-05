// Type definitions for node-lmdb
// Project: https://github.com/Venemo/node-lmdb

/// <reference path='../node/node.d.ts' />

declare module "node-lmdb" {

	interface EnvOptions {
		path?:string;
		mapSize?:number;
		maxDbs?:number;
	}

	interface DbiOptions extends EnvOptions {
		name?:string;
		create?:boolean;
	}

	export class Env {
		beginTxn(opts?:EnvOptions):Txn;
		close():void;
		open(opts?:DbiOptions):void;
		openDbi(opts?:DbiOptions):Dbi;
	}

	export class Dbi {
		close():void;
		drop():void;
	}

	interface TxnOptions {
		readOnly?: boolean;
	}

	export class Txn {
		abort():void;
		commit():void;
		constructor (opts?:TxnOptions);
		del(dbi:Dbi, key:any);

		getBinary(dbi:Dbi, key:any):Buffer;
		getBoolean(dbi:Dbi, key:any):boolean;
		getNumber(dbi:Dbi, key:any):number;
		getString(dbi:Dbi, key:any):string;

		putBinary(dbi:Dbi, key:any, value:Buffer);
		putBoolean(dbi:Dbi, key:any, value:boolean);
		putNumber(dbi:Dbi, key:any, value:number);
		putString(dbi:Dbi, key:any, value:string);
	}

	export class Cursor {
		constructor (txn:Txn, dbi:Dbi);
		close():void;
		del():void;
		getCurrentBinary(callback:(key:any, value:Buffer) => any):void;
		getCurrentBoolean(callback:(key:any, value:boolean) => any ):void;
		getCurrentNumber(callback:(key:any, value:number) => any ):void;
		getCurrentString(callback:(key:any, value:string) => any ):void;
		goToFirst():void;
		goToKey(key:any):void;
		goToNext():void;
		goToPrev():void;
		goToRange(key:any):any;
		new(Txn, Dbi);
	}

	//export var Cursor:CursorInterface;
}