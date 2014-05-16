/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcher @joern', function () {
    var sandbox;
    var configStub;
    var validPathToWatch = testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch');

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'fs.folderWatcher.interval') {
                    return 1000;
                } else if (key === 'fs.folderWatcher.binaryInterval') {
                    return 5000;
                } else if (key === 'fs.folderWatcher.eventDelay') {
                    return 3000;
                }
            }
        });
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
//# sourceMappingURL=FolderWatcher.js.map
