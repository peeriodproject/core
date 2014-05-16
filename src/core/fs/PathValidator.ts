/// <reference path='../../main.d.ts' />

import crypto = require('crypto');
import fs = require('fs');

import PathValidatorInterface = require('./interfaces/PathValidatorInterface');

/**
 * @class core.fs.PathValidator
 * @implements core.fs.PathValidatorInterface
 */
class PathValidator implements PathValidatorInterface {

	getHash (filePath:string, callback:(err:Error, fileHash:string) => any):void {
		fs.stat(filePath, function (err:Error, stats:fs.Stats) {
			if (err) {
				return callback(err, null);
			}
			else if (!stats.isFile() && !stats.isDirectory()) {
				return callback(new Error('PathValidator.getHash: The specified path is not a valid file or directory. "' + filePath + '"'), null);
			}

			// todo fix node.d.ts (duplex stream)
			var hash:any = crypto.createHash('sha1');
			var fileStream = fs.createReadStream(filePath);

			hash.setEncoding('hex');

			fileStream.pipe(hash, {
				end: false
			});

			fileStream.on('end', function () {
				hash.end();

				callback(null, hash.read());
			});
		});
	}

	validateHash (filePath:string, hashToValidate:string, callback:(err:Error, isValid:boolean, fileHash:string) => any):void {
		this.getHash(filePath, function (err:Error, fileHash:string) {
			if (err) {
				return callback(err, false, fileHash);
			}
			else {
				return callback(null, (hashToValidate === fileHash), fileHash);
			}
		});
	}

	validateStats (filePath:string, statsToValidate:fs.Stats, callback:(err:Error, isValid, fileStats:fs.Stats) => any):void {
		fs.stat(filePath, (err:Error, stats:fs.Stats) => {
			if (err) {
				return callback(err, false, null);
			}
			else if (!stats.isFile() && !stats.isDirectory()) {
				return callback(new Error('PathValidator.validateStats: The specified path is not a valid file or directory. "' + filePath + '"'), false, null);
			}

			// remove current date from stats
			if (statsToValidate['atime']) {
				delete statsToValidate['atime'];
			}

			delete stats['atime'];

			// @see http://stackoverflow.com/a/1144249
			var isValid:boolean = JSON.stringify(stats) === JSON.stringify(statsToValidate);

			callback(null, isValid, stats);

		});
	}


}

export = PathValidator;