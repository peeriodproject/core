import TemporaryMessageMemory = require('./TemporaryMessageMemory');

/**
 * @interface
 * @class core.protocol.messages.TemporaryMessageMemoryList
 */
interface TemporaryMessageMemoryList {
	[id:string]:TemporaryMessageMemory;
}

export = TemporaryMessageMemoryList;