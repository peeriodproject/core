/// <reference path='../../test.d.ts' />

require('should');
import testUtils = require('../../utils/testUtils');

import FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
import FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcherFactory', function () {

	it ('should correctly create folder watchers', function () {
		var folderWatcher = (new FolderWatcherFactory()).create(testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
		folderWatcher.should.be.an.instanceof(FolderWatcher);
	});

});