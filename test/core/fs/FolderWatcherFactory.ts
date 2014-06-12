/// <reference path='../../test.d.ts' />

require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');
import FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> FS --> FolderWatcherFactory', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var appQuitHandlerStub:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
		appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
	});

	afterEach(function () {
		sandbox.restore();
		configStub = null;
		appQuitHandlerStub = null;
	});

	it ('should correctly create folder watchers', function () {
		var folderWatcher = (new FolderWatcherFactory()).create(configStub, appQuitHandlerStub, testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
		folderWatcher.should.be.an.instanceof(FolderWatcher);
	});

});