import { FastDfsConnection } from "../io/connection"
import * as net              from "net"
import { UploadTask }        from "./upload_task"
import { ProtocolConstants } from "../protocol/constants"
import { StorageCmd }        from "../protocol/storage_cmd"
import * as util             from "../protocol/util"
import { StorageServer }     from "../protocol/storage_server"
import { UploadResult }      from "./upload_result"
import { UploadBuffer }      from "./upload_buffer"
import * as fs               from "fs"
import { UploadStream }      from "./upload_stream"
import { Readable }          from "stream"
import { StreamRedirector }  from "../io/handlers/stream_redirector"
import { DownloadTask }      from "./download_task"
import { ReadableFile }      from "./readabl_file"
import { AppendTask }        from "./append_task"
import { ModfiyTask }        from "./modify_task"
import { AbstractClient }    from "../common/abstract_client"

/**
 * @description storage client of fastdfs
 * @author      kesanzz
 */
export class StorageClient extends AbstractClient {
    
    private server: StorageServer

    constructor(arg: FastDfsConnection | net.TcpNetConnectOpts, config: StorageServer){
        super(arg)
        this.server = config
    }

    public uploadData(data:Buffer, extName?: string): Promise<UploadResult> {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_FILE,
            fileExtName: extName,
            fileSize: data.length,
            dataSource: new UploadBuffer(data)
        })
    }

    public uploadFile(path: string, extName?: string): Promise<UploadResult> {
        return this.doUploadFile(StorageCmd.UPLOAD_FILE, path, extName)
    }

    public uploadStream(inStream: Readable, dataSize: number, autoClose?: boolean, extName?: string): Promise<UploadResult> {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_FILE,
            fileSize: dataSize,
            fileExtName: extName,
            dataSource: new UploadStream(inStream, autoClose)
        })
    }

    public uploadAppenderFile(path: string, extName?: string): Promise<UploadResult> {
        return this.doUploadFile(StorageCmd.UPLOAD_APPENDER_FILE, path, extName)
    }

    public uploadAppenderData(data: Buffer, extName?: string) {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_APPENDER_FILE,
            fileSize: data.length,
            fileExtName: extName,
            dataSource: new UploadBuffer(data)
        })
    }

    public uploadAppenderStream(inStream: Readable, dataSize: number, autoClose?: boolean, extName?: string): Promise<UploadResult> {
        return this.doUpload({
            cmd: StorageCmd.UPLOAD_APPENDER_FILE,
            fileSize: dataSize,
            fileExtName: extName,
            dataSource: new UploadStream(inStream, autoClose)
        })
    }

    public doUploadFile(cmd: StorageCmd, path: string, extName?: string): Promise<UploadResult> {
        let readStream: Readable = null
        let fileSize: number     = 0
        try {
             readStream = fs.createReadStream(path)
             fileSize   = fs.statSync(path).size
        } catch (ex) {
            return Promise.reject(ex)
        }
        const fileExtName = extName ? extName : path.substring(path.lastIndexOf('.') + 1)
        return this.doUpload({
            cmd,
            fileExtName,
            fileSize,
            dataSource: new UploadStream(readStream)
        })
    }

    public doUpload(uploadTask: UploadTask): Promise<UploadResult> {
        return new Promise<UploadResult>((resolve, reject) => {
            this._submit({
                request: () => {
                    let extNameBytes = Buffer.alloc(ProtocolConstants.EXT_NAME_BYTES, 0)
                    if (uploadTask.fileExtName != null) {
                        extNameBytes.write(uploadTask.fileExtName, 'utf-8')
                    }
                    let bodyLength = 1 + ProtocolConstants.LENGTH_BYTES 
                                       + ProtocolConstants.EXT_NAME_BYTES 
                                       + uploadTask.fileSize
                    let header = util.packHeader(bodyLength, 0, uploadTask.cmd)
                    let sizeBytes = Buffer.alloc(1 + ProtocolConstants.LENGTH_BYTES)
                    sizeBytes.writeUInt8(this.server.storePath, 0)
                    util.numberToBuff(uploadTask.fileSize, sizeBytes, 1)
                    let out = this.conn._out()
                    out.write(header)
                    out.write(sizeBytes)
                    out.write(extNameBytes)
                    uploadTask.dataSource.invoke(out)
                },
                response: (err, header, data) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code:${header.status}`))
                        return
                    }
                    let groupName = util.replaceEndStr(data.toString('utf-8', 0, ProtocolConstants.GROUP_NAME_MAX_BYTES))
                    let filename = data.toString('utf-8', ProtocolConstants.GROUP_NAME_MAX_BYTES)
                    resolve({groupName, filename})
                }
            })
        })
    }

    public downloadToStream(task: DownloadTask): Readable {
        let   readable       = new ReadableFile()
        const interceptData  = true
        this._submit({
            request: () => {
                let redirector = new StreamRedirector(readable, interceptData)
                this.conn.context().unshiftHandler(redirector)
                this._sendDownloadCmd(task.groupName, task.filename, task.fileOffset, task.byteAmount)
            }
        })
        return readable
    }

    public download(task: DownloadTask): Promise<Buffer> {
        return new Promise<Buffer>((resolve, reject) => {
            this._submit({
                request: () => {
                    this._sendDownloadCmd(task.groupName, task.filename, task.fileOffset, task.byteAmount)
                },
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    resolve(payload)
                }
            })
        })
    }

    public append(filename: string,  data: Buffer): Promise<boolean> {
        return this.doAppend({
            filename,
            appendSize: data.length,
            dataSource: new UploadBuffer(data)
        })
    }
    

    public modify(filename: string, offset: number, data: Buffer): Promise<boolean> {
        return this.doModify({
            filename,
            offset,
            modifySize: data.length,
            dataSource: new UploadBuffer(data)
        })
    }

    public doAppend(task: AppendTask): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this._submit({
                request: () => {
                    let nameBytes = Buffer.from(task.filename)
                    let len       = nameBytes.length 
                                  + ProtocolConstants.LENGTH_BYTES * 2  
                                  + task.appendSize
                    let header    = util.packHeader(len, 0, StorageCmd.APPEND_FILE)
                    let nameLen   = Buffer.alloc(ProtocolConstants.LENGTH_BYTES)
                    let dataLen   = Buffer.alloc(ProtocolConstants.LENGTH_BYTES)
                    util.numberToBuff(nameBytes.length, nameLen, 0)
                    util.numberToBuff(task.appendSize,  dataLen, 0)
                    let pkg       = Buffer.concat([
                                        header,
                                        nameLen,
                                        dataLen,
                                        nameBytes
                                    ])
                    let _out = this.conn._out()
                    _out.write(pkg)
                    task.dataSource.invoke(_out)
                },
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    resolve(true)
                }
            })
        })
    }

    public delete(filename: string, groupName: string): Promise<boolean> {
        if (!groupName) {
            return Promise.reject(new Error('group name must be secified'))
        }
        return new Promise<boolean>((resolve, reject) => {
            this._submit({
                request: () => {
                    let nameBytes      = Buffer.from(filename)
                    let groupNameBytes = Buffer.alloc(ProtocolConstants.GROUP_NAME_MAX_BYTES)
                    groupNameBytes.write(groupName)
                    let pkgLen         = groupNameBytes.length + nameBytes.length
                    
                    const pkg = Buffer.concat([
                        util.packHeader(pkgLen, 0, StorageCmd.DELETE_FILE),
                        groupNameBytes,
                        nameBytes
                    ])
                    this.conn._out().write(pkg)
                },
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    resolve(true)
                }
            })
        })
    }

    public doModify(task: ModfiyTask): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this._submit({
                request: () => {
                    let nameBytes = Buffer.from(task.filename, 'utf-8')
                    let pkgLen    = 3 * ProtocolConstants.LENGTH_BYTES 
                                  + nameBytes.length
                                  + task.modifySize
                    let pkg       =  Buffer.concat([
                                        util.packHeader(pkgLen, 0, StorageCmd.MODIFY_FILE),
                                        util.numToBuffer(nameBytes.length),
                                        util.numToBuffer(task.offset),
                                        util.numToBuffer(task.modifySize),
                                        nameBytes
                                    ])
                    let _out = this.conn._out()
                    _out.write(pkg)
                    task.dataSource.invoke(_out)
                },
                response: (err, header) => { 
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    resolve(true)
                }
            })
        })
    }

    public truncate(filename: string, trucncatedFileSize: number): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this._submit({
                request: () => {
                    let nameBytes      = Buffer.from(filename)
                    let pkgLen         = 2 * ProtocolConstants.LENGTH_BYTES + nameBytes.length
                    let pkg            = Buffer.concat([
                                            util.packHeader(pkgLen, 0, StorageCmd.TRUNCATE_FILE),
                                            util.numToBuffer(nameBytes.length),
                                            util.numToBuffer(trucncatedFileSize),
                                            nameBytes
                                         ])
                    this.conn._out().write(pkg)
                },
                response: (err, header, payload) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    if (header.status != 0) {
                        reject(new Error(`Error code ${header.status}`))
                        return
                    }
                    resolve(true)
                }
            })
        })
    }


    private _sendDownloadCmd(groupName:string, filename:string, offset:number, byteAmount: number) {
        let filenameBytes = Buffer.from(filename)
        let groupNameBytes = Buffer.alloc(ProtocolConstants.GROUP_NAME_MAX_BYTES, 0)
        groupNameBytes.write(groupName, 'utf-8')
        let offsetBytes = Buffer.alloc(8)
        util.numberToBuff(offset, offsetBytes, 0)
        let byteAmountBytes = Buffer.alloc(8)
        util.numberToBuff(byteAmount, byteAmountBytes, 0)
        let bodyLength = ProtocolConstants.GROUP_NAME_MAX_BYTES + filenameBytes.length + byteAmountBytes.length + offsetBytes.length
        let header = util.packHeader(bodyLength, 0, StorageCmd.DOWNLOAD_FILE)
        let payload = Buffer.concat([header, offsetBytes, byteAmountBytes, groupNameBytes, filenameBytes])
        this.conn._out().write(payload)
    }   

}