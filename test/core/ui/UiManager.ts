/// <reference path='../../test.d.ts' />

import fs = require('fs');
import http = require('http');

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import AppQuitHandler = require('../../../src/core/utils/AppQuitHandler');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import UiManager = require('../../../src/core/ui/UiManager');
import UiComponent = require('../../../src/core/ui/UiComponent');

describe('CORE --> UI --> UiManager', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var appQuitHandlerStub:any;
	var uiManager:UiManager;

	var createUiManager = function (config,  appQuitHandler, components, callback) {
		uiManager = new UiManager(config, appQuitHandler, components, {
			onOpenCallback    : function () {
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
			get: function (key):any {
				if (key === 'ui.UiManager.staticServer.port') {
					return 7474;
				}
				else if (key === 'ui.UiManager.staticServer.publicPath') {
					return testUtils.getFixturePath('core/ui/uiManager/public');
				}
				else if (key === 'ui.UiManager.socketServer.path') {
					return 8080;
				}
				else if (key === 'ui.UiManager.socketServer.transformer') {
					return 'websockets';
				}
				else if (key === 'ui.UiManager.socketServer.parser') {
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

	it ('should correctly find the socket client library', function (done) {
		createUiManager(configStub, appQuitHandlerStub, [], function () {
			uiManager.open(function () {
				http.get('http://localhost:7474/primus.io.js', function (res) {
					res.statusCode.should.equal(200);

					closeAndDone(done);
				});
			});
		});
	});

	it ('should correctly create a socket connection', function (done) {
		var listeners = {};
		var componentStub = testUtils.stubPublicApi(sandbox, UiComponent, {
			getChannelName: function () {
				return 'chat';
			},
			getEventNames: function () {
				return ['foo'];
			},
			getState:function () {
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

	it ('should correctly forward a component update event', function (done) {
		var componentStub = testUtils.stubPublicApi(sandbox, UiComponent, {
			getChannelName: function () {
				return 'chat';
			},
			getEventNames: function () {
				return ['foo'];
			},
			getState:function () {
				return { foo: 'bar' };
			}
		});

		createUiManager(configStub, appQuitHandlerStub, [componentStub], function () {
			// trigger the onUiUpdate listener
			componentStub.onUiUpdate.getCall(0).args[0]();

			componentStub.getState.callCount.should.equal(1);
			componentStub.onAfterUiUpdate.callCount.should.equal(1);
			componentStub.getState.calledBefore(componentStub.onAfterUiUpdate).should.be.true;

			done();
		});
	});

});