/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The DownloadManager simply listens on new download requests from the DownlaodBridge (serving as an interface between network
 * and frontend / database), checks if a new downlaod can be started and if yes, starts the download, assigning it to an identifier
 * received from the bridge. It then listens further on the download's events and propagates them / generalizes the kill reasons.
 *
 * @interface
 * @class core.protocol.fileTransfer.share.DownloadManagerInterface
 */
interface DownloadManagerInterface {

}

export = DownloadManagerInterface;