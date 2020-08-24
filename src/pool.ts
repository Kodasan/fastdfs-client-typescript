import { EventEmitter } from 'events'
import { FastDfsConnection } from './io';
import { TrackerClient } from './tracker';
import { StorageClient, StorageServer } from './storage';
import { ServerAddress } from './protocol';

export interface PoolConfig {
    trakcers: Array<ServerAddress>,
    storages?: Array<StorageServer>
}

export class Pool extends EventEmitter {
    
    private _config: PoolConfig

    private _freeTrackerConn:    Array<FastDfsConnection>
    private _allTrackerConn:     Array<FastDfsConnection>
    private _inUseTrackerConn:   Array<FastDfsConnection>
    private _waitForTrackerConn: Array<(err:Error, conn:FastDfsConnection) => void>

    private _freeStorageConn:    Array<FastDfsConnection>
    private _allStorageConn:     Array<FastDfsConnection>
    private _inUseStorageConn:   Array<FastDfsConnection>
    private _waitForStorageConn: Array<(err:Error, conn:FastDfsConnection) => void>

    private _closed: boolean = false

    constructor(config: PoolConfig) {
        super()
        this._config = config

        this._freeTrackerConn    = []
        this._allTrackerConn     = []
        this._inUseTrackerConn   = []
        this._waitForTrackerConn = []

        this._freeStorageConn    = []
        this._allStorageConn     = []
        this._inUseStorageConn   = []
        this._waitForStorageConn = []

        this._tryFetchStorage()
    }

    private async _tryFetchStorage() {
        if (this._config.storages == null || this._config.storages.length == 0) {
            return
        }
        let client = await this.getTrackerClient()
        
    }

    public async getTrackerClient(): Promise<TrackerClient> {
        return new Promise<TrackerClient>((resolve, reject) => {
            //@todo 需要遍历
            let conn = new FastDfsConnection(this._config.trakcers[0])
            let client = new TrackerClient(conn)
            conn.on('connect',  () => { 
                this._inUseStorageConn.push(conn)
                resolve(client) 
            })
            conn.on('error', (err) => {
                reject(err)
            })
        })
    }

    public async getStorageClient(): Promise<StorageClient> {
        return null
    }

    public releaseTrackerClient() {}

    public releaseStorageClient() {}

}