/// <reference path='../../test.d.ts' />
var fs = require('fs');
require('should');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var FolderWatcher = require('../../../src/core/fs/FolderWatcher');

describe('CORE --> FS --> FolderWatcher @joern', function () {
    var sandbox;
    var configStub;
    var validPathToWatch = testUtils.getFixturePath('core/fs/folderWatcherTest/folderToWatch');
    var options = {
        closeOnProcessExit: false
    };
    var folderWatcher;

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
        folderWatcher.on('add', function (path, stats) {
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
//# sourceMappingURL=FolderWatcher.js.map
