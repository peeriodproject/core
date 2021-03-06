import StateHandlerFactoryInterface = require('./interfaces/StateHandlerFactoryInterface');
import StateHandlerInterface = require('./interfaces/StateHandlerInterface');

import JSONStateHandler = require('./JSONStateHandler');

/**
 * @class core.utils.JSONStateHandlerFactory
 * @implements core.utils.StateHandlerFactoryInterface
 */
class JSONStateHandlerFactory implements StateHandlerFactoryInterface {

	create (path:string, fallbackPath:string = ''):StateHandlerInterface {
		return new JSONStateHandler(path, fallbackPath);
	}

}

export = JSONStateHandlerFactory;