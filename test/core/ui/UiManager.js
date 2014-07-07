/// <reference path='../../test.d.ts' />
var fs = require('fs');
var http = require('http');

var sinon = require('sinon');
var testUtils = require('../../utils/testUtils');

var AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
var ObjectConfig = require('../../../src/core/config/ObjectConfig');
var UiManager = require('../../../src/core/ui/UiManager');
var UiComponent = require('../../../src/core/ui/UiComponent');

describe('CORE --> UI --> UiManager', function () {
    var sandbox;
    var configStub;
    var appQuitHandlerStub;
    var uiManager;

    var createUiManager = function (config, appQuitHandler, components, callback) {
        uiManager = new UiManager(config, appQuitHandler, components, {
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

    before(function () {
        var primusJsPath = testUtils.getFixturePath('core/ui/uiManager/public/primus.io.js');

        if (fs.existsSync(primusJsPath)) {
            fs.unlinkSync(primusJsPath);
        }
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
            get: function (key) {
                if (key === 'ui.UiManager.staticServer.port') {
                    return 7474;
                } else if (key === 'ui.UiManager.staticServer.publicPath') {
                    return testUtils.getFixturePath('core/ui/uiManager/public');
                } else if (key === 'ui.UiManager.socketServer.path') {
                    return 8080;
                } else if (key === 'ui.UiManager.socketServer.transformer') {
                    return 'websockets';
                } else if (key === 'ui.UiManager.socketServer.parser') {
                    return 'JSON';
                }
            }
        });
        appQuitHandlerStub = testUtils.stubPublicApi(sandbox, AppQuitHandler);
    });

    afterEach(function () {
        sandbox.restore();
        configStub = null;
        appQuitHandlerStub = null;

        fs.unlinkSync(testUtils.getFixturePath('core/ui/uiManager/public/primus.io.js'));
    });

    it('should correctly instantiate the UiManager', function (done) {
        createUiManager(configStub, appQuitHandlerStub, [], function () {
            uiManager.close(function () {
                uiManager.should.be.an.instanceof(UiManager);

                closeAndDone(done);
            });
        });
    });

    it('should correctly return the open/close state', function (done) {
        createUiManager(configStub, appQuitHandlerStub, [], function () {
            uiManager.open(function () {
                uiManager.isOpen(function (err, isOpen) {
                    (err === null).should.be.true;
                    isOpen.should.be.true;

                    http.get('http://localhost:7474', function (res) {
                        res.statusCode.should.equal(200);

                        uiManager.close(function () {
                            uiManager.isOpen(function (err, isOpen) {
                                (err === null).should.be.true;
                                isOpen.should.be.false;

                                http.get('http://localhost:7474', function (res) {
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

    it('should correctly find the socket client library', function (done) {
        createUiManager(configStub, appQuitHandlerStub, [], function () {
            uiManager.open(function () {
                http.get('http://localhost:7474/primus.io.js', function (res) {
                    res.statusCode.should.equal(200);

                    closeAndDone(done);
                });
            });
        });
    });

    it('should correctly create a socket connection', function (done) {
        var listeners = {};
        var componentStub = testUtils.stubPublicApi(sandbox, UiComponent, {
            getChannelName: function () {
                return 'chat';
            },
            getEventNames: function () {
                return ['foo'];
            },
            getState: function () {
                return { foo: 'bar' };
            },
            emit: function () {
                // callback(data)
                return arguments[2](arguments[1]);
            }
        });

        createUiManager(configStub, appQuitHandlerStub, [componentStub], function () {
            uiManager.open(function () {
                var socket = uiManager.getSocketServer().Socket('ws://localhost:7474');

                http.get('http://localhost:7474', function (res) {
                    res.statusCode.should.equal(200);

                    var chat = socket.channel('chat');

                    chat.send('getInitialState', function (state) {
                        JSON.stringify(state).should.equal(JSON.stringify({ foo: 'bar' }));
                    });

                    chat.send('foo', { data: true }, function (message) {
                        JSON.stringify(message).should.equal(JSON.stringify({ data: true }));

                        closeAndDone(done);
                    });
                });
            });
        });
    });
});
//# sourceMappingURL=UiManager.js.map
