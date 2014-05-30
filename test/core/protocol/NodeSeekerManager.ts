require('should');

import sinon = require('sinon');

import testUtils = require('../../utils/testUtils');
import NodeSeekerManager = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerManager');
import HttpNodeSeeker = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/HttpNodeSeeker');
import NodeSeekerList = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/interfaces/NodeSeekerList');
import NodeSeekerFactory = require('../../../src/core/protocol/networkMaintenance/nodeDiscovery/nodeSeeker/NodeSeekerFactory');
import ProtocolConnectionManager = require('../../../src/core/protocol/net/ProtocolConnectionManager');
import ProxyManager = require('../../../src/core/protocol/proxy/ProxyManager');
import ContactNodeInterface = require('../../../src/core/topology/interfaces/ContactNodeInterface');
import ContactNode = require('../../../src/core/topology/ContactNode');
import Id = require('../../../src/core/topology/Id');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> NodeSeekerManager', function () {

	var sandbox:SinonSandbox = null;
	var proxyStub:any = null;
	var protocolConnectionManagerStub:any = null;
	var factoryStub:any = null;

	var onContactCallback = null;

	var emitActiveNode = function (node) {
		if (onContactCallback) {
			onContactCallback(node);
			onContactCallback = null;
		}
	};

	var createSeeker = function (idString) {
		return testUtils.stubPublicApi(sandbox, HttpNodeSeeker, {
			seek: function (cb) {
				if (idString) {
					cb(testUtils.stubPublicApi(sandbox, ContactNode, {
						getId: function () {
							return idString;
						}
					}));
				}
				else {
					cb(null);
				}
			}
		});
	};

	var createNode = function (idString) {
		return testUtils.stubPublicApi(sandbox, ContactNode, {
			getId: function () {
				return idString;
			}
		});
	};

	// checkers
	var sentPingTo = null;
	var createOnNextTick = false;

	var onceCalled = 0;

	before(function () {
		sandbox = sinon.sandbox.create();

		proxyStub = testUtils.stubPublicApi(sandbox, ProxyManager, {
			once: function (evt, cb) {
				if (evt === 'contactNodeInformation') onContactCallback = cb;
			}
		});

		protocolConnectionManagerStub = testUtils.stubPublicApi(sandbox, ProtocolConnectionManager, {
			writeMessageTo: function (who, type) {
				if (type === 'PING') sentPingTo = who;
			}
		});

		factoryStub = testUtils.stubPublicApi(sandbox, NodeSeekerFactory, {
			createSeekerList: function (cb) {
				var list = [createSeeker('foo'), createSeeker(null), createSeeker('bar')];
				if (createOnNextTick) {
					setImmediate(function () {
						cb(list);
					});
				}
				else cb(list);
			}
		});

	});

	it('should ping a node and find it', function (done) {
		var manager = new NodeSeekerManager(factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node === 'foo' && (sentPingTo.getId() === 'foo' || sentPingTo.getId() === 'bar')) done();
		});

		setTimeout(function () {
			emitActiveNode('foo');
		}, 10);
	});

	it('should cache the callback and find the node later', function (done) {
		createOnNextTick = true;

		var manager = new NodeSeekerManager(factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node === 'foo' && (sentPingTo.getId() === 'foo' || sentPingTo.getId() === 'bar')) done();
		});

		setTimeout(function () {
			emitActiveNode('foo');
		}, 10);
	});

	it('should not ping another node as soon as one is found', function (done) {
		var manager = new NodeSeekerManager(factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node === 'foo' && (sentPingTo.getId() === 'foo' || sentPingTo.getId() === 'bar')) {
				sentPingTo = null;
				setTimeout(function () {
					if (sentPingTo === null) done();
				}, 100);
			}
		});

		setTimeout(function () {
			emitActiveNode('foo');
		}, 10);


	});

	it('should avoid a node', function (done) {
		var manager = new NodeSeekerManager(factoryStub, protocolConnectionManagerStub, proxyStub);

		var avoidNode = testUtils.stubPublicApi(sandbox, ContactNode, {
			getId: function () {
				return testUtils.stubPublicApi(sandbox, Id, {
					equals: function (to) {
						if (to === 'foo') return true;
						return false;
					}
				});
			}
		});

		manager.forceFindActiveNode(avoidNode, function (node:any) {
			if (node.getId() === 'bar') done();
		});

		setTimeout(function () {
			emitActiveNode(createNode('foo'));
			setTimeout(function () {
				emitActiveNode(createNode('bar'));
			}, 10);
		}, 10);
	});





	after(function () {
		sandbox.restore();
	});

});
