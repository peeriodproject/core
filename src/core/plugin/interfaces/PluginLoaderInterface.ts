/**
 * @interface
 * @class core.plugin.PluginLoaderInterface
 */
interface PluginLoaderInterface {

	getDependencies ():Array<string>;
	getDescription ():string;
	getFileExtensions ():Array<string>;
	getFileMimeTypes ():Array<string>;
	getIdentifier ():string;
	getMain ():string;
	getModules ():Array<string>;
	getName ():string;
	getType ():string;
	getVersion ():string;

	isPrivate ():boolean;

}

export = PluginLoaderInterface;