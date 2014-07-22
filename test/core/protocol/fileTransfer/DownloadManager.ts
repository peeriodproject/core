/// <reference path='../../../test.d.ts' />

require('should');

import events = require('events');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import CircuitManager = require('../../../../src/core/protocol/hydra/CircuitManager');
import ObjectConfig = require('../../../../src/core/config/ObjectConfig');
import DownloadFactory = require('../../../../src/core/protocol/fileTransfer/share/Aes128GcmDownloadFactory');
import DownloadManager = require('../../../../src/core/protocol/fileTransfer/share/DownloadManager');

describe('CORE --> PROTOCOL --> FILE TRANSFER --> DownloadManager', function () {

	var sandbox:SinonSandbox = null;
	var configStub:any = null;
	var factoryStub:any = null;
	var bridge:any = null;
	var circuitManagerStub:any = null;

	var manager:DownloadManager = null;

	var downloadConstructionError:boolean = false;
	var readyCircuitsNum:number = 0;

	it('should correctly construct a download manager', function () {
		manager = new DownloadManager(configStub, circuitManagerStub, bridge, factoryStub);

		manager.should.be.instanceof(DownloadManager);
		Object.keys(manager.getActiveDownloads()).length.should.equal(0);
		manager.getMaximumNumberOfDownloads().should.equal(3);
	});

	it('should not start a new download when no hydra circuits are present', function (done) {
		bridge.once('end', function (identifier, reason) {
			identifier.should.equal('foobar');
			reason.should.equal('NO_ANON');
			done();
		});

		bridge.emit('newDownload', 'foobar');
	});

	it('should not start a new download when the metadata is badly formatted', function (done) {
		downloadConstructionError = true;
		readyCircuitsNum = 1;

		bridge.once('end', function (identifier, reason) {
			identifier.should.equal('foobar2');
			reason.should.equal('BAD_METADATA');
			downloadConstructionError = false;
			done();
		});

		bridge.emit('newDownload', 'foobar2');
	});

	it('should add three downloads to the active download list', function (done) {

		bridge.emit('newDownload', 'download1');
		bridge.emit('newDownload', 'download2');
		bridge.emit('newDownload', 'download3');

		setImmediate(function () {
			Object.keys(manager.getActiveDownloads()).length.should.equal(3);
			done();
		});
	});

	it('should not allow a new download if the maximum number of parallel downloads is exceeded', function (done) {
		bridge.once('end', function (identifier, reason) {
			identifier.should.equal('download4');
			reason.should.equal('MAX_DOWNLOADS_EXCEED');
			done();
		});

		bridge.emit('newDownload', 'download4');
	});

	it('should abort a download', function (done) {
		bridge.once('manuallyAborted', function (ident) {
			ident.should.equal('download2');
			done();
		});

		bridge.emit('abortDownload', 'download2');
	});

	it('should correctly emit the normal propagated events', function (done) {
		var events = ['requestingFile', 'startingTransfer', 'completed'];
		var count = 0;

		for (var i=0; i<events.length; i++) {
			(function (evt) {
				bridge.once(evt, function (ident) {
					ident.should.equal('download1');
					if (++count === 3) done();
				});
			})(events[i]);
		}

		for (var i=0; i<events.length; i++) {
			manager.getActiveDownloads()['download1'].emit(events[i]);
		}
	});

	it('should correctly emit the written bytes event', function (done) {
		bridge.once('writtenBytes', function (ident, a, b) {
			ident.should.equal('download3');
			a.should.equal(10);
			b.should.equal(11);
			done();
		});

		manager.getActiveDownloads()['download3'].emit('writtenBytes', 10, 11);
	});

	it('should correctly emit the FS_ERROR event', function (done) {
		bridge.once('end', function (ident, reason) {
			ident.should.equal('download3');
			reason.should.equal('FS_ERROR');

			setImmediate(function () {
				(manager.getActiveDownloads()['download3'] === undefined).should.be.true;
				done();
			});
		});

		manager.getActiveDownloads()['download3'].emit('killed', 'File cannot be written.');
	});

	it('should correctly emit the MANUAL_ABORT event', function (done) {
		bridge.once('end', function (ident, reason) {
			ident.should.equal('download2');
			reason.should.equal('MANUAL_ABORT');

			setImmediate(function () {
				(manager.getActiveDownloads()['download2'] === undefined).should.be.true;
				done();
			});
		});

		manager.getActiveDownloads()['download2'].emit('killed', 'Manually aborted.');
	});

	it('should correctly emit the REMOTE_ABORT event', function (done) {
		bridge.once('end', function (ident, reason) {
			ident.should.equal('download1');
			reason.should.equal('REMOTE_ABORT');

			setImmediate(function () {
				(manager.getActiveDownloads()['download1'] === undefined).should.be.true;
				done();
			});
		});

		manager.getActiveDownloads()['download1'].emit('killed', 'Uploader aborted transfer.');
	});

	it('should correctly emit the COMPLETED event', function (done) {
		bridge.emit('newDownload', 'download1');

		bridge.once('end', function (ident, reason) {
			ident.should.equal('download1');
			reason.should.equal('COMPLETED');

			setImmediate(function () {
				(manager.getActiveDownloads()['download1'] === undefined).should.be.true;
				Object.keys(manager.getActiveDownloads()).length.should.equal(0);
				done();
			});
		});

		manager.getActiveDownloads()['download1'].emit('killed', 'Completed.');
	});

	it('should correctly emit the TIMED_OUT event', function (done) {
		bridge.emit('newDownload', 'download1');

		bridge.once('end', function (ident, reason) {
			ident.should.equal('download1');
			reason.should.equal('TIMED_OUT');

			setImmediate(function () {
				(manager.getActiveDownloads()['download1'] === undefined).should.be.true;
				Object.keys(manager.getActiveDownloads()).length.should.equal(0);
				done();
			});
		});

		manager.getActiveDownloads()['download1'].emit('killed', 'Maximum tries exhausted.');
	});

	it('should correctly emit the FS_ERROR (file block writer) event', function (done) {
		bridge.emit('newDownload', 'download1');

		bridge.once('end', function (ident, reason) {
			ident.should.equal('download1');
			reason.should.equal('FS_ERROR');

			setImmediate(function () {
				(manager.getActiveDownloads()['download1'] === undefined).should.be.true;
				Object.keys(manager.getActiveDownloads()).length.should.equal(0);
				done();
			});
		});

		manager.getActiveDownloads()['download1'].emit('killed', 'FileBlockWriter: Cannot be written to.');
	});

	it('should correctly emit the PROTOCOL_ERR (file block writer) event', function (done) {
		bridge.emit('newDownload', 'download1');

		bridge.once('end', function (ident, reason) {
			ident.should.equal('download1');
			reason.should.equal('PROTOCOL_ERR');

			setImmediate(function () {
				(manager.getActiveDownloads()['download1'] === undefined).should.be.true;
				Object.keys(manager.getActiveDownloads()).length.should.equal(0);
				done();
			});
		});

		manager.getActiveDownloads()['download1'].emit('killed', 'Malformed message.');
	});

	before(function () {
		sandbox = sinon.sandbox.create();

		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'fileTransfer.maximumNumberOfParallelDownloads') return 3;
			}
		});

		factoryStub = testUtils.stubPublicApi(sandbox, DownloadFactory, {
			create: function () {
				if (downloadConstructionError) return null;

				var download:any = new events.EventEmitter();

				download.manuallyAbort = function () {
					this.emit('abort');
				};

				download.kickOff = function () {};

				return download;
			}
		});

		bridge = new events.EventEmitter();

		circuitManagerStub = testUtils.stubPublicApi(sandbox, CircuitManager, {
			getReadyCircuits: function () {
				var a = [];

				for (var i=0; i<readyCircuitsNum; i++) {
					a.push(1);
				}

				return a;
			}
		});
	});

	after(function () {
		sandbox.restore();
	});
});