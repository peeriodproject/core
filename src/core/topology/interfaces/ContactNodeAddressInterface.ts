/// <reference path='../../../../ts-definitions/node/node.d.ts' />

interface ContactNodeAddressInterface {
	getIp():string;
	getPort():number;
	getAddressAsByteBuffer():Buffer;
}

export = ContactNodeAddressInterface;