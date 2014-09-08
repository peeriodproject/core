import ConfigInterface = require('../config/interfaces/ConfigInterface');
import FileBlockReaderFactoryInterface = require('../fs/interfaces/FileBlockReaderFactoryInterface');
import PluginRunnerFactoryInterface = require('./interfaces/PluginRunnerFactoryInterface');
import PluginRunnerInterface = require('./interfaces/PluginRunnerInterface');

import FileBlockReaderFactory = require('../fs/FileBlockReaderFactory');
import PluginRunner = require('./PluginRunner');

/**
 * @class core.plugin.PluginRunnerFactory
 * @implements core.plugin.PluginRunnerFactoryInterface
 */
class PluginRunnerFactory implements PluginRunnerFactoryInterface {

	private _fileBlockReaderFactory:FileBlockReaderFactoryInterface= null;

	constructor () {
		this._fileBlockReaderFactory = new FileBlockReaderFactory();
	}

	create (config:ConfigInterface, identifier:string, path:string):PluginRunnerInterface {
		return new PluginRunner(config, identifier, path, this._fileBlockReaderFactory);
	}

}

export = PluginRunnerFactory;