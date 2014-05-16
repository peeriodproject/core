/**
 * The PathValidatorInterface validates the specified path.
 *
 * @interface
 * @class core.fs.PathValidatorInterface
 */
interface PathValidatorInterface {

	/**
	 * Returns the hash (sha1) for the specified path.
	 *
	 * @method core.fs.PathValidatorInterface
	 *
 	 * @param {string} filePath
	 * @param {Function} callback
	 */
	getHash (filePath:string, callback:(err:Error, fileHash:string) => any):void;

	/**
	 * Generates a hash for the specified path and validates it against the specified path.
	 *
	 * @method core.fs.PathValidatorInterface
	 *
	 * @param {string} filePath
	 * @param {string} hashToValidate
	 * @param {Function} callback
	 */
	validateHash(filePath:string, hashToValidate:string, callback:(err:Error, isValid:boolean, fileHash:string) => any):void;

}

export = PathValidatorInterface;