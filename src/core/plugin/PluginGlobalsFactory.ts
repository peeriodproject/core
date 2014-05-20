import PluginGlobalsFactoryInterface = require('./interfaces/PluginGlobalsFactoryInterface');

class PluginGlobalsFactory implements PluginGlobalsFactoryInterface {

	constructor() {
	}

	public create ():Object {
		return {
			foo: 'barvaria'
		};
	}

}

export = PluginGlobalsFactory;