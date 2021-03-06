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
import MyNode = require('../../../src/core/topology/MyNode');
import ObjectConfig = require('../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> NODE DISCOVERY --> NodeSeekerManager', function () {

	var sandbox:SinonSandbox = null;
	var proxyStub:any = null;
	var protocolConnectionManagerStub:any = null;
	var factoryStub:any = null;
	var configStub:any = null;
	var myNodeStub:any = null;

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
							return new Id(Id.byteBufferByHexString(idString, 1), 8)
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
				return new Id(Id.byteBufferByHexString(idString, 1), 8)
			}
		});
	};

	// checkers
	var sentPingTo = null;
	var createOnNextTick = false;

	var onceCalled = 0;

	before(function () {
		sandbox = sinon.sandbox.create();

		configStub = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what) {
				if (what === 'protocol.nodeDiscovery.iterativeSeekTimeoutInMs') return 10;
			}
		});

		myNodeStub = testUtils.stubPublicApi(sandbox, MyNode, {
			getId: function() {
				return new Id(Id.byteBufferByHexString('ff', 1), 8);
			}
		})

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
				var list = [createSeeker('ef'), createSeeker(null), createSeeker('af')];
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
		var manager = new NodeSeekerManager(configStub, myNodeStub, factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node.getId().toHexString() === 'ef' && (sentPingTo.getId().toHexString() === 'ef' || sentPingTo.getId().toHexString() === 'af')) done();
		});

		setTimeout(function () {
			emitActiveNode(createNode('ef'));
		}, 100);
	});

	it('should cache the callback and find the node later', function (done) {
		createOnNextTick = true;

		var manager = new NodeSeekerManager(configStub, myNodeStub, factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node.getId().toHexString() === 'ef' && (sentPingTo.getId().toHexString() === 'ef' || sentPingTo.getId().toHexString() === 'af')) done();
		});

		setTimeout(function () {
			emitActiveNode(createNode('ef'));
		}, 100);
	});

	it('should not ping another node as soon as one is found', function (done) {
		var manager = new NodeSeekerManager(configStub, myNodeStub, factoryStub, protocolConnectionManagerStub, proxyStub);

		manager.forceFindActiveNode(null, function (node:any) {
			if (node.getId().toHexString() === 'ef' && (sentPingTo.getId().toHexString() === 'ef' || sentPingTo.getId().toHexString() === 'af')) {
				sentPingTo = null;
				setTimeout(function () {
					if (sentPingTo === null) done();
				}, 100);
			}
		});

		setTimeout(function () {
			emitActiveNode(createNode('ef'));
		}, 100);


	});

	it('should avoid a node', function (done) {
		var manager = new NodeSeekerManager(configStub, myNodeStub, factoryStub, protocolConnectionManagerStub, proxyStub);

		var avoidNode = createNode('ef');

		manager.forceFindActiveNode(avoidNode, function (node:any) {
			if (node.getId().toHexString() === 'af') done();
		});

		setTimeout(function () {
			emitActiveNode(createNode('ef'));
			setTimeout(function () {
				emitActiveNode(createNode('af'));
			}, 100);
		}, 100);
	});





	after(function () {
		sandbox.restore();
	});

});
