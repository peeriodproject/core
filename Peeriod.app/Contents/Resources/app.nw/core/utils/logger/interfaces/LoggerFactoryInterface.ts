import LoggerInterface = require('./LoggerInterface');

/**
 * @interface
 * @class core.utils.logger.LoggerFactoryInterface
 */
interface LoggerFactoryInterface {
	createLogger (name:string):LoggerInterface;
	registerLogger (name:string, klass:any):void;
}

export = LoggerFactoryInterface;