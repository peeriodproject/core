/// <reference path='../../../test.d.ts' />

require('should');

import events = require('events');
import crypto = require('crypto');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import Aes128GcmDownloadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmDownloadFactory');
import Aes128GcmUploadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmUploadFactory');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> Upload (integration with Download) @current', function () {

	var sandbox:SinonSandbox = null;

	var uploadFolder:string = testUtils.getFixturePath('core/fileTransfer/snowden_brighton.jpg');
	var downloadFolder:string = testUtils.getFixturePath('core/fileTransfer/download');

	var downloaderMiddleware = new events.EventEmitter();
	var uploaderMiddleware = new events.EventEmitter();



	before(function () {
		sandbox = sinon.sandbox.create();
	});

	after(function () {
		sandbox.restore();


	});

});