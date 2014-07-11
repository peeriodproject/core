import events = require('events');

import QueryManagerInterface = require('./interfaces/QueryManagerInterface');
import SearchMessageBridgeInterface = require('../../../search/interfaces/SearchMessageBridgeInterface');
import QueryFactoryInterface = require('./interfaces/QueryFactoryInterface');
import QueryInterface = require('./interfaces/QueryInterface');
import ConfigInterface = require('../../../config/interfaces/ConfigInterface');
import CircuitManagerInterface = require('../../hydra/interfaces/CircuitManagerInterface');
import QueryMap = require('./interfaces/QueryMap');

var logger = require('../../../utils/logger/LoggerFactory').create();

/**
 * QueryManagerInterface implementation.
 *
 * @class core.protocol.fileTransfer.QueryManager
 * @extends events.EventEmitter
 * @implemens core.protocol.fileTransfer.QueryManagerInterface
 *
 * @param {core.config.ConfigInterface} transferConfig Configuration object.
 * @param {core.protocol.fileTransfer.QueryFactoryInterface} queryFactory A factory for creating query instances (hash-based or broadcast-based)
 * @param {core.protocol.hydra.CircuitManagerInterface} circuitManager A working circuit manager instance for keeping track of the circuit amount.
 * @param {core.search.SearchMessageBridgeInterface} searchBridge The bridge between the search manager and the network.
 */
class QueryManager extends events.EventEmitter implements QueryManagerInterface {

	/**
	 * Stores the circuit manager instance.
	 *
	 * @member {core.protocol.hydra.CircuitManagerInterface} core.protocol.fileTransfer.QueryManager~_circuitManager
	 */
	private _circuitManager:CircuitManagerInterface = null;

	/**
	 * Keeps track of the current amount of production-ready circuits used to provide anonymity.
	 *
	 * @member {number} core.protocol.fileTransfer.QueryManager~_currentNumOfReadyCircuits
	 */
	private _currentNumOfReadyCircuits:number = 0;

	/**
	 * Maps the current queries to the query identifiers received from the bridge.
	 *
	 * @member {core.protocol.fileTransfer.QueryMap} core.protocol.fileTransfer.QueryManager~_currentQueries
	 */
	private _currentQueries:QueryMap = {};

	/**
	 * The maximum number of parallel queries, populated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.QueryManager~_maxNumOfParallelQueries
	 */
	private _maxNumOfParallelQueries:number = 0;

	/**
	 * The minimum number of established circuits before a query can be issued, populated by config.
	 *
	 * @member {number} core.protocol.fileTransfer.QueryManager~_minNumOfReadyCircuits
	 */
	private _minNumOfReadyCircuits:number = 0;

	/**
	 * Stores the query factory.
	 *
	 * @member {core.protocol.fileTransfer.QueryFactoryInterface} core.protocol.fileTransfer.QueryManager~_queryFactory
	 */
	private _queryFactory:QueryFactoryInterface = null;

	/**
	 * Stores the bridge between the search manager and the network.
	 *
	 * @member {core.search.SearchMessageBridgeInterface} core.protocol.fileTransfer.QueryManager~_searchBridge
	 */
	private _searchBridge:SearchMessageBridgeInterface = null;

	public constructor (transferConfig:ConfigInterface, queryFactory:QueryFactoryInterface, circuitManager:CircuitManagerInterface, searchBridge:SearchMessageBridgeInterface) {
		super();

		this._queryFactory = queryFactory;
		this._circuitManager = circuitManager;
		this._searchBridge = searchBridge;
		this._maxNumOfParallelQueries = transferConfig.get('fileTransfer.query.maximumNumberOfParallelQueries');
		this._minNumOfReadyCircuits = transferConfig.get('fileTransfer.query.minimumNumberOfReadyCircuits');
		this._currentNumOfReadyCircuits = this._circuitManager.getReadyCircuits().length;

		this._setupListeners();
	}

	/**
	 * BEGIN TESTING PURPOSES
	 */

	public getQueries ():QueryMap {
		return this._currentQueries;
	}

	/**
	 * END TESTING PURPOSES
	 */

	/**
	 * Checks if a query is possible or not, and if not, returns the reason as string.
	 *
	 * MAX_EXCEED: The maximum number of parallel queries is exhausted.
	 * NO_ANON: There aren't enough established production-ready circuits to provide anonymity.
	 *
	 * If a query is possible, `null` is returned. This function gets called each time before a new query is issued.
	 *
	 * @method core.protocol.fileTransfer.QueryManager~_cannotQuery
	 *
	 * @returns {string} The reason for not being able to query, or `null` if querying is possible.
	 */
	private _cannotQuery ():string {
		var ret:string = null;

		if (Object.keys(this._currentQueries).length >= this._maxNumOfParallelQueries) {
			return 'MAX_EXCEED';
		}
		else if (this._currentNumOfReadyCircuits < this._minNumOfReadyCircuits) {
			return 'NO_ANON';
		}

		return ret;
	}

	/**
	 * Initializes a new query instance by adding it to the list of current queries and hooking the appropriate
	 * listeners to it.
	 * At last kicks off the query.
	 *
	 * @method core.protocol.fileTransfer.QueryManager~_initializeQuery
	 *
	 * @param {string} queryIdentifier The query identifier received from the bridge.
	 * @param {core.protocol.fileTransfer.QueryInterface} query The query instance to intialize.
	 */
	private _initializeQuery (queryIdentifier:string, query:QueryInterface):void {
		this._currentQueries[queryIdentifier] = query;

		query.once('end', (reason:string) => {
			if (this._currentQueries[queryIdentifier]) {
				delete this._currentQueries[queryIdentifier];

				query.removeAllListeners('result');
				this._searchBridge.emit('end', queryIdentifier, reason);
			}
		});

		query.on('result', (metadata:any, resultBuffer:Buffer) => {
			logger.log('query', 'Piping QUERY_RESULT back to bridge. Almost done', {broadcastId: query.getQueryId(), queryId: queryIdentifier, metadata: JSON.stringify(metadata)});
			this._searchBridge.emit('result', queryIdentifier, resultBuffer, metadata);
		});

		query.kickOff();
	}

	/**
	 * Sets up the listeners on the circuit manager (getting the amount of circuits) and the bridge (new queries / manually
	 * aborted queries).
	 *
	 * @method core.protocol.fileTransfer.QueryManager~_setupListeners
	 */
	private _setupListeners ():void {
		this._circuitManager.on('circuitCount', (count:number) => {
			this._currentNumOfReadyCircuits = count;
		});

		this._searchBridge.on('newBroadcastQuery', (queryIdentifier:string, searchObject:Buffer) => {
			var reason = this._cannotQuery();

			if (!reason) {
				var query:QueryInterface = this._queryFactory.constructBroadcastBasedQuery(searchObject);

				logger.log('query', 'New broadcast query', {queryId: queryIdentifier, broadcastId: query.getQueryId()});

				this._initializeQuery(queryIdentifier, query);
			}
			else {
				setImmediate(() => {
					this._searchBridge.emit('end', queryIdentifier, reason);
				});
			}
		});

		this._searchBridge.on('abort', (queryIdentifier:string) => {
			var query:QueryInterface = this._currentQueries[queryIdentifier];

			if (query) {
				query.abort('MANUAL');
			}
		});
	}


}

export = QueryManager;