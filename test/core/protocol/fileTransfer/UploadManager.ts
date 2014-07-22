/// <reference path='../../../test.d.ts' />

require('should');

import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import ObjectConfig = require('../../../../src/core/config/ObjectConfig');
import UploadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmUploadFactory');
import UploadManager = require('../../../../src/core/protocol/fileTransfer/share/UploadManager');
import ReadableShareRequestMessageFactory = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRequestMessageFactory');
import ReadableShareRequestMessage = require('../../../../src/core/protocol/fileTransfer/share/messages/ReadableShareRequestMessage');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> UploadManager', function () {

	var sandbox:SinonSandbox = null;

	var configStub:any = null;
	var bridge:any = new events.EventEmitter();
	var factoryStub:any = null;
	var readableShareRequestFactoryStub:any = null;
	var transferMessageCenterStub:any = new events.EventEmitter();

	var uploadManager:UploadManager = null;

	var hasFile = true;

	var createRequest = function (transferIdentifier) {
		setImmediate(function () {
			transferMessageCenterStub.emit('SHARE_REQUEST', transferIdentifier, 'circuitId', new Buffer(0));
		});
	};

	var uploadCount = function () {
		return Object.keys(uploadManager.getActiveUploads()).length;
	}

	it('should correctly create an upload manager', function () {
		uploadManager = new UploadManager(configStub, transferMessageCenterStub, factoryStub, readableShareRequestFactoryStub, bridge);
		uploadManager.should.be.instanceof(UploadManager);

		uploadCount().should.equal(0);
	});

	it('should add an upload to the active list', function (done) {
		createRequest('upload1');

		bridge.once('newUpload', function (ident, filePath, filename, filesize) {
			ident.should.equal('upload1');
			filePath.should.equal('foo');
			filename.should.equal('bar');
			filesize.should.equal(10);
			(uploadManager.getActiveUploads()['upload1'] == undefined).should.be.false;
			done();
		});
	});

	it('should do nothing when the request identifier is already known', function (done) {
		createRequest('upload1');

		setImmediate(function () {
			uploadCount().should.equal(1);
			done();
		});
	});

	it('should only add two more uploads', function (done) {
		createRequest('upload2');
		createRequest('upload3');
		createRequest('upload4');

		setImmediate(function () {
			uploadCount().should.equal(3);
			(uploadManager.getActiveUploads()['upload4'] == undefined).should.be.true;
			done();
		});
	});

	it('should propagate the abort event to the bridge after manually aborting', function (done) {

		bridge.once('manuallyAborted', function (ident) {
			ident.should.equal('upload2');
			done();
		});

		bridge.emit('abortUpload', 'upload2');
	});

	it('should propagate the completed event to the bridge', function (done) {
		bridge.once('completed', function (ident) {
			ident.should.equal('upload1');
			done();
		});

		uploadManager.getActiveUploads()['upload1'].emit('completed');
	});

	it('should propagate the ratifyingRequest event to the bridge', function (done) {
		bridge.once('ratifyingRequest', function (ident) {
			ident.should.equal('upload3');
			done();
		});

		uploadManager.getActiveUploads()['upload3'].emit('ratifyingRequest');
	});

	it('should propagate the uploadingBytes event to the bridge', function (done) {
		bridge.once('uploadingBytes', function (ident, bytes) {
			ident.should.equal('upload3');
			bytes.should.equal(100);
			done();
		});

		uploadManager.getActiveUploads()['upload3'].emit('uploadingBytes', 100);

	});

	it('should emit a FS_ERROR reason (1) when killed and remove the upload from the active list', function (done) {
		bridge.once('end', function (ident, code) {
			ident.should.equal('upload2');
			code.should.equal('FS_ERROR');
			uploadCount().should.equal(2);
			(uploadManager.getActiveUploads()['upload2'] == undefined).should.be.true;
			done();
		});

		uploadManager.getActiveUploads()['upload2'].emit('killed', 'File cannot be read.');
	});

	it('should emit a FS_ERROR reason (2) when killed and remove the upload from the active list', function (done) {
		bridge.once('end', function (ident, code) {
			ident.should.equal('upload1');
			code.should.equal('FS_ERROR');
			uploadCount().should.equal(1);
			done();
		});

		uploadManager.getActiveUploads()['upload1'].emit('killed', 'Block cannot be read.');
	});

	it('should emit a FS_ERROR reason (2) when killed and remove the upload from the active list', function (done) {
		bridge.once('end', function (ident, code) {
			ident.should.equal('upload3');
			code.should.equal('MANUAL_ABORT');
			uploadCount().should.equal(0);
			done();
		});

		uploadManager.getActiveUploads()['upload3'].emit('killed', 'Manually aborted.');
	});

	it('should emit a REMOTE_ABORT when killed', function (done) {
		createRequest('upload1');

		setImmediate(function () {

			bridge.once('end', function (ident, code) {
				ident.should.equal('upload1');
				code.should.equal('REMOTE_ABORT');
				done();
			});

			uploadManager.getActiveUploads()['upload1'].emit('killed', 'Downloader aborted transfer.');
		});
	});

	it('should emit a COMPLETED when killed', function (done) {
		createRequest('upload1');

		setImmediate(function () {

			bridge.once('end', function (ident, code) {
				ident.should.equal('upload1');
				code.should.equal('COMPLETED');
				done();
			});

			uploadManager.getActiveUploads()['upload1'].emit('killed', 'Completed.');
		});
	});

	it('should emit a PROTOCOL_ERR when killed', function (done) {
		createRequest('upload1');

		setImmediate(function () {

			bridge.once('end', function (ident, code) {
				ident.should.equal('upload1');
				code.should.equal('PROTOCOL_ERR');
				done();
			});

			uploadManager.getActiveUploads()['upload1'].emit('killed', 'Whatever.');
		});
	});

	it('should emit a REMOTE_ABORT when killed', function (done) {
		createRequest('upload1');

		setImmediate(function () {

			bridge.once('end', function (ident, code) {
				ident.should.equal('upload1');
				code.should.equal('REMOTE_ABORT');
				done();
			});

			uploadManager.getActiveUploads()['upload1'].emit('killed', 'Downloader aborted transfer.');
		});
	});

	before(function () {
		sandbox = sinon.sandbox.create();

		readableShareRequestFactoryStub = testUtils.stubPublicApi(sandbox, ReadableShareRequestMessageFactory, {
			create: function () {
				return testUtils.stubPublicApi(sandbox, ReadableShareRequestMessage);
			}
		});

		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'fileTransfer.maximumNumberOfParallelUploads') return 3;
			}
		});

		factoryStub = testUtils.stubPublicApi(sandbox, UploadFactory, {
			create: function () {
				var upload:any = new events.EventEmitter();

				upload.manuallyAbort = function () {
					this.emit('abort');
				};

				upload.kickOff = function () {};

				return upload;
			}
		});

		bridge.getFileInfoByHash = function (hash, cb) {
			if (hasFile) {
				cb(null, 'foo', 'bar', 10);
			}
			else {
				cb(null, null, null, null);
			}
		}
	});

	after(function () {
		sandbox.restore();
	});
});