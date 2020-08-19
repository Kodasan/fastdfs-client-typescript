import { FastDfsConnection } from "./io";
import { StorageServer, StorageServerStat } from "./storage";
import { TrackerCmd, ProtocolConstants, packHeader, recvHeader, Header, buffToNumber, FastDfsError, Task } from "./protocol";
import { AbstractCommandQuque } from "./core";

export class TrackerClient extends AbstractCommandQuque {

    private connection: FastDfsConnection

    constructor(connection: FastDfsConnection) {
        super()
        this.connection = connection
        this.connection.on('response', (header:Header, data:Buffer) => this.handleResponse(header, data))
        this.connection.on('error',    (err:Error) => this.onError(err))
        this.connection.on('connect',  () => this.connected())
    }

    public fetchStoreServer(): Promise<StorageServer> {
        let resolveHook = null
        let rejectHook = null
        let promise = new Promise<StorageServer>((resolve, reject) => {
            resolveHook = resolve
            rejectHook = reject
        })
        this.submit({
            request: () => this.queryStorageServer(TrackerCmd.QUERY_STORE_WITHOUT_GROUP_ONE, null, null),
            response: (err, header, data) => {
                if (err) {
                    rejectHook(err)
                    return
                }
                if (header.status != 0) {
                    rejectHook(new Error(`Error code ${header.status}`))
                    return
                }
                if (header.length != ProtocolConstants.TRACKER_QUERY_STORAGE_STORE_BODY_LEN) {
                    rejectHook(new Error(`illegal packet`))
                    return
                }
                let ipAddrStart = ProtocolConstants.GROUP_NAME_MAX_BYTES
                let ipAddrEnd = ProtocolConstants.GROUP_NAME_MAX_BYTES + ProtocolConstants.IP_ADDR_BYTES
                let ip = data.toString('utf-8', ipAddrStart, ipAddrEnd).replace('\u0000', '')
                let port = buffToNumber(data, ipAddrEnd)
                let storePath = data.readUInt8(ProtocolConstants.TRACKER_QUERY_STORAGE_STORE_BODY_LEN - 1)
                let storageServer: StorageServer = {ip, port, storePath}
                resolveHook(storageServer)
            }
        })
        return promise;
    }

    
    public fetchResourcesServer(groupName: string, filePath: string): Promise<StorageServer> {
        let resolveHook = null
        let rejectHook = null
        let promise = new Promise<StorageServer>((resolve, reject) => {
            resolveHook = resolve
            rejectHook = reject
        })
        this.submit({
            request: () => this.queryStorageServer(TrackerCmd.QUERY_FETCH_ONE, groupName, filePath),
            response: (err, header, data) => {
                if (err) {
                    rejectHook(err)
                    return
                }
                if (header.status != 0) {
                    rejectHook(new FastDfsError(header.status, `Error code ${header.status}`))
                    return
                }
                let offset = ProtocolConstants.GROUP_NAME_MAX_BYTES
                let ip = data.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                offset = ProtocolConstants.IP_ADDR_BYTES + offset
                let port = buffToNumber(data, offset)
                let storageServer: StorageServer = {ip, port}
                resolveHook(storageServer)
            }
        })
        return promise
    }


    public fetchResourcesServers(groupName: string, filePath: string): Promise<StorageServer[]> {
        let resolveHook = null
        let rejectHook = null
        let promise = new Promise<StorageServer[]>((resolve, reject) => {
            resolveHook = resolve
            rejectHook = reject
        })
        this.submit({
            request: () =>  this.queryStorageServer(TrackerCmd.QUERY_FETCH_ALL, groupName, filePath),
            response: (err, header, data) => {
                if (err) {
                    rejectHook(err)
                    return
                }
                if (header.status != 0) {
                    rejectHook(new FastDfsError(header.status, `Error code ${header.status}`))
                    return
                }
                //@todo 包校验
                let offset = ProtocolConstants.GROUP_NAME_MAX_BYTES
                let ip = data.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                offset = ProtocolConstants.IP_ADDR_BYTES + offset
                let port = buffToNumber(data, offset)
                offset = ProtocolConstants.PORT_BYTES + offset
                let servers: StorageServer[] = []
                servers.push({ip, port})
                // 余下的数据均为ip地址
                while (offset < header.length) {
                    //@todo 提取公共方法
                    let ip = data.toString('utf-8', offset, offset + ProtocolConstants.IP_ADDR_BYTES).replace('\u0000', '')
                    offset = offset + ProtocolConstants.IP_ADDR_BYTES,
                    servers.push({ip, port})
                }
                resolveHook(servers)
            }
        })
        return promise
    }



    public listStorageServerStat(groupName: string, ipAddr: string[], cb: (err:Error, stat: StorageServerStat[]) => void) {
    
    }


    private queryStorageServer(cmd: TrackerCmd, groupName: string,  filePath: string) {
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
        this.connection.write(header)
        if (groupNameBytes != null) this.connection.write(groupNameBytes)
        if (pathBytes != null)      this.connection.write(pathBytes)
    }

    private connected() {
        this.nextTask()
    }

    private onError(err: Error) {
        //@todo 错误检查
        console.log(err)
    }
}

