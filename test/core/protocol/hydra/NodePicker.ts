/// <reference path='../../../test.d.ts' />

require('should');

import sinon = require('sinon');

import testUtils = require('../../../utils/testUtils');

import NodePicker = require('../../../../src/core/protocol/hydra/NodePicker');
import RoutingTable = require('../../../../src/core/topology/RoutingTable');
import ContactNodeAddress = require('../../../../src/core/topology/ContactNodeAddress');
import ContactNode = require('../../../../src/core/topology/ContactNode');
import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');
import ObjectConfig = require('../../../../src/core/config/ObjectConfig');

describe('CORE --> PROTOCOL --> HYDRA --> NodePicker @current', function () {

	this.timeout(0);

	var sandbox:SinonSandbox;

	var randomNodeList:any = [];
	var i = 0;

	var nodePicker:NodePicker = null;

	var returnPort:number = 80;



	var setRandomNode = function (ip:string) {
		if (ip) {
			randomNodeList.push(testUtils.stubPublicApi(sandbox, ContactNode, {
				getAddresses: function () {
					return [testUtils.stubPublicApi(sandbox, ContactNodeAddress, {
						getPort: function () {
							return returnPort;
						},
						getIp  : function () {
							return ip;
						}
					})];
				}
			}));
		}
		else {
			randomNodeList.push(null);
		}

	};


	var routingTable:any = null;
	var config:any = null;

	var createRandomList = function (ips:Array<string>) {
		randomNodeList = [];
		i = 0;
		for (var j = 0, l = ips.length; j < l; j++) {
			setRandomNode(ips[j]);
		}
	};

	before(function () {
		sandbox = sinon.sandbox.create();

		config = testUtils.stubPublicApi(sandbox, ObjectConfig, {
			get: function (what):any {
				if (what === 'hydra.additiveSharingNodeAmount')    return 3;
				if (what === 'hydra.nodePicker.roundThreshold') return 2;
				if (what === 'hydra.nodePicker.waitingTimeInSeconds') return 1;
				if (what === 'hydra.nodePicker.errorThreshold') return 2;
				if (what === 'hydra.nodePicker.allowIdenticalIps') return true;
			}
		});

		routingTable = testUtils.stubPublicApi(sandbox, RoutingTable, {
			getRandomContactNode: function (cb) {
				var node = randomNodeList[i];
				i++;
				if (node) {
					cb(null, node);
				}
				else {
					cb(new Error(), null);
				}

			}
		});
	});

	after(function () {
		sandbox.restore();
	});

	it('should correctly instantiate', function () {
		nodePicker = new NodePicker(config, 3, routingTable);

		nodePicker.should.be.instanceof(NodePicker);
		nodePicker.getAdditiveNodeAmount().should.equal(3);
		nodePicker.getThreshold().should.equal(2);
		nodePicker.getErrorThreshold().should.equal(2);
		nodePicker.getWaitingTime().should.equal(1000);
	});

	it('should throw an error when trying to pick additive nodes before relay nodes', function () {
		(function () {
			nodePicker.pickNextAdditiveNodeBatch(null);
		}).should.throw('NodePicker: Picking additive nodes before relay nodes is not allowed!');
	});

	it('should throw an error when trying to pick an additional relay nodes before general relay nodes', function () {
		(function () {
			nodePicker.pickAdditionalRelayNode(null);
		}).should.throw('NodePicker: Picking additional relay node before general relay nodes is not allowed!');
	});

	it('should pick three relay nodes', function (done) {
		createRandomList(['a', 'b', 'a', 'c']);

		nodePicker.pickRelayNodeBatch(function (b) {

			if (b[0].ip === 'a' && b[1].ip === 'b' && b[2].ip === 'c') done();
		});
	});

	it('should throw an error when picking relay nodes again', function () {
		(function () {
			nodePicker.pickRelayNodeBatch(null);
		}).should.throw('NodePicker: Relay nodes can only be picked once!');
	});

	it('should pick three additive nodes after a wait time', function (done) {
		var now = Date.now();
		createRandomList(['d', 'c', 'e', 'e', 'd', 'f']);

		nodePicker.pickNextAdditiveNodeBatch(function (b) {

			if (b[0].ip === 'd' && b[1].ip === 'e' && b[2].ip === 'f' && Date.now() - now > 1000) done();
		});
	});

	it('list check 1', function () {
		var a = nodePicker.getRelayNodes();
		var b = nodePicker.getNodesUsed();

		a[0].ip.should.equal('a');
		a[1].ip.should.equal('b');
		a[2].ip.should.equal('c');
		b[0].ip.should.equal('d');
		b[1].ip.should.equal('e');
		b[2].ip.should.equal('f');
	});

	it('should pick three additive nodes with threshold', function (done) {
		var now = Date.now();

		createRandomList([null, 'd', 'd', 'a', 'e', null, 'f', 'f', 'g']);

		nodePicker.pickNextAdditiveNodeBatch(function (b) {
			if (b[0].ip === 'd' && b[1].ip === 'e' && b[2].ip === 'g' && Date.now() - now > 2000) done();
		});
	});

	it('list check 2', function () {
		var b = nodePicker.getNodesUsed();

		b[0].ip.should.equal('d');
		b[1].ip.should.equal('e');
		b[2].ip.should.equal('f');
		b[3].ip.should.equal('d');
		b[4].ip.should.equal('e');
		b[5].ip.should.equal('g');
	});

	it('should pick an additional relay node', function (done) {
		createRandomList(['a', 'd', 'h']);

		nodePicker.pickAdditionalRelayNode(function (node) {
			if (node.ip === 'h' && nodePicker.getRelayNodes()[3].ip === 'h') done();
		});
	});

	it('should pick nodes with the same ip but different port', function (done) {
		returnPort = 70;
		createRandomList(['d', 'e', 'f']);

		nodePicker.pickNextAdditiveNodeBatch(function (b) {

			b[0].ip.should.equal('d');
			b[1].ip.should.equal('e');
			b[2].ip.should.equal('f');
			done();
		});
	});

});