/**
 * A simple Logger interface.
 *
 * @interface
 * @class core.utils.logger.LoggerInterface
 */
interface LoggerInterface {

	/**
	 * @param {string} message
	 * @param {string} metadata
	 */
	debug (message:string, metadata?:any): void;

	/**
	 * @param {string} message
	 * @param {string} metadata
	 */
	error (message:string, metadata?:any): void;

	/**
	 * @param {string} message
	 * @param {string} metadata
	 */
	info (message:string, metadata?:any): void;

	/**
	 * @param {string} level
	 * @param {string} message
	 * @param {string} metadata
	 */
	log (level:string, message:string, metadata?:any):void;

	/**
	 * @param {string} message
	 * @param {string} metadata
	 */
	warn (message:string, metadata?:any): void;

	//add(transport: Transport, options: any): void;
	//remove(transport: Transport): void;
	//profile(name: string): void;
	//query(options: any, done: (err: any, results: any) => void): void;
	//stream(options: any): any;
	//handleExceptions(transport: Transport): void;

}

export = LoggerInterface;