/// <reference path='../../test.d.ts' />

import http = require('http');

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../utils/testUtils');

import ObjectConfig = require('../../../src/core/config/ObjectConfig');
import UiManager = require('../../../src/core/ui/UiManager');

describe('CORE --> UI --> UiManager @j_oern', function () {
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

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (key):any {
				if (key === 'ui.UiManager.serverPort') {
					return 3000;
				}
				else if (key === 'ui.UiManager.publicDirectory') {
					return testUtils.getFixturePath('core/ui/uiManager/public');
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
			console.log('opened');
			uiManager.close(function () {
				uiManager.should.be.an.instanceof(UiManager);

				closeAndDone(done);
			});
		});
	});

	it('should correctly return the open/close state @joern', function (done) {
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
									console.log(e.code.should.equal('ECONNREFUSED'));
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