/**
 * @interface
 * @class ui.share.UiUploadInterface
 */
interface UiUploadInterface {
	created:number;
	id:string;
	//loaded:number;
	path:string;
	name:string;
	size:number;
	status:string;
}

export = UiUploadInterface;