/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import UploadInterface = require('./UploadInterface');
import ReadableShareRequestMessageInterface = require('../messages/interfaces/ReadableShareRequestMessageInterface');

interface UploadFactoryInterface {

	create (circuitIdOfRequest:string, requestTransferIdentifier:string, shareRequest:ReadableShareRequestMessageInterface, filepath:string, filename:string, filesize:number, filehash:string):UploadInterface;
}

export = UploadFactoryInterface;
