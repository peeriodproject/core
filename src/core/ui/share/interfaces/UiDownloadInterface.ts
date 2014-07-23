/**
 * @interface
 * @class ui.share.UiDownloadInterface
 */
interface UiDownloadInterface {
	created:number;
	hash:string;
	id:string;
	loaded:number;
	name:string;
	size:number;
	status:string;
}

export = UiDownloadInterface;