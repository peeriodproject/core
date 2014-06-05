import StateHandlerInterface = require('./StateHandlerInterface');

/**
 * @interface
 * @class core.utils.StateHandlerFactoryInterface
 */
interface StateHandlerFactoryInterface {

	create(path:string):StateHandlerInterface;

}

export = StateHandlerFactoryInterface;