// Type definitions for elasticsearch

///<reference path="../node/node.d.ts"/>

declare module "elasticsearch" {

	interface Callback {
		(err:Error, response:any, status:number): any;
	}

	interface getParams {
		index: string;
		type?:string;
		id:any;
	}

	interface Indices {
		create (params, callback:Callback):void;
		delete (params, callback:Callback):void;
		existsType (params, callback:Callback):void;
		putMapping (params, callback:Callback):void;
	}

	interface ClientInterface {
		delete (params:{
			index: string;
			type?:string;
			id?:any;
		}, callback:Callback);

		exists (params:{
			index:string;
			type:string;
			id:string;
		}, callback:(err:Error, exists:boolean) => any):void;

		get (params:getParams, callback:Callback):void;

		getSource (params:getParams, callback:Callback):void;

		indices:Indices;

		index (params:{
			index:string;
			type:string;
			body:Object;
		}, callback:Callback):void;

		percolate (params:{
			index:string;
			body:Object;
		}, callback:Callback):void;

		ping (params, callback:Callback):void;

		search (params:{
			index: string;
			body: Object;
		}, callback:Callback):void;

	}

	interface ClientStaticInterface {
		(options?):ClientInterface;
	}

	export var Client:ClientStaticInterface;
}