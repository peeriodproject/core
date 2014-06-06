/// <reference path='../../test.d.ts' />
var http = require('http');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var UiManager = require('../../../src/core/ui/UiManager');

describe('CORE --> UI --> UiManager @joern', function () {
    var sandbox;
    var configStub;
    var uiManager;

    var createUiManager = function (config, components, callback) {
        uiManager = new UiManager(config, components, {
            closeOnProcessExit: false,
            onOpenCallback: function () {
                callback();
            }
        });
    };

    var closeAndDone = function (done) {
        uiManager.close(function () {
            done();
        });
    };

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'ui.UiManager.staticServer.port') {
                    return 3000;
                } else if (key === 'ui.UiManager.staticServer.publicPath') {
                    return testUtils.getFixturePath('core/ui/uiManager/public');
                } else if (key === 'ui.UiManager.socketServer.path') {
                    return 8080;
                } else if (key === 'ui.UiManager.socketServer.transformer') {
                    return 'websockets';
                } else if (key === 'ui.UiManager.socketServer.pathname') {
                    return '/socket';
                }
            }
        });
    });

    afterEach(function () {
        sandbox.restore();
        configStub = null;
    });

    it('should correctly instantiate the UiManager', function (done) {
        createUiManager(configStub, [], function () {
            uiManager.close(function () {
                uiManager.should.be.an.instanceof(UiManager);

                closeAndDone(done);
            });
        });
    });

    it('should correctly return the open/close state', function (done) {
        createUiManager(configStub, [], function () {
            uiManager.open(function () {
                uiManager.isOpen(function (err, isOpen) {
                    (err === null).should.be.true;
                    isOpen.should.be.true;

                    http.get('http://localhost:3000', function (res) {
                        res.statusCode.should.equal(200);

                        uiManager.close(function () {
                            uiManager.isOpen(function (err, isOpen) {
                                (err === null).should.be.true;
                                isOpen.should.be.false;

                                http.get('http://localhost:3000', function (res) {
                                }).on('error', function (e) {
                                    e.code.should.equal('ECONNREFUSED');
                                    closeAndDone(done);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=UiManager.js.map
