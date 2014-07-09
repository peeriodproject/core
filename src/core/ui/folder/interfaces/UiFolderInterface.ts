/**
 * A UiFolderInterface represents a single folder in the user interface
 *
 * @interface
 * @class core.ui.folder.UiFolderInterface
 */
interface UiFolderInterface {

	/**
	 * The amount of indexed items in this folder
	 *
	 * @member {number} core.ui.folder.UiFolderInterface.items
	 */
	items:number;

	/**
	 * The folder name
	 *
	 * @member {string} core.ui.folder.UiFolderInterface.name
	 */
	name:string;

	/**
	 * The absolute path to the folder
	 *
	 * @member {string} core.ui.folder.UiFolderInterface.path
	 */
	path:string;

	/**
	 * The status of the folder. (active, inactive, idle)
	 *
	 * @member {string} core.ui.folder.UiFolderInterface.status
	 */
	status:string
}

export = UiFolderInterface;