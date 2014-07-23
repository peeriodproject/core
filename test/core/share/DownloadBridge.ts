/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import DownloadBridge = require('../../../src/core/share/DownloadBridge');
import DownloadManager = require('../../../src/core/share/DownloadManager');

describe('CORE --> SHARE --> DownloadBridge @joern', function () {
	var sandbox:SinonSandbox;
	var downloadManagerStub:any;

	var bridge:DownloadBridge;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();

		downloadManagerStub = testUtils.stubPublicApi(sandbox, DownloadManager);

		bridge = new DownloadBridge(downloadManagerStub);
	});

	afterEach(function () {
		sandbox.restore();

		bridge = null;
		downloadManagerStub = null;
		sandbox = null;
	});


	it ('should correctly instantiate the DownloadBridge', function () {
		bridge.should.be.an.instanceof(DownloadBridge);
	});

	describe ('it should correctly forward the events from the download manager', function () {

		it ('download was added', function () {
			var newDownloadSpy = sandbox.spy();
			bridge.on('newDownload', newDownloadSpy);

			downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', '/destination', { metadata: true });

			newDownloadSpy.calledOnce.should.be.true;
			var args = newDownloadSpy.getCall(0).args;

			args[0].should.equal('downloadId');
			args[1].should.equal('foobar.txt');
			args[2].should.equal(123);
			args[3].should.equal('hash');
			args[4].should.equal('/destination');
			args[5].should.containDeep({ metadata: true });
		})

		it ('download was removed', function () {
			var abortDownloadSpy = sandbox.spy();
			bridge.on('abortDownload', abortDownloadSpy);

			downloadManagerStub.onDownloadCanceled.getCall(0).args[0]('downloadId');

			abortDownloadSpy.calledOnce.should.be.true;
			abortDownloadSpy.getCall(0).args[0].should.equal('downloadId');
		});

	});

	describe ('it should correctly forward events received from the event emitter', function () {

		it ('should correctly forward the `writtenBytes` event', function () {
			bridge.emit('writtenBytes', 'downloadId', 10, 100);

			downloadManagerStub.updateDownloadProgress.calledOnce.should.be.true;
			var args = downloadManagerStub.updateDownloadProgress.getCall(0).args;

			args[0].should.equal('downloadId');
			args[1].should.equal(10);
			args[2].should.equal(100);
		});

		it ('should correctly forward the `requestingFile` event', function () {
			bridge.emit('requestingFile', 'downloadId');

			downloadManagerStub.updateDownloadStatus.calledOnce.should.be.true;

			downloadManagerStub.updateDownloadStatus.getCall(0).args[0].should.equal('downloadId');
			downloadManagerStub.updateDownloadStatus.getCall(0).args[1].should.equal('REQUESTING_FILE');
		});

		it ('should correctly forward the `startingTransfer` event', function () {
			bridge.emit('startingTransfer', 'downloadId');

			downloadManagerStub.updateDownloadStatus.calledOnce.should.be.true;

			downloadManagerStub.updateDownloadStatus.getCall(0).args[0].should.equal('downloadId');
			downloadManagerStub.updateDownloadStatus.getCall(0).args[1].should.equal('TRANSFER_STARTED');
		});

		it ('should correctly forward the `manuallyAborted` event', function () {
			bridge.emit('manuallyAborted', 'downloadId');

			downloadManagerStub.updateDownloadStatus.calledOnce.should.be.true;

			downloadManagerStub.updateDownloadStatus.getCall(0).args[0].should.equal('downloadId');
			downloadManagerStub.updateDownloadStatus.getCall(0).args[1].should.equal('MANUAL_ABORT');
		});

		it ('should correctly forward the `completed` event', function () {
			bridge.emit('completed', 'downloadId');

			downloadManagerStub.updateDownloadStatus.calledOnce.should.be.true;

			downloadManagerStub.updateDownloadStatus.getCall(0).args[0].should.equal('downloadId');
			downloadManagerStub.updateDownloadStatus.getCall(0).args[1].should.equal('COMPLETED');
		});

		it ('should correctly forward the `end` event', function () {
			bridge.emit('end', 'downloadId', 'reason');

			downloadManagerStub.downloadEnded.calledOnce.should.be.true;

			downloadManagerStub.downloadEnded.getCall(0).args[0].should.equal('downloadId');
			downloadManagerStub.downloadEnded.getCall(0).args[1].should.equal('reason');
		});

	});
});