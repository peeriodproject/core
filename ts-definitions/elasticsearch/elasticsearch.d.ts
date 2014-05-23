// Type definitions for elasticsearch

///<reference path="../node/node.d.ts"/>

declare module "elasticsearch" {

	interface getParams {
		index: string;
		type?:string;
		id:any;
	}

	interface Indices {
		create (params, callback: (err, response, status) => any):void;
		existsType (params, callback: (err, response, status) => any):void;
		putMapping (params, callback: (err, response, status) => any):void;
	}

	interface ClientInterface {
		get (params:getParams, callback:(err, response, status) => any):void;
		ping (params, callback:(err, response, status) => any):void;
		indices:Indices;
	}

	interface ClientStaticInterface {
		(options?):ClientInterface;
	}

	export var Client:ClientStaticInterface;
}