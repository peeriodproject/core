/// <reference path='../../test.d.ts' />

require('should');

import fs = require('fs');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import JSONStateHandler = require('../../../src/core/utils/JSONStateHandler');
import JSONStateHandlerFactory = require('../../../src/core/utils/JSONStateHandlerFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');
import FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
import FolderWatcherManager = require('../../../src/core/fs/FolderWatcherManager');

describe('CORE --> FS --> FolderWatcherManager', function () {
	var managerStoragePath:string = testUtils.getFixturePath('core/fs/folderWatcherManagerTest');
	var validPathToWatch:string = testUtils.getFixturePath('core/fs/folderWatcherManagerTest/folderToWatch');
	var sandbox:SinonSandbox;
	var configStub:any;
	var folderWatcherStub:any;
	var folderWatcherFactoryStub:any;
	var stateHandlerStub:any;
	var stateHandlerFactoryStub:any;

	var createStateHandlerStub = function (state = {}) {
		stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {
			load: function (callback) {
				callback(null, state);
			},
			save: function (state:Object, callback:Function) {
				if (callback) {
					callback(null);
				}
			}
		});
	};

	var closeAndDone = function (folderWatcherManager:FolderWatcherManager, done) {
		folderWatcherManager.close(function () {
			done();
		});
	}

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key) {
				if (key === 'app.dataPath') {
					return managerStoragePath;
					//return [pathToWatchPath];
				}
			}
		});

		createStateHandlerStub();

		stateHandlerFactoryStub = testUtils.stubPublicApi(sandbox, JSONStateHandlerFactory, {
			create: function () {
				return stateHandlerStub;
			}
		});

		folderWatcherStub = testUtils.stubPublicApi(sandbox, FolderWatcher);

		folderWatcherFactoryStub = testUtils.stubPublicApi(sandbox, FolderWatcherFactory, {
			create: function () {
				return folderWatcherStub;
			}
		});

		testUtils.createFolder(managerStoragePath);
		testUtils.createFolder(validPathToWatch);
	});

	afterEach(function () {
		sandbox.restore();

		testUtils.deleteFolderRecursive(managerStoragePath);
		testUtils.deleteFolderRecursive(validPathToWatch);
	});

	it('should correctly instantiate FolderWatcherManager without error', function (done) {
		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false
		});

		folderWatcherManager.should.be.an.instanceof(FolderWatcherManager);

		closeAndDone(folderWatcherManager, done);
	});

	it('should correctly return the open/closed state of the manager', function (done) {
		createStateHandlerStub({
			paths: [
				validPathToWatch
			]
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				(err === null).should.be.true;

				folderWatcherManager.isOpen(function (err:Error, isOpen:boolean) {
					(err === null).should.be.true;
					isOpen.should.be.true;

					folderWatcherManager.open(function (err:Error) {
						(err === null).should.be.true;

						folderWatcherManager.close(function (err:Error) {
							(err === null).should.be.true;

							folderWatcherManager.isOpen(function (err:Error, isOpen:boolean) {
								isOpen.should.be.false;

								folderWatcherManager.close(function (err:Error) {
									(err === null).should.be.true;

									closeAndDone(folderWatcherManager, done);
								});
							});
						});
					})
				});
			}
		});
	});

	it('should throw an error if the specified path is not absolute', function (done) {
		createStateHandlerStub({
			paths: [
				'./not/a/absolute/path'
			]
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				err.should.be.an.instanceof(Error);
				err.message.should.equal('FolderWatcherManager~_checkFolderWatcherPaths: The specified path is not absolute. "./not/a/absolute/path"');

				closeAndDone(folderWatcherManager, done);
			}
		});
	});

	it('should correctly create a watcher for the specified path', function (done) {
		createStateHandlerStub({
			paths: [
				validPathToWatch
			]
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				(err === null).should.be.true;

				folderWatcherFactoryStub.create.calledOnce.should.be.true;

				folderWatcherManager.getFolderWatchers(function (watchers) {
					(watchers[validPathToWatch] === undefined).should.be.false;

					closeAndDone(folderWatcherManager, done);
				});
			}
		});
	});

	it('should correctly remove the watcher if a path becomes invalid', function (done) {
		createStateHandlerStub({
			paths: [
				validPathToWatch
			]
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				testUtils.deleteFolderRecursive(validPathToWatch);

				folderWatcherManager.checkFolderWatcherPaths(function () {
					folderWatcherManager.getFolderWatchers(function (watchers) {
						Object.keys(watchers).length.should.equal(0);

						closeAndDone(folderWatcherManager, done);
					});
				});
			}
		});
	});

	it('should correctly add the watcher if a path becomes valid', function (done) {
		createStateHandlerStub({
			paths: [
				validPathToWatch
			]
		});

		testUtils.deleteFolderRecursive(validPathToWatch);

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				testUtils.createFolder(validPathToWatch);

				folderWatcherManager.checkFolderWatcherPaths(function () {
					folderWatcherManager.getFolderWatchers(function (watchers) {
						Object.keys(watchers).length.should.equal(1);

						(watchers[validPathToWatch] === undefined).should.be.false;

						closeAndDone(folderWatcherManager, done);
					});
				});
			}
		});
	});

	it('should correctly remove the folder watcher', function (done) {
		createStateHandlerStub({
			paths: [
				validPathToWatch
			]
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				folderWatcherFactoryStub.create.calledOnce.should.be.true;

				folderWatcherManager.removeFolderWatcher(validPathToWatch, function () {
					folderWatcherManager.getFolderWatchers(function (watchers) {
						Object.keys(watchers).length.should.equal(0);

						closeAndDone(folderWatcherManager, done);
					});
				});
			}
		});
	});

	it('should correctly add the folder watcher', function (done) {
		createStateHandlerStub({
			paths: []
		});

		var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
			closeOnProcessExit: false,
			onOpenCallback: function (err) {
				folderWatcherFactoryStub.create.callCount.should.equal(0);

				folderWatcherManager.addFolderWatcher(validPathToWatch, function () {
					folderWatcherFactoryStub.create.calledOnce.should.be.true;

					folderWatcherManager.getFolderWatchers(function (watchers) {
						Object.keys(watchers).length.should.equal(1);

						closeAndDone(folderWatcherManager, done);
					});
				});
			}
		});
	});

	describe('implementation tests: should correctly forward the events from the watchers', function () {
		var folderWatcherConfigStub:any;

		this.timeout(0);

		beforeEach(function () {
			folderWatcherConfigStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
				get: function (key) {
					if (key === 'fs.folderWatcher.interval') {
						return 1000;
					}
					else if (key === 'fs.folderWatcher.binaryInterval') {
						return 5000;
					}
					else if (key === 'fs.folderWatcher.eventDelay') {
						return 3000;
					}
				}
			});

			folderWatcherFactoryStub = testUtils.stubPublicApi(sandbox, FolderWatcherFactory, {
				create: function (config, pathToWatch, options) {
					options = options || {};
					options.closeOnProcessExit = false;
					return new FolderWatcher(folderWatcherConfigStub, pathToWatch, options);
				}
			});

			testUtils.createFolder(validPathToWatch);
		});

		afterEach(function () {
			testUtils.deleteFolderRecursive(validPathToWatch);
		});

		it ('should correctly forward the add event', function (done) {
			createStateHandlerStub({
				paths: [
					validPathToWatch
				]
			});

			var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
				closeOnProcessExit: false,
				onOpenCallback    : function (err) {
					folderWatcherManager.on('add', function (changedPath:string, stats:fs.Stats) {
						changedPath.should.equal(validPathToWatch + '/foo.txt');
						(stats !== null).should.be.true;

						closeAndDone(folderWatcherManager, done);
					});

					fs.writeFileSync(validPathToWatch + '/foo.txt', new Buffer(100));
				}
			});
		});

		it ('should correctly forward the change event', function (done) {
			var filePath:string = validPathToWatch + '/foo.txt';

			createStateHandlerStub({
				paths: [
					validPathToWatch
				]
			});

			fs.writeFileSync(filePath, new Buffer(100));

			var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
				closeOnProcessExit: false,
				onOpenCallback    : function (err) {
					folderWatcherManager.on('add', function (changedPath:string, stats:fs.Stats) {
						fs.writeFileSync(filePath, new Buffer(500));
					});

					folderWatcherManager.on('change', function (changedPath:string, stats:fs.Stats) {
						changedPath.should.equal(filePath);
						(stats !== null).should.be.true;

						closeAndDone(folderWatcherManager, done);
					});
				}
			});
		});

		it ('should correctly forward the unlink event', function (done) {
			var filePath:string = validPathToWatch + '/foo.txt';

			createStateHandlerStub({
				paths: [
					validPathToWatch
				]
			});

			fs.writeFileSync(filePath, new Buffer(100));

			var onAddChangeCallback = function() {};
			var folderWatcherManager = new FolderWatcherManager(configStub, stateHandlerFactoryStub, folderWatcherFactoryStub, {
				closeOnProcessExit: false,
				onOpenCallback    : function (err) {
					// on/off test
					folderWatcherManager.on('change', onAddChangeCallback);
					folderWatcherManager.off('change', onAddChangeCallback);

					folderWatcherManager.on('add', function (changedPath:string, stats:fs.Stats) {
						fs.unlinkSync(filePath);
					});

					folderWatcherManager.on('unlink', function (changedPath:string, stats:fs.Stats) {
						changedPath.should.equal(filePath);
						(stats === null).should.be.true;

						closeAndDone(folderWatcherManager, done);
					});
				}
			});
		});

	});

});