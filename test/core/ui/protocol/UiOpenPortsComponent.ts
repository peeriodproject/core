/// <reference path='../../../test.d.ts' />

import should = require('should');

import sinon = require('sinon');
import testUtils = require('../../../utils/testUtils');

import JSONStateHandler = require('../../../../src/core/utils/JSONStateHandler');
import UiOpenPortsComponent = require('../../../../src/core/ui/protocol/UiOpenPortsComponent');

describe('CORE --> UI --> PROTOCOL --> UiOpenPortsComponent', function () {
	var sandbox:SinonSandbox;
	var component:UiOpenPortsComponent;
	var stateHandlerStub:any;

	var uiUpdateSpy:any;

	beforeEach(function () {
		sandbox = sinon.sandbox.create();
		stateHandlerStub = testUtils.stubPublicApi(sandbox, JSONStateHandler, {

			load: function () {
				return process.nextTick(arguments[0].bind(null, null, []));
			},

			save: function () {
				return process.nextTick(arguments[1].bind(null, null));
			}
		});

		uiUpdateSpy = sandbox.spy();

		component = new UiOpenPortsComponent(stateHandlerStub);
		component.onUiUpdate(uiUpdateSpy);
	});

	afterEach(function () {
		sandbox.restore();

		component = null;
		stateHandlerStub = null;
	});

	it('should correctly instantiate without error', function () {
		component.should.be.an.instanceof(UiOpenPortsComponent);
	});

	it('should correctly return the channel name', function () {
		component.getChannelName().should.equal('openports');
	});

	it('should correctly return the event names', function () {
		component.getEventNames().should.containDeep([
			'addPort',
			'removePort'
		]);
	});

	it('should correctly return the initial state', function (done) {
		component.getState(function (state) {
			state.ports.should.be.an.instanceof(Array);
			state.ports.should.have.a.lengthOf(0);
			state.portsChanged.should.be.false;

			done();
		});
	});

	it('should correctly add a new port and save the state', function (done) {
		component.emit('addPort', 123);

		setImmediate(function () {
			uiUpdateSpy.calledOnce.should.be.true;

			component.getState(function (state) {
				state.ports.should.have.a.lengthOf(1);
				state.ports[0].should.equal(123);
				state.portsChanged.should.be.true;

				done();
			});
		});
	});

	it('should correctly remove an existing port and save the state', function (done) {
		component.emit('addPort', 123);
		component.emit('addPort', 321);

		setImmediate(function () {
			//uiUpdateSpy.calledOnce.should.be.true;

			component.emit('removePort', 123);
			component.emit('removePort', 567);

			setImmediate(function () {
				uiUpdateSpy.calledTwice.should.be.true;

				component.getState(function (state) {
					state.ports.should.have.a.lengthOf(1);
					state.ports[0].should.equal(321);
					state.portsChanged.should.be.true;

					done();
				});
			});
		});
	});

});