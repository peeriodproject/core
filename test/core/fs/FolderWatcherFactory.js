/// <reference path='../../test.d.ts' />
require('should');
var testUtils = require('../../utils/testUtils');

var FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcherFactory', function () {
    it('should correctly create folder watchers', function () {
        var folderWatcher = (new FolderWatcherFactory()).create(testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
        folderWatcher.should.be.an.instanceof(FolderWatcher);
    });
});
//# sourceMappingURL=FolderWatcherFactory.js.map
