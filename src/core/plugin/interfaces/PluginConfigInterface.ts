/**
 * @interface
 * @class core.plugin.PluginConfigInterface
 */
interface PluginConfigInterface {
	dependencies?:Array<string>;
	description:string;
	filetypes?:Array<string>;
	filemimetypes?:Array<string>;
	fileextensions?:Array<string>;
	identifier:string;
	main:string;
	modules?:Array<string>;
	name:string;
	private?:boolean;
	type:string;
	version:string;
}

export = PluginConfigInterface;