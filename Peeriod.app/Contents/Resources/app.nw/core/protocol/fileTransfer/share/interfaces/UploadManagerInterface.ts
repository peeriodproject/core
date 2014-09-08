/// <reference path='../../../../../../ts-definitions/node/node.d.ts' />

/**
 * The UploadManager forms the counterpart to the DownloadManager and creates new uploads when a SHARE_REQUEST message
 * rolls in and it can. Criteria for being able are:
 * for creating a new upload are:
 *
 * - the number of currently active uploads does not exceed a maximum amount
 * - there is no active upload with the exact same transfer identifier from the SHARE_REQUEST message
 * - the SHARE_REQUEST is properly formatted
 * - the uploader owns a file with the provided SHA-1 hash of the request
 *
 * The upload is then kicked off and registered in the UploadBridge which acts as an interface between the database/frontend
 * and the network. The manager listens to the upload's events and propagates them to the bridge.
 */
interface UploadManagerInterface {

}

export = UploadManagerInterface;
