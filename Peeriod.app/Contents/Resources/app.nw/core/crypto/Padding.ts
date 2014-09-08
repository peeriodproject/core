/// <reference path='../../../ts-definitions/node/node.d.ts' />

class Padding {

	public static pad (buffer:Buffer, toLength:number):Buffer {
		var bufferLength:number = buffer.length;

		if (bufferLength === toLength) {
			return buffer;
		}
		else {
			var retBuf:Buffer = new Buffer(toLength);
			retBuf.fill(0x00);
			buffer.copy(retBuf, toLength - bufferLength, 0);
			return retBuf;
		}
	}

}

export = Padding;