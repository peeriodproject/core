import UiFolderInterface = require('./UiFolderInterface');

/**
 * @interface
 * @class core.ui.folder.UiFolderMapInterface
 */
interface UiFolderMapInterface {
	[path:string]:UiFolderInterface;
}

export = UiFolderMapInterface;