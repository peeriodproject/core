/// <reference path='../../../test.d.ts' />

require('should');

import Aes128GcmLayeredEncDecHandler = require('../../../../src/core/protocol/hydra/messages/Aes128GcmLayeredEncDecHandler');
import HydraNode = require('../../../../src/core/protocol/hydra/interfaces/HydraNode');

describe('CORE --> PROTOCOL --> HYDRA --> Aes128GcmLayeredEncDecHandler', function () {

	var handler:Aes128GcmLayeredEncDecHandler = null;
	var nodes:Array<HydraNode> = null;

	before(function () {

		// our list of hydra nodes, we use identical keys for outgoing and incoming
		nodes = [
			{
				ip: '127.0.0.1',
				incomingKey: new Buffer('d206bd882c45dcee083efe956e320748', 'hex'),
				outgoingKey: new Buffer('d206bd882c45dcee083efe956e320748', 'hex')
			},
			{
				ip: '127.0.0.1',
				incomingKey: new Buffer('d1cafc51120ddc12de1a64637ed2f9ee', 'hex'),
				outgoingKey: new Buffer('d1cafc51120ddc12de1a64637ed2f9ee', 'hex')
			},
			{
				ip: '127.0.0.1',
				incomingKey: new Buffer('9547f1665d90b1a5f89f4d74c5c2bac2', 'hex'),
				outgoingKey: new Buffer('9547f1665d90b1a5f89f4d74c5c2bac2', 'hex')
			},
			{
				ip: '127.0.0.1',
				incomingKey: new Buffer('c6d6b6f5e6aacdd0601816662a1a3cc0', 'hex'),
				outgoingKey: new Buffer('c6d6b6f5e6aacdd0601816662a1a3cc0', 'hex')
			}
		];

	});

	it('should correctly construct an enc dec handler', function () {
		handler = new Aes128GcmLayeredEncDecHandler(nodes[0]);

		handler.should.be.instanceof(Aes128GcmLayeredEncDecHandler);
		handler.getNodes().length.should.equal(1);

		for (var i=1; i<nodes.length; i++) {
			handler.addNode(nodes[i]);
		}

		handler.getNodes().length.should.equal(nodes.length);

		for (var i=0; i<nodes.length; i++) {
			handler.getNodes()[i].incomingKey.toString('hex').should.equal(nodes[i].incomingKey.toString('hex'));
		}
	});

	it('should correctly encrypt and decrypt without early exit', function (done) {
		var payload = new Buffer('Foobar muschi muschi muschi mami papi', 'utf8');

		handler.encrypt(payload, null, function (err, buffer) {

			if (!err) {
				handler.decrypt(buffer, function (err, buff) {
					if (!err && buff.toString('utf8') === payload.toString('utf8')) done();
				});
			}
		});
	});

	it('should correctly encrypt and decrypt with early exit', function (done) {
		var payload = new Buffer('Foobar muschi muschi muschi mami papi', 'utf8');

		handler.encrypt(payload, nodes[3], function (err, buffer) {

			if (!err) {
				handler.decrypt(buffer, function (err, buff) {
					if (!err && buff.toString('utf8') === payload.toString('utf8')) done();
				});
			}
		});
	});

	it('should throw an error when adding a node without incoming key', function () {
		(function () {
			handler.addNode({ip:'foobar', incomingKey: new Buffer(16)});
		}).should.throw();

		handler.getNodes().length.should.equal(4);
	});

	it('should callback an error when there are no nodes for decryption', function (done) {
		var a = new Aes128GcmLayeredEncDecHandler();
		a.decrypt(new Buffer(20), function (err, payload) {
			if (!payload && err.message === 'Aes128GcmLayeredEncDecHandler: No nodes for decryption') done();
		});
	});

	it('should callback an error when there are no nodes for encryption', function (done) {
		var a = new Aes128GcmLayeredEncDecHandler();
		a.encrypt(new Buffer(20), null, function (err, payload) {
			if (!payload && err.message === 'Aes128GcmLayeredEncDecHandler: No nodes for encryption') done();
		});
	});

	it('should callback an error when encrypting and specifying a non-extining early exit node', function (done) {
		handler.encrypt(new Buffer(20), {ip:'foobar', incomingKey: new Buffer(16), outgoingKey: new Buffer(16)}, function (err, buff) {
			if (!buff && err.message === 'Aes128GcmLayeredEncDecHandler: All nodes exhausted, no early exit node found.') done();
		});
	});

	it('should callback an error on an internal encryption error', function (done) {
		nodes[3].outgoingKey = new Buffer('9547f1665d90b1a5f89f4d74c5c2ba', 'hex')
		handler.encrypt(new Buffer(20), null, function (err, buff) {
			if (err && !buff) {
				nodes[3].outgoingKey = new Buffer('9547f1665d90b1a5f89f4d74c5c2bac2', 'hex')
				done();
			}
		});
	});

	it('should callback an error on an internal decryption error', function (done) {
		handler.decrypt(new Buffer(10), function (err, buffer) {
			if (err && !buffer) done();
		});
	});

	it('should callback an error when decrypting and unable to reach a receiver msg', function (done) {
		var payload = new Buffer('Foobar muschi muschi muschi mami papi', 'utf8');

		handler.encrypt(payload, null, function (err, buffer) {

			if (!err) {
				handler.getNodes().splice(3, 1);
				handler.decrypt(buffer, function (err, buff) {
					if (!buff && err && err.message === 'Aes128GcmLayeredEncDecHandler: All nodes exhausted, could not completely decrypt.') done();
				});
			}
		});
	});

});