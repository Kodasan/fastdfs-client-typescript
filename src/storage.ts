import { FastDfsConnection, DataInboundHanlder } from "./io"
import { StorageCmd, ProtocolConstants, packHeader, numberToBuff, Header, Task, replaceEndStr, recvHeader } from "./protocol"
import { Readable, Writable } from 'stream'
import * as fs from 'fs'

export interface StorageServer {
    ip: string,
    port: number,
    storePath?: number,
    groupName?: string
}

export interface NamveValuePair {
    name: string,
    value: string
}

export interface UploadCallback {
    send(out: Writable): void
}

class _UploadBuffer implements UploadCallback {
    
    private data:Buffer

    constructor(data:Buffer) {
        this.data = data
    }

    send(out: Writable): void {
      out.write(this.data) 
    }
}

class _UploadStream implements UploadCallback {
    
    private inStream:Readable

    constructor(inStream:Readable, autoClose: boolean = true) {
        this.inStream = inStream
        this.inStream.on('end', () => {
            if (autoClose) {
                this.inStream.destroy(null)
            }
        })
    }

    send(out: Writable): void {
        this.inStream.pipe(out, { end: false})
    }
}

export interface UploadOptions {
    cmd: StorageCmd,
    groupName?: string,
    masterFilename?: string,
    prefixName?: string,
    fileExtName: string,
    fileSize: number,
    callback: UploadCallback,
    metaData?: NamveValuePair[]
}

export interface DownloadOptions {
    groupName?: string,
    filename: string,
    fileOffset: number,
    byteAmount: number
}

export interface UploadResult {
    groupName: string,
    filename: string
}

export class FastDfsFileReadStream extends Readable {

    private header: Header

    public _read() {}

    public getHeader(): Header {
        return this.header
    }

    public setHeader(header: Header)  {
        this.header = header
    }
}

/**
 * 数据转发
 */
class _DataForwadingInboundHandler extends DataInboundHanlder {
    
    private header: Header
    private readable: FastDfsFileReadStream

    private hasReaded: number = 0

    constructor(readable: FastDfsFileReadStream) {
        super()
        this.readable = readable
    }

    public onData(data: Buffer): boolean {
        if (this.header == null) {
            this.header = recvHeader(data)
            this.readable.setHeader(this.header)
            if (this.header.length == 0 || this.header.status != 0) {
                this.readable.emit('error', new Error(`Error code:${this.header.status}`))
                return false
            }
            data = data.slice(ProtocolConstants.HEADER_BYTES)
        }
        this.hasReaded += data.length
        this.readable.push(data)
        if (this.hasReaded == this.header.length) {
            this.readable.push(null)
            this.removeSelf()
        }
        return false
    }
}


export class StorageClient {

    private conn: FastDfsConnection
    private storageServer: StorageServer

    private request: Array<Task>
    private response: Array<Task>

    constructor(conn: FastDfsConnection, server: StorageServer) {
        this.conn = conn
        this.storageServer = server
        this.conn.on('response', (header: Header, data: Buffer) => this.onResponse(header, data))
        this.request = []
        this.response = []
    }

    public uploadData(data:Buffer, extName?: string): Promise<UploadResult> {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_FILE,
            fileExtName: extName,
            callback: new _UploadBuffer(data),
            fileSize: data.length
        })
    }

    public uploadFile(path: string, extName?: string): Promise<UploadResult> {
        let fileStat = fs.statSync(path)
        if (!fileStat.isFile()) {
            throw new Error(`${path} not a file`)
        }
        let fileSize = fileStat.size
        let fileExtName = extName ? extName : path.substring(path.lastIndexOf('.') + 1)
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_FILE,
            fileExtName,
            fileSize,
            callback: new _UploadStream(fs.createReadStream(path))
        })
    }

    public uploadStream(inStream: Readable, dataSize: number, autoClose?: boolean,extName?: string): Promise<UploadResult> {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_FILE,
            fileSize: dataSize,
            fileExtName: extName,
            callback: new _UploadStream(inStream, autoClose)
        })
    }

    public doUpload(options:UploadOptions): Promise<UploadResult> {
        let resolveHook = null
        let rejectHook = null
        let promise = new Promise<UploadResult>((resolve, reject) => {
            resolveHook = resolve
            rejectHook = reject
        })
        this.submit({
            request: () => {
                let extNameBytes = Buffer.alloc(ProtocolConstants.EXT_NAME_BYTES, 0)
                if (options.fileExtName != null) {
                    extNameBytes.write(options.fileExtName, 'utf-8')
                }
                let bodyLength = 1 + ProtocolConstants.LENGTH_BYTES + ProtocolConstants.EXT_NAME_BYTES + options.fileSize
                let header = packHeader(bodyLength, 0, options.cmd)
                let sizeBytes = Buffer.alloc(1 + ProtocolConstants.LENGTH_BYTES)
                sizeBytes.writeUInt8(this.storageServer.storePath, 0)
                numberToBuff(options.fileSize, sizeBytes, 1)
                this.conn.write(header)
                this.conn.write(sizeBytes)
                this.conn.write(extNameBytes)
                options.callback.send(this.conn.out())
            },
            response: (err, header, data) => {
                if (err) {
                    rejectHook(err)
                    return
                }
                if (header.status != 0) {
                    rejectHook(new Error(`Error code:${header.status}`))
                    return
                }
                let groupName = replaceEndStr(data.toString('utf-8', 0, ProtocolConstants.GROUP_NAME_MAX_BYTES))
                let filename = data.toString('utf-8', ProtocolConstants.GROUP_NAME_MAX_BYTES)
                resolveHook({groupName, filename})
            }
        })
        return promise
    }

    public downloadToBuffer(options: DownloadOptions): Promise<Buffer>{
        return new Promise<Buffer>((resolve, reject) => {
            this.submit({
                request: () => {
                    this.sendDownloadCmd(options.groupName, options.filename, options.fileOffset, options.byteAmount)
                },
                response: (err, header, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Erro code:${header.status}`))
                        return
                    }
                    resolve(data)
                }
            })
        })
    }

    public downloadToStream(options: DownloadOptions): FastDfsFileReadStream {
        let stream = new FastDfsFileReadStream()
        this.submit({
            request: () => {
                this.conn.addInboundHandler(new _DataForwadingInboundHandler(stream))
                this.sendDownloadCmd(options.groupName, options.filename, options.fileOffset, options.byteAmount)
            }
        })
        return stream
    }

    private sendDownloadCmd(groupName:string, filename:string, offset:number, byteAmount: number) {
        let filenameBytes = Buffer.from(filename)
        let groupNameBytes = Buffer.alloc(ProtocolConstants.GROUP_NAME_MAX_BYTES, 0)
        groupNameBytes.write(groupName, 'utf-8')
        let offsetBytes = Buffer.alloc(8)
        numberToBuff(offset, offsetBytes, 0)
        let byteAmountBytes = Buffer.alloc(8)
        numberToBuff(byteAmount, byteAmountBytes, 0)
        let bodyLength = ProtocolConstants.GROUP_NAME_MAX_BYTES + filenameBytes.length + byteAmountBytes.length + offsetBytes.length
        let header = packHeader(bodyLength, 0, StorageCmd.DOWNLOAD_FILE)
        this.conn.write(header)
        this.conn.write(offsetBytes)
        this.conn.write(byteAmountBytes)
        this.conn.write(groupNameBytes)
        this.conn.write(filenameBytes)
    }

    private submit(task: Task) {
        if (this.response.length < 1) {
            if (task.response != null) {
                this.response.push(task)
            }
            task.request()
        } else {
            this.request.push(task)
        }
    }

    private onResponse(header: Header, data: Buffer) {
        // 下载文件时由于拦截了responsehanlder, 因此在下载文件完成之后需要手动触发此任务
        if (this.response.length > 0) {
            let task = this.response.pop()
            if (task.response != null) { 
                task.response(null, header, data)
            }
        }
        if (this.request.length > 0) {
            let task = this.request.pop()
            this.response.push(task)
            task.request()
        }
    }

}