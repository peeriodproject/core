import ReadableHydraMessageFactoryInterface = require('./interfaces/ReadableHydraMessageFactoryInterface');
import ReadableHydraMessageInterface = require('./interfaces/ReadableHydraMessageInterface');
import ReadableHydraMessage = require('./ReadableHydraMessage');

class ReadableHydraMessageFactory implements ReadableHydraMessageFactoryInterface {

	public create (buffer:Buffer):ReadableHydraMessageInterface {
		return new ReadableHydraMessage(buffer);
	}
}

export = ReadableHydraMessageFactory;