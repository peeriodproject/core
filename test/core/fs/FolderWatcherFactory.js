/// <reference path='../../test.d.ts' />
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');
var FolderWatcherFactory = require('../../../src/core/fs/FolderWatcherFactory');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> FS --> FolderWatcherFactory', function () {
    var sandbox;
    var configStub;
    var appQuitHandlerStub;

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

    it('should correctly create folder watchers', function () {
        var folderWatcher = (new FolderWatcherFactory()).create(configStub, appQuitHandlerStub, testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch'));
        folderWatcher.should.be.an.instanceof(FolderWatcher);
    });
});
//# sourceMappingURL=FolderWatcherFactory.js.map
