/// <reference path='../../../test.d.ts' />

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../../utils/testUtils');

import DownloadManager = require('../../../../src/core/share/DownloadManager');
import UiShareManagerComponent = require('../../../../src/core/ui/share/UiShareManagerComponent');

describe('CORE --> UI --> SHARE --> UiShareManagerComponent @joern', function () {
	var sandbox:SinonSandbox;
	var component:UiShareManagerComponent;
	var downloadManagerStub:any;

	var uiUpdateSpy:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();

		downloadManagerStub = testUtils.stubPublicApi(sandbox, DownloadManager, {
			createDownload        : function () {
				return process.nextTick(arguments[1].bind(null, null));
			},
			getDownloadDestination: function () {
				return process.nextTick(arguments[0].bind(null, null, '/destination'));
			},
			setDownloadDestination: function () {
				return process.nextTick(arguments[1].bind(null, null));
			}
		});

		component = new UiShareManagerComponent(downloadManagerStub);
		uiUpdateSpy = sandbox.spy();

		component.onUiUpdate(uiUpdateSpy);
	});

	afterEach(function () {
		sandbox.restore();

		downloadManagerStub = null;
		component = null;
		uiUpdateSpy = null;
	});

	it('should correctly instantiate without error', function () {
		component.should.be.an.instanceof(UiShareManagerComponent);
	});

	it('should correctly return the channel name', function () {
		component.getChannelName().should.equal('share');
	});

	it('should correctly return the event names', function () {
		component.getEventNames().should.containDeep(['addDownload', 'cancelDownload', 'removeDownload', 'updateDownloadDestination']);
	});

	it('should correctly add the specified download', function (done) {
		component.emit('addDownload', 'responseId', function (err) {
			(err === null).should.be.true;

			downloadManagerStub.createDownload.calledOnce.should.be.true;
			downloadManagerStub.createDownload.getCall(0).args[0].should.equal('responseId');

			done();
		});
	});

	it('should correctly return the error message in the callback if the creation failed', function (done) {
		downloadManagerStub = testUtils.stubPublicApi(sandbox, DownloadManager, {
			createDownload: function () {
				return process.nextTick(arguments[1].bind(null, new Error('Error Message')));
			}
		});
		component = new UiShareManagerComponent(downloadManagerStub);

		component.emit('addDownload', 'responseId', function (err) {
			err.should.equal('Error Message');

			downloadManagerStub.createDownload.calledOnce.should.be.true;
			downloadManagerStub.createDownload.getCall(0).args[0].should.equal('responseId');

			done();
		});
	});

	it('should correctly start progress runner and update the ui after a the creation was confimed from the network layer', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });

		uiUpdateSpy.calledOnce.should.be.true;

		component.getState(function (state) {
			state.should.containDeep({
				downloads  : {
					downloadId: {
						id    : 'downloadId',
						hash  : 'hash',
						loaded: 0,
						name  : 'foobar.txt',
						status: 'created'
					}
				},
				destination: {
					path: '/destination'
				}
			});

			done();
		});
	});

	it('should correctly forward the cancel event', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });

		setImmediate(function () {
			component.emit('cancelDownload', 'downloadId');

			downloadManagerStub.cancelDownload.calledOnce.should.be.true;
			downloadManagerStub.cancelDownload.getCall(0).args[0].should.equal('downloadId');

			done();
		});
	});

	it('should correctly remove a download and update the UI', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });

		setImmediate(function () {
			component.emit('removeDownload', 'downloadId');

			uiUpdateSpy.calledTwice.should.be.true;

			component.getState(function (state) {
				state.should.containDeep({
					downloads: {},
					destination: {
						path: '/destination'
					}
				});

				Object.keys(state['downloads']).should.have.a.lengthOf(0);

				done();
			});
		});
	});

	it ('should correctly forward the new download destination', function (done) {
		component.emit('updateDownloadDestination', '/new/destination');

		setImmediate(function () {
			downloadManagerStub.setDownloadDestination.calledOnce.should.be.true;
			downloadManagerStub.setDownloadDestination.getCall(0).args[0].should.equal('/new/destination');

			uiUpdateSpy.calledOnce.should.be.true;

			done();
		});
	});

	it ('should correctly update the status of a running download', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });
		downloadManagerStub.onDownloadStatusChanged.getCall(0).args[0]('downloadId', 'new status');

		uiUpdateSpy.calledTwice.should.be.true;

		component.getState(function (state) {
			state.should.containDeep({
				downloads: {
					downloadId: {
						status: 'new status'
					}
				}
			});

			done();
		});
	});

	it ('should correctly update the status on download ended', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });
		downloadManagerStub.onDownloadEnded.getCall(0).args[0]('downloadId', 'reason');

		uiUpdateSpy.calledTwice.should.be.true;

		component.getState(function (state) {
			state.should.containDeep({
				downloads: {
					downloadId: {
						status: 'reason'
					}
				}
			});

			done();
		});
	});

	it ('should update the UI in the specified interval', function (done) {
		downloadManagerStub.onDownloadAdded.getCall(0).args[0]('downloadId', 'foobar.txt', 123, 'hash', { metadata: true });

		var bytes = 0;
		var interval = setInterval(function () {
			downloadManagerStub.onDownloadProgressUpdate.getCall(0).args[0]('downloadId', ++bytes);
		}, 50);

		setTimeout(function () {
			clearInterval(interval);

			uiUpdateSpy.calledTwice.should.be.true;

			component.getState(function (state:any) {
				state.downloads.downloadId.loaded.should.be.greaterThan(0);

				done();
			});
		}, 1300);
	});

});