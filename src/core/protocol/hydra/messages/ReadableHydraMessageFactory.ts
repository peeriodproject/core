import ReadableHydraMessageFactoryInterface = require('./interfaces/ReadableHydraMessageFactoryInterface');
import ReadableHydraMessageInterface = require('./interfaces/ReadableHydraMessageInterface');
import ReadableHydraMessage = require('./ReadableHydraMessage');

/**
 *
 * @class core.protocol.hydra.ReadableHydraMessageFactory
 * @implements core.protocol.hydra.ReadableHydraMessageFactoryInterface
 *
 */
class ReadableHydraMessageFactory implements ReadableHydraMessageFactoryInterface {

	public create (buffer:Buffer, noCircuitIdExtraction:boolean = false):ReadableHydraMessageInterface {
		return new ReadableHydraMessage(buffer, noCircuitIdExtraction);
	}
}

export = ReadableHydraMessageFactory;