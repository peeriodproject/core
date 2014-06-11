import UiFolderInterface = require('./UiFolderInterface');

/**
 * @interface
 * @class core.ui.folder.UiFolderMaoInterface
 */
interface UiFolderMapInterface {
	[path:string]:UiFolderInterface;
}

export = UiFolderMapInterface;