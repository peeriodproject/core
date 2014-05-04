/// <reference path='../../../../../ts-definitions/node/node.d.ts' />

import ReadableMessageInterface = require('./ReadableMessageInterface');

interface ReadableMessageFactoryInterface {
	create(buffer:NodeBuffer):ReadableMessageInterface;
}

export = ReadableMessageFactoryInterface;