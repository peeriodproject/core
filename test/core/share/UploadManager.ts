/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import UploadManager = require('../../../src/core/share/UploadManager');
import SearchClient = require('../../../src/core/search/SearchClient');

describe('CORE --> SHARE --> UploadManager', function () {
	var sandbox:SinonSandbox;
	var appQuitHandlerStub:any;
	var searchClientStub:any;

	var manager = null;

	var searchItemError = null;
	var searchItem = null;

	var closeAndDone = function (uploadManager, done) {
		uploadManager.getRunningUploadIds(function (ids) {
			uploadManager.close(function () {
				manager = null;
				done();
			});

			ids.forEach(function (id) {
				uploadManager.uploadEnded(id, 'MANUAL_ABORT');
			});
		});
	};

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
		searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {

			close: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			},

			open: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			},

			getItemByHash: function () {
				return process.nextTick(arguments[1].bind(null, searchItemError, searchItem));
			}
		});

		manager = new UploadManager(appQuitHandlerStub, searchClientStub, 'searchresponses');
	});

	afterEach(function (done) {
		sandbox.restore();
		appQuitHandlerStub = null;
		searchClientStub = null;

		searchItemError = null;
		searchItem = null;

		closeAndDone(manager, done);
	});

	it('should correctly instantiate the UploadManager', function () {
		manager.should.be.an.instanceof(UploadManager);
	});

	it('should correctly open and close the manager', function (done) {
				manager.open(function () {
					searchClientStub.open.called.should.be.true;

					manager.isOpen(function (err:Error, isOpen:boolean) {
						(err === null).should.be.true;
						isOpen.should.be.true;

						manager.close(function () {
							searchClientStub.close.called.should.be.true;

							manager.isOpen(function (err:Error, isOpen:boolean) {
								(err === null).should.be.true;
								isOpen.should.be.false;

								done();
							});
						});
					});
				});
	});

	it ('should correctly add a new upload', function () {
		var onAddedSpy = sandbox.spy();

		manager.onUploadAdded(onAddedSpy);

		manager.createUpload('uploadId', '/path/to/file.ext', 'file.ext', 123);
		manager.createUpload('uploadId', '/path/to/file.ext', 'file.ext', 123);

		onAddedSpy.calledOnce.should.be.true;

		onAddedSpy.getCall(0).args[0].should.equal('uploadId');
		onAddedSpy.getCall(0).args[1].should.equal('/path/to/file.ext');
		onAddedSpy.getCall(0).args[2].should.equal('file.ext');
		onAddedSpy.getCall(0).args[3].should.equal(123);
	});

	it ('should correctly cancel the upload', function () {
		var onCanceledSpy = sandbox.spy();

		manager.onUploadCanceled(onCanceledSpy);

		manager.cancelUpload('invalidId');
		onCanceledSpy.called.should.be.false;

		manager.createUpload('uploadId', '/path/to/file.ext', 'file.ext', 123);
		manager.cancelUpload('uploadId');
		onCanceledSpy.calledOnce.should.be.true;

		onCanceledSpy.getCall(0).args[0].should.equal('uploadId');
	});

	describe ('should correctly return the file data by hash', function () {

		it('should correctly return the data', function (done) {
			searchItem = {
				getPath: function () {
					return '/path/to/file.ext'
				},

				getName: function () {
					return 'file.ext'
				},

				getStats: function () {
					return { size: 123 };
				}
			};

			manager.getFileInfoByHash('randomHash', function (err:Error, fullFilePath:string, fileName:string, fileSize:number) {
				(err === null).should.be.true;

				fullFilePath.should.equal('/path/to/file.ext');
				fileName.should.equal('file.ext');
				fileSize.should.equal(123);

				done();
			});
		});

		it('should correctly return an error', function (done) {
			searchItemError = new Error('error message');

			manager.getFileInfoByHash('randomHash', function (err:Error, fullFilePath:string, fileName:string, fileSize:number) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('error message');

				(fullFilePath === null).should.be.true;
				(fileName === null).should.be.true;
				(fileSize === null).should.be.true;

				done();
			});
		});

		it('should correctly return null if the item was not found', function (done) {
			manager.getFileInfoByHash('randomHash', function (err:Error, fullFilePath:string, fileName:string, fileSize:number) {
				(err === null).should.be.true;

				(fullFilePath === null).should.be.true;
				(fileName === null).should.be.true;
				(fileSize === null).should.be.true;

				done();
			});
		});
	});

	describe ('should correctly return the running upload ids', function () {

		it ('it should correctly return an empty array', function (done) {
			manager.getRunningUploadIds(function (ids) {
				ids.should.be.an.instanceof(Array);
				ids.should.have.a.lengthOf(0);

				done();
			});
		});

		it ('should correctly return the upload id', function (done) {
			manager.createUpload('uploadId');
			manager.createUpload('uploadId');

			manager.getRunningUploadIds(function (ids) {
				ids.should.have.a.lengthOf(1);
				ids[0].should.equal('uploadId');

				done();
			});
		});
	});

	it ('should correctly end a upload', function (done) {
		var onEndedSpy = sandbox.spy();
		manager.onUploadEnded(onEndedSpy);

		manager.createUpload('uploadId');

		manager.uploadEnded('randomId', 'reason'); // not found
		manager.uploadEnded('uploadId', 'reason');
		manager.uploadEnded('uploadId', 'reason'); // already ended

		onEndedSpy.calledOnce.should.be.true;

		onEndedSpy.getCall(0).args[0].should.equal('uploadId');
		onEndedSpy.getCall(0).args[1].should.equal('reason');

		manager.getRunningUploadIds(function (ids) {
			ids.should.have.a.lengthOf(0);

			done();
		});
	});

	it ('should correctly update the upload status', function () {
		var onUpdateSpy = sandbox.spy();

		manager.onUploadStatusChanged(onUpdateSpy);

		manager.createUpload('uploadId');

		manager.updateUploadStatus('randomId', 'status'); // not found
		manager.updateUploadStatus('uploadId', 'status');

		onUpdateSpy.calledOnce.should.be.true;

		onUpdateSpy.getCall(0).args[0].should.equal('uploadId');
		onUpdateSpy.getCall(0).args[1].should.equal('status');
	});

});