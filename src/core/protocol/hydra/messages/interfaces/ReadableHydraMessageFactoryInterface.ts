/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

import ReadableHydraMessageInterface = require('./ReadableHydraMessageInterface');

interface ReadableHydraMessageFactoryInterface {

	create (buffer:Buffer):ReadableHydraMessageInterface;
}

export = ReadableHydraMessageFactoryInterface;