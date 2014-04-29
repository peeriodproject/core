/// <reference path='../../test.d.ts' />

require('should');

var Id = require('../../../src/core/topology/Id');
/*
 Kademlia IDs are represented by instances of node.js's Buffer class.

 The Byte Buffer will be interpreted as bigendian numbers, so the low index bytes are the most significant!
 */

describe('CORE --> TOPOLOGY --> ID', function () {

	it('should correctly calculate byte length by bit length', function () {

		var b1 = Id.calculateByteLengthByBitLength(160),
			b2 = Id.calculateByteLengthByBitLength(129);

		b1.should.equal(20);
		b2.should.equal(17);
	});

	it('should correctly instantiate Id without error', function () {
		var buffer = new Buffer([4, 128, 255]),
			id = new Id(buffer, 24);

		id.getBuffer().should.be.instanceOf(Buffer);
	});

	it('should correctly compute distance between two IDs', function () {
		var bit_length = 112,
			a = new Id(new Buffer([0,0,0,0,0,0,0,0,9,0,14,18,128,34]), bit_length),
			b = new Id(new Buffer([0,0,0,0,0,0,12,0,17,0,0,18,255,0]), bit_length),
			expected = new Buffer([0,0,0,0,0,0,12,0,24,0,14,0,127,34]),
			distTo = a.distanceTo(b);

		for (var i=0; i<14; ++i) {
			expected[i].should.equal(distTo[i]);
		}
	});

	it('should correctly set bits at the right positions', function () {
		var bit_length = 112,
			a = new Id(new Buffer([0,0,0,0,0,0,0,0,9,0,14,18,128,34]), bit_length);

		a.set(3, 1);
		a.set(72, 1);
		a.set(26, 0);
		a.set(90, 1);
		var expected = new Buffer([0,0,4,0,1,0,0,0,9,0,10,18,128,42]);
		for (var i=0; i<14; ++i) {
			expected[i].should.equal(a.getBuffer()[i]);
		}
	});

	it('should correctly tell if two IDs are equal', function () {
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48),
			b = new Id(new Buffer([134,0,14,18,128,2]), 48);

		a.equals(a).should.be.true;
		a.equals(b).should.be.false;
	});

	it('should correctly tell the bit at a position', function () {
		// 000010010000000000001110000100101000000000100010
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48);

		a.at(0).should.equal(0);
		a.at(1).should.equal(1);
		a.at(15).should.equal(1);
		a.at(20).should.equal(1);
		a.at(22).should.equal(0);
	});

	it('should correctly compare the distances', function () {
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48),
			b = new Id(new Buffer([134,0,14,18,128,2]), 48),
			c = new Id(new Buffer([255,19,14,18,128,34]), 48);

		a.compareDistance(b, c).should.be.above(0);
		a.compareDistance(a, b).should.be.above(0);
		a.compareDistance(c, b).should.be.below(0);
		a.compareDistance(b, b).should.equal(0);
	});

	it('should correctly tell the highest bit in which two IDs differ', function () {
			// 000010010000000000001110000100101000000000100010
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48),

			// 001010010000000000001110000100101000000000100010
			b = new Id(new Buffer([41,0,14,18,128,2]), 48),

			// 000010110000000000001110000100101000000000100010
			c = new Id(new Buffer([11,19,14,18,128,34]), 48),

			// 100010110000000000001110000100101000000000100010
			d = new Id(new Buffer([139,19,14,18,128,34]), 48);

		a.differsInHighestBit(b).should.equal(45);
		a.differsInHighestBit(c).should.equal(41);
		a.differsInHighestBit(d).should.equal(47);
		a.differsInHighestBit(a).should.equal(-1);
	});

	describe('should correctly represent the ID as string', function () {
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48),
			b = new Id(new Buffer([134,0,14,18,128,2]), 48),
			c = new Id(new Buffer([255,19,14,18,128,34]), 48);

		it('as bit string', function () {
			var expected_a = '000010010000000000001110000100101000000000100010',
				expected_b = '100001100000000000001110000100101000000000000010',
				expected_c = '111111110001001100001110000100101000000000100010';

			a.toBitString().should.equal(expected_a);
			b.toBitString().should.equal(expected_b);
			c.toBitString().should.equal(expected_c);
		});

		it('as hex string', function () {
			var expected_a = '09000e128022',
				expected_b = '86000e128002',
				expected_c = 'ff130e128022';

			a.toHexString().should.equal(expected_a);
			b.toHexString().should.equal(expected_b);
			c.toHexString().should.equal(expected_c);
		});

	});

	describe('should correctly convert strings to buffers', function () {
		// 000010010000000000001110000100101000000000100010
		var a = new Id(new Buffer([9,0,14,18,128,34]), 48),
			hex = a.toHexString(),
			bit = a.toBitString();

		it('from hex string', function () {
			a.equals(new Id(Id.byteBufferByHexString(hex, 6), 48)).should.be.true;
		});

		it('from bit string', function () {
			a.equals(new Id(Id.byteBufferByBitString(a.toBitString(), 6), 48)).should.be.true;
		});
	});

});