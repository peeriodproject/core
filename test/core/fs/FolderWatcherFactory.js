/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcherFactory', function () {
    var sandbox;
    var configStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig);
    });

    afterEach(function () {
        sandbox.restore();
        configStub = null;
    });

    it('should correctly create folder watchers', function () {
        var folderWatcher = (new FolderWatcherFactory()).create(configStub, testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
        folderWatcher.should.be.an.instanceof(FolderWatcher);
    });
});
//# sourceMappingURL=FolderWatcherFactory.js.map
