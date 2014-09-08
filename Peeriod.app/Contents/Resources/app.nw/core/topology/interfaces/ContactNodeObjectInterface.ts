/// <reference path='../../../../ts-definitions/node/node.d.ts' />

/**
 * @interface
 * @class core.topology.ContactNodeObjectInterface
 */

interface ContactNodeObjectInterface {
	addresses:Array<{ _ip:string; _port:number; }>;
	id:any;
	lastSeen:number;
}

export = ContactNodeObjectInterface;