/**
 * @interface
 * @class core.plugin.PluginLoaderInterface
 */
interface PluginLoaderInterface {

	getDependencies ():Array<string>;
	getDescription ():string;
	getFileTypes ():Array<string>;
	getIdentifier ():string;
	getMain ():string;
	getModules ():Array<string>;
	getName ():string;
	getType ():string;
	getVersion ():string;

	isPrivate ():boolean;

}

export = PluginLoaderInterface;