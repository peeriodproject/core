/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcher @joern', function () {
	var sandbox:SinonSandbox;
	var configStub:any
	var validPathToWatch:string = testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch');

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
		sandbox.restore();
		configStub = null;
		testUtils.deleteFolderRecursive(validPathToWatch);
	});

	it('should correctly instantiate the folder watcher', function () {
		(new FolderWatcher(configStub, validPathToWatch)).should.be.an.instanceof(FolderWatcher);
	});
});