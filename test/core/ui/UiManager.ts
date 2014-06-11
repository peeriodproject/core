/// <reference path='../../test.d.ts' />

import fs = require('fs');
import http = require('http');

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import UiManager = require('../../../src/core/ui/UiManager');
import UiComponent = require('../../../src/core/ui/UiComponent');

describe('CORE --> UI --> UiManager', function () {
	var sandbox:SinonSandbox;
	var configStub:any;
	var uiManager:UiManager;

	var createUiManager = function (config, components, callback) {
		uiManager = new UiManager(config, components, {
			closeOnProcessExit: false,
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
					return 3000;
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
	});

	afterEach(function () {
		sandbox.restore();
		configStub = null;

		fs.unlinkSync(testUtils.getFixturePath('core/ui/uiManager/public/primus.io.js'));
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

	it ('should correctly find the socket client library', function (done) {
		createUiManager(configStub, [], function () {
			uiManager.open(function () {
				http.get('http://localhost:3000/primus.io.js', function (res) {
					res.statusCode.should.equal(200);

					closeAndDone(done);
				});
			});
		});
	});

	it ('should correctly create a socket connection', function (done) {
		var componentStub = testUtils.stubPublicApi(sandbox, UiComponent, {
			getChannelName: function () {
				return 'chat';
			},
			onConnection: function (spark) {
				spark.send('message', 'welcome to this chat', function (message) {
					message.should.equal('i am glad to be here!');
				});

				spark.on('weather', function(message, callback) {
					message.should.equal('how is it outside?');

					callback('it is nice and sunny.');
				});
			}

		});

		createUiManager(configStub, [componentStub], function () {
			uiManager.open(function () {
				var socket = uiManager.getSocketServer().Socket('ws://localhost:3000');

				http.get('http://localhost:3000', function (res) {
					res.statusCode.should.equal(200);

					var chat = socket.channel('chat');

					chat.on('message', function (message, callback) {
						message.should.equal('welcome to this chat');

						callback('i am glad to be here!');

						chat.send('weather', 'how is it outside?', function (message) {
							message.should.equal('it is nice and sunny.');

							closeAndDone(done);
						});
					});
				});
			});
		});
	});
});