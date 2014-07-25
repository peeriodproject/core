/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import DownloadManager = require('../../../src/core/share/DownloadManager');
import JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
import JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import SearchClient = require('../../../src/core/search/SearchClient');

describe('CORE --> SHARE --> DownloadManager', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var stateHandlerFactoryStub:any;
	var stateHandlerStub:any;
	var appQuitHandlerStub:any;
	var searchClientStub:any;

	var appDataPath = testUtils.getFixturePath('core/share/DownloadManager');
	var response = null;

	var state = null;

	var validResponse = {
		_type    : "jj.core.documentanalyser",
		_itemId  : "3c45b5405c817c047a0759d7f3249d19a0aa58d9",
		itemName : "LoremIpsum.txt",
		itemStats: {
			uid    : 501,
			atime  : "2014-07-21T15:58:48.000Z",
			ino    : 47882983,
			dev    : 16777218,
			blksize: 4096,
			mtime  : "2014-07-13T15:02:41.000Z",
			gid    : 0,
			nlink  : 1,
			blocks : 8,
			rdev   : 0,
			ctime  : "2014-07-13T15:02:41.000Z",
			size   : 308,
			mode   : 33188
		},
		itemHash : "3c45b5405c817c047a0759d7f3249d19a0aa58d9",
		file     : [
			"vel augue laoreet rutrum faucibus dolor auctor. Lorem ipsum dolor sit amet, consectetur adipiscing elit"
		],
		_meta    : {
			additional: "metadata"
		}
	};

	var closeAndDone = function (downloadManager, done) {
		downloadManager.getRunningDownloadIds(function (ids) {
			downloadManager.close(function () {
				done();
			});

			ids.forEach(function (id) {
				downloadManager.downloadEnded(id, 'MANUAL_ABORT');
			});
		});
	};

	beforeEach(function () {
		testUtils.createFolder(appDataPath);

		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'app.dataPath') {
					return appDataPath;
				}
				else if (key === 'share.downloadManagerStateConfig') {
					return 'downloadManager.json';
				}
			}
		});
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
		stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
			load: function () {
				return process.nextTick(arguments[0].bind(null, null, state));
			},
			save: function () {
				return process.nextTick(arguments[1].bind(null, null));
			}
		});

		stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
			create: function () {
				arguments[0].should.equal(appDataPath + '/downloadManager.json');

				return stateHandlerStub;
			}
		});
		searchClientStub = testUtils.stubPublicApi(sandbox, SearchClient, {

			close: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			},

			getIncomingResponseById: function () {
				return process.nextTick(arguments[3].bind(null, null, response));
			},

			open: function (callback) {
				callback = callback || function () {
				};

				return process.nextTick(callback.bind(null, null));
			}
		});
	});

	afterEach(function () {
		sandbox.restore();
		appQuitHandlerStub = null;
		searchClientStub = null;
		response = null;

		testUtils.deleteFolderRecursive(appDataPath);
	});

	it('should correctly instantiate the DownloadManager', function (done) {
		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses');

		manager.should.be.an.instanceof(DownloadManager);

		closeAndDone(manager, done);
	});

	it('should correctly open and close the manager', function (done) {
		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.open(function () {
					searchClientStub.open.called.should.be.true;
					stateHandlerStub.load.called.should.be.true;

					manager.isOpen(function (err:Error, isOpen:boolean) {
						(err === null).should.be.true;
						isOpen.should.be.true;

						manager.close(function () {
							searchClientStub.close.called.should.be.true;
							stateHandlerStub.save.called.should.be.true;

							manager.isOpen(function (err:Error, isOpen:boolean) {
								(err === null).should.be.true;
								isOpen.should.be.false;

								closeAndDone(manager, done);
							});
						});
					});
				});
			}
		});
	});

	it('should correctly create a new download', function (done) {
		response = validResponse;

		var addedSpy = sandbox.spy();

		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.setDownloadDestination(appDataPath, function (err:Error) {
					(err === null).should.be.true;

					manager.createDownload('QqGNZv7rSrGJzBzs5Ya2XQ', function (err) {
						(err === null).should.be.true;

						addedSpy.calledOnce.should.be.true;
						addedSpy.getCall(0).args[0].should.equal('QqGNZv7rSrGJzBzs5Ya2XQ');
						addedSpy.getCall(0).args[1].should.equal('LoremIpsum.txt');
						addedSpy.getCall(0).args[2].should.equal(308);
						addedSpy.getCall(0).args[3].should.equal('3c45b5405c817c047a0759d7f3249d19a0aa58d9');
						addedSpy.getCall(0).args[4].should.equal(appDataPath);
						addedSpy.getCall(0).args[5].should.containDeep({
							additional: 'metadata'
						})

						closeAndDone(manager, done);
					});
				});
			}
		});

		manager.onDownloadAdded(addedSpy);
	});

	describe('should correclty prevent the creation of a new download', function () {
		var manager = null;

		beforeEach(function (done) {
			state = { destination: appDataPath };
			manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
				onOpenCallback: function () {
					done();
				}
			});
		});

		afterEach(function (done) {
			closeAndDone(manager, done);
		});

		it('if the current download destination does not exists', function (done) {
			var onAddedSpy = sandbox.spy();

			response = validResponse;

			// close the manager and load an invalid path from state
			manager.close(function () {
				state = { destination: 'invalid/destination' };
				manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
					onOpenCallback: function (err) {
						(err === null).should.be.true;

						// create the download
						manager.createDownload('randomId', function (err) {
							err.should.be.an.instanceof(Error);
							err.message.should.equal('DownloadManager#getDownloadDestination: The download destination does not exists: invalid/destination')

							onAddedSpy.called.should.be.false;

							done();
						});

						manager.onDownloadAdded(onAddedSpy);
					}
				});
			});
		});

		it('if no response was found', function (done) {
			var onAddedSpy = sandbox.spy();

			manager.createDownload('randomId', function (err) {
				(err).should.be.an.instanceof(Error);
				err.message.should.equal('DownloadManager#createDownload: Could not find a response with the given id.');

				onAddedSpy.called.should.be.false;

				done();
			});

			manager.onDownloadAdded(onAddedSpy);
		});

		it('if a download with the given id is already running', function (done) {
			var onAddedSpy = sandbox.spy();

			response = validResponse;

			manager.createDownload('duplicatedId', function (err) {
				(err === null).should.be.true;

				manager.createDownload('duplicatedId', function (err) {
					err.should.be.an.instanceof(Error);
					err.message.should.equal('DownloadManager#createDownload: Download is already in progress.');

					onAddedSpy.calledOnce.should.be.true;

					done();
				});
			});

			manager.onDownloadAdded(onAddedSpy);
		});

		it('if the download size is empty', function (done) {
			var onAddedSpy = sandbox.spy();

			response = validResponse;
			response.itemStats.size = 0;

			manager.createDownload('randomId', function (err) {
				(err).should.be.an.instanceof(Error);
				err.message.should.equal('DownloadManager#createDownload: Could not create download. No or empty file size provided.');

				onAddedSpy.called.should.be.false;

				done();
			});

			manager.onDownloadAdded(onAddedSpy);
		});
	});

	describe ('should correclty return the running download ids', function () {

		it ('it should correctly return an empty array', function (done) {
			var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
				onOpenCallback: function () {
					manager.getRunningDownloadIds(function (ids) {
						ids.should.be.an.instanceof(Array);
						ids.should.have.a.lengthOf(0);

						done();
					});
				}
			});
		});

		it ('should correctly return the upload id', function (done) {
			response = validResponse;
			state = { destination: appDataPath };

			var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';

			var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
				onOpenCallback: function () {
					manager.createDownload(id);
					manager.createDownload(id);

					setImmediate(function () {
						manager.getRunningDownloadIds(function (ids) {
							ids.should.have.a.lengthOf(1);
							ids[0].should.equal(id);

							done();
						});
					});
				}
			});
		});
	});

	it('should correctly cancel the download', function (done) {
		response = validResponse;
		state = { destination: appDataPath };

		var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';
		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.createDownload(id);
			}
		});

		manager.onDownloadAdded(function (downloadId:string) {
			downloadId.should.equal(id);

			manager.cancelDownload(downloadId);
		});

		manager.onDownloadCanceled(function (downloadId:string) {
			downloadId.should.equal(id);

			done();
		});
	});

	it('should correctly end a download', function (done) {
		response = validResponse;
		state = { destination: appDataPath };

		var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';
		// prevent recursion flag
		var removed:boolean = false;

		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.createDownload(id);
			}
		});

		manager.onDownloadAdded(function (id) {
			if (!removed) {
				removed = true;
				manager.downloadEnded(id, 'reason');
			}
		});

		manager.onDownloadEnded(function (downloadId, reason) {
			downloadId.should.equal(id);
			reason.should.equal('reason');

			// proper cleanup check
			manager.createDownload(id, function (err) {
				(err === null).should.be.true;

				done();
			});
		});
	});

	it('should correctly update the status', function (done) {
		response = validResponse;
		state = { destination: appDataPath };

		var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';

		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.createDownload(id);
			}
		});

		manager.onDownloadAdded(function (id) {
			manager.updateDownloadStatus(id, 'newStatus');
		});

		manager.onDownloadStatusChanged(function (downloadId, status) {
			downloadId.should.equal(id);
			status.should.equal('newStatus');

			done();
		});
	});

	it('should correctly update the progress', function (done) {
		response = validResponse;
		state = { destination: appDataPath };

		var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';

		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.createDownload(id);
			}
		});

		manager.onDownloadAdded(function (id) {
			manager.updateDownloadProgress(id, 10, 100);
		});

		manager.onDownloadProgressUpdate(function (downloadId, written, expected) {
			downloadId.should.equal(id);

			written.should.equal(10);
			expected.should.equal(100);

			done();
		});
	});

	it ('should correctly stop all running downloads, wait for the `end` event and close down the manager afterwards.', function (done) {
		response = validResponse;
		state = { destination: appDataPath };

		var id:string = 'QqGNZv7rSrGJzBzs5Ya2XQ';

		var manager = new DownloadManager(configStub, appQuitHandlerStub, stateHandlerFactoryStub, searchClientStub, 'searchresponses', {
			onOpenCallback: function () {
				manager.createDownload(id);
			}
		});

		manager.onDownloadAdded(function (id) {
			var endedSpy = sandbox.spy();

			manager.onDownloadEnded(endedSpy);
			manager.onDownloadCanceled(function (id) {
				manager.downloadEnded(id, 'MANUAL_ABORT');
			});

			manager.close(function () {
				endedSpy.calledOnce.should.be.true;
				endedSpy.getCall(0).args[0].should.equal(id);

				done();
			});
		});
	});
});