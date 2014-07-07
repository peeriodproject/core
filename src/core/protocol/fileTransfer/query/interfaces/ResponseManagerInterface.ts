/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

interface ResponseManagerInterface {

	externalQueryHandler (identifier:string, searchObject:Buffer, callback:(identifier:string, results:Buffer) => any):void;
}

export = ResponseManagerInterface;