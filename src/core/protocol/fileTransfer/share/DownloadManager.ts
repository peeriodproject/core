import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import DownloadManagerInterface = require('./interfaces/DownloadManagerInterface');
import DownloadFactoryInterface = require('./interfaces/DownloadFactoryInterface');
import DownloadInterface = require('./interfaces/DownloadInterface');
import DownloadMap = require('./interfaces/DownloadMap');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import DownloadBridgeInterface = require('../../../share/interfaces/DownloadBridgeInterface');


class DownloadManager implements DownloadManagerInterface {

	private _downloadFactory:DownloadFactoryInterface = null;
	private _maximumNumberOfParallelDownloads:number = 0;
	private _activeDownloads:DownloadMap = {};
	private _bridge:DownloadBridgeInterface = null;
	private _circuitManager:CircuitManagerInterface = null;

	public constructor (transferConfig:ConfigInterface, circuitManager:CircuitManagerInterface, downloadBridge:DownloadBridgeInterface, downloadFactory:DownloadFactoryInterface) {
		this._downloadFactory = downloadFactory;
		this._bridge = downloadBridge;
		this._maximumNumberOfParallelDownloads = transferConfig.get('fileTransfer.maximumNumberOfParallelDownloads');
		this._circuitManager = circuitManager;

		this._setupListeners();
	}

	private _setupListeners ():void {
		
	}
}

export = DownloadManager;