import BufferListInterface = require('./BufferListInterface');

/**
 * @interface
 * @class core.utils.BufferListMapInterface
 */
interface BufferListMapInterface {

	[identifier:string]:BufferListInterface;

}

export = BufferListMapInterface;