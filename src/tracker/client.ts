import { TaskQueue }                from "../common/task_queue"
import * as net                     from "net"
import { FastDfsConnection }        from "../io/connection"
import { FrameDecoder }             from "../io/handlers/frame_decoder"
import { Header }                   from "../protocol/header"
import { StorageServer }            from "../protocol/storage_server"
import { TrackerCmd }               from "../protocol/tracker_cmd"
import { ProtocolConstants }        from "../protocol/constants"
import { buffToNumber, packHeader } from "../protocol/util"
import { StorageServerStat }        from "../protocol/storage_server_stat"
import * as parser                  from "../protocol/parser"
import { StorageGroupStat }         from "../protocol/storage_group_stat"
/**
 * @description tracker client
 * @author      kesanzz
 */
export class TrackerClient extends TaskQueue {

    private conn: FastDfsConnection

    constructor(arg: FastDfsConnection | net.TcpNetConnectOpts) {
        super()
        let conn = arg instanceof FastDfsConnection ? arg : new FastDfsConnection(arg)
        this._init(conn)
    }

    public fetchStoreServer(): Promise<StorageServer> {
        return new Promise<StorageServer>((resolve, reject) => {
            this._submit({
                request:  () => this._queryStorageServer(TrackerCmd.QUERY_STORE_WITHOUT_GROUP_ONE, null, null),
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    if (header.length != ProtocolConstants.TRACKER_QUERY_STORAGE_STORE_BODY_LEN) {
                        reject(new Error(`illegal packet`))
                        return
                    }
                    let ipAddrStart = ProtocolConstants.GROUP_NAME_MAX_BYTES
                    let ipAddrEnd   = ProtocolConstants.GROUP_NAME_MAX_BYTES + ProtocolConstants.IP_ADDR_BYTES
                    let host        = payload.toString('utf-8', ipAddrStart, ipAddrEnd).replace('\u0000', '')
                    let port        = buffToNumber(payload, ipAddrEnd)
                    let storePath   = payload.readUInt8(ProtocolConstants.TRACKER_QUERY_STORAGE_STORE_BODY_LEN - 1)
                    let storageServer: StorageServer = {host, port, storePath}
                    resolve(storageServer)
                }
            })
        })
    }
    
        
    public fetchResourcesServer(groupName: string, filePath: string): Promise<StorageServer> {
        return new Promise<StorageServer>((resolve, reject) => {
            this._submit({
                request:  () => this._queryStorageServer(TrackerCmd.QUERY_FETCH_ONE, groupName, filePath),
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    let offset = ProtocolConstants.GROUP_NAME_MAX_BYTES
                    let host = payload.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                    offset = ProtocolConstants.IP_ADDR_BYTES + offset
                    let port = buffToNumber(payload, offset)
                    let storageServer: StorageServer = {host, port}
                    resolve(storageServer)
                }
            })
        })
    }

    public fetchResourcesServers(groupName: string, filePath: string): Promise<StorageServer[]> {
        return new Promise<StorageServer[]>((resolve, reject) => {
            this._submit({
                request:  () => this._queryStorageServer(TrackerCmd.QUERY_FETCH_ALL, groupName, filePath),
                response: (err, header, pyaload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    let offset = ProtocolConstants.GROUP_NAME_MAX_BYTES
                    let host = pyaload.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                    offset = ProtocolConstants.IP_ADDR_BYTES + offset
                    let port = buffToNumber(pyaload, offset)
                    offset = ProtocolConstants.PORT_BYTES + offset
                    let servers: StorageServer[] = []
                    servers.push({host, port})
                    // 余下的数据均为ip地址
                    while (offset < header.length) {
                        //@todo 提取公共方法
                        let ip = pyaload.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                        offset = offset + ProtocolConstants.IP_ADDR_BYTES,
                        servers.push({host, port})
                    }
                    resolve(servers)
                }
            })
        })
    }

    public listStorageStat(groupName: string, storageIpAddr: string): Promise<StorageServerStat[]> {
        return new Promise<StorageServerStat[]>((resolve, reject) => {
            this._submit({
                request: () => {
                    let len = 0
                    let groupNameBytes = Buffer.alloc(ProtocolConstants.GROUP_NAME_MAX_BYTES, 0)
                    groupNameBytes.write(groupName, 'utf-8')
                    len += ProtocolConstants.GROUP_NAME_MAX_BYTES
                    let ipBytes: Buffer = null
                    if (storageIpAddr != null) {
                        ipBytes = Buffer.from(storageIpAddr)
                        len += ipBytes.length
                    }
                    let header = packHeader(len, 0, TrackerCmd.LIST_STORAGE)
                    let pkg = Buffer.concat([header, groupNameBytes])
                    this.conn._out().write(pkg)
                    if (ipBytes != null) {
                        this.conn._out().write(ipBytes)
                    }
                },  
                response: (err, header, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code is${header.status}`))
                        return
                    }
                    let pos = 0
                    let stats: StorageServerStat[] = []
                    while (pos < data.length) {
                        let [stat, newPos] = parser.parseStorageServerStat(data, pos, 'utf-8')
                        stats.push(stat)
                        pos = newPos
                    }
                    resolve(stats)
                }
            })
        })
    }

    public listGroupsStat(): Promise<StorageGroupStat[]> {
        return new Promise<StorageGroupStat[]>((resolve, reject) => {
            this._submit({
                request: () => {
                    let header = packHeader(0, 0, TrackerCmd.LIST_GROUP)
                    this.conn._out().write(header)
                },
                response: (err, header, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code is${header.status}`))
                        return
                    }
                    let pos = 0
                    let stats: StorageGroupStat[] = []
                    while (pos < data.length) {
                        let [stat, newPos] = parser.parseStorageGroupStat(data, pos, 'utf-8')
                        stats.push(stat)
                        pos = newPos
                    }
                    resolve(stats)
                }
            })
        })
    }



    private _queryStorageServer(cmd: TrackerCmd, groupName: string,  filePath: string) {
        let packetLength = 0
        let groupNameBytes:Buffer = null
        if (groupName != null) {
            groupNameBytes = Buffer.alloc(ProtocolConstants.GROUP_NAME_MAX_BYTES, 0)
            groupNameBytes.write(groupName, 'utf-8')
            packetLength = packetLength + ProtocolConstants.GROUP_NAME_MAX_BYTES
        }
        
        let pathBytes:Buffer = null
        if (filePath != null && filePath.length > 0) {
             pathBytes = Buffer.from(filePath)
             packetLength += pathBytes.length
        }
        let header = packHeader(packetLength, 0, cmd)
        this.conn._out().write(header)
        if (groupNameBytes != null) this.conn._out().write(groupNameBytes)
        if (pathBytes != null)      this.conn._out().write(pathBytes)
    }

    public close() {
        // the last task is to close the connection
        let conn = this.conn
        this._submit({
            request: () => conn.close()
        })
        this._closeTaskQueue()
    }

    public abort() {
        this.conn.close()
        this._reject(new Error('client already closed'))
    }
    
    private _init(conn: FastDfsConnection) {
        this.conn = conn
        this.conn.connect(() => this._connected())
        this.conn.on('close', (args) => this._closed(args)) 
        this.conn.on('error', (err)  => this._fatalError(err))
    }

    protected _closed(err: Error) {
        this._reject(err)
    }

    protected _fatalError(err: Error) {
        this._reject(err)
    }

    protected _connected() {
        let ctx = this.conn.context()
        // add handler
        let frameDecoder = new FrameDecoder((err: Error, header: Header, data: Buffer) => {
            this._response(err, header, data)
        })
        ctx.addHandler(frameDecoder)
        // trigger to invoke next task
        this._activeTaskQueue()
    }


}