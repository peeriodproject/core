import LoggerInterface = require('./LoggerInterface');

interface LoggerFactoryInterface {
	createLogger (name:string):LoggerInterface;
	registerLogger (name:string, klass:any):void;
}

export = LoggerFactoryInterface;