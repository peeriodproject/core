/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcherFactory', function () {
	var sandbox:SinonSandbox;
	var configStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
	});

	afterEach(function () {
		sandbox.restore();
		configStub = null;
	});

	it ('should correctly create folder watchers', function () {
		var folderWatcher = (new FolderWatcherFactory()).create(configStub, testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
		folderWatcher.should.be.an.instanceof(FolderWatcher);
	});

});