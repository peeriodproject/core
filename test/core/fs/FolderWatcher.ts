/// <reference path='../../test.d.ts' />

import fs = require('fs');
require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');


import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcher @joern', function () {
	var sandbox:SinonSandbox;
	var configStub:any
	var validPathToWatch:string = testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch');
	var options = {
		closeOnProcessExit: false
	};
	var folderWatcher:FolderWatcher;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
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
		})
		testUtils.createFolder(validPathToWatch);
	});

	afterEach(function () {
		folderWatcher.close();
		folderWatcher = null;

		sandbox.restore();
		configStub = null;
		testUtils.deleteFolderRecursive(validPathToWatch);
	});

	it('should correctly instantiate the folder watcher', function () {
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);
		folderWatcher.should.be.an.instanceof(FolderWatcher);
	});

	it('should correctly return the state of the watcher', function () {
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.isOpen().should.be.true;
		folderWatcher.close();
		folderWatcher.close();
		folderWatcher.isOpen().should.be.false;
		folderWatcher.open();
		folderWatcher.open();
		folderWatcher.isOpen().should.be.true;
	});

	it('should correctly trigger one add event', function (done) {
		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);
		folderWatcher.on('add', function (path:string, stats:fs.Stats) {
			done();
		});

		fs.writeFileSync(validPathToWatch + '/message.txt', 'Hello Node');
	});

	/*it('should correctly trigger one add event', function (done) {
		fs.writeFileSync(validPathToWatch + '/message.txt', 'Hello Node');

		folderWatcher = new FolderWatcher(configStub, validPathToWatch, options);

		folderWatcher.on('add', function (path:string, stats:fs.Stats) {

			done();
		});
	});*/
});