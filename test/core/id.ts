/// <reference path='../test.d.ts' />

require('should');

var Id = require('../../src/core/topology/Id').Id;
/*
 Kademlia IDs are represented by instances node.js's Buffer class.
 The Byte Buffer will be interpreted as bigendian numbers, so the low index bytes are the most significant!
 */

describe('CORE --> ID', function () {

	it('should correctly calculate byte length by bit length', function (done) {

		var b1 = Id.calculateByteLengthByBitLength(160),
			b2 = Id.calculateByteLengthByBitLength(129);

		b1.should.equal(20);
		b2.should.equal(17);
		done();
	});

	it('should correctly instantiate Id without error', function () {
		var buffer = new Buffer([4, 128, 255]),
			id = new Id(buffer, 24);

		id.getBuffer().should.be.instanceOf(Buffer);
	});

	it('should correctly compute distance between to IDs', function () {
		var bit_length = 112,
			a = new Id(new Buffer([0,0,0,0,0,0,0,0,9,0,14,18,128,34]), bit_length),
			b = new Id(new Buffer([0,0,0,0,0,0,12,0,17,0,0,18,255,0]), bit_length),
			expected = new Buffer([0,0,0,0,0,0,12,0,24,0,14,0,127,34]),
			distTo = a.distanceTo(b);

		for (var i=0; i<14; ++i) {
			expected[i].should.equal(distTo[i]);
		}
	});




});