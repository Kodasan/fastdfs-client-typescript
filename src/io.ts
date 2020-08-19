import * as net from 'net'
import { EventEmitter } from "events"
import { Header, ProtocolConstants, recvHeader } from './protocol'
import { Writable } from 'stream'

class DefaultHanlderContext {

    private inboundHandlers: Array<DataInboundHanlder>

    private conn: FastDfsConnection

    constructor(conn: FastDfsConnection) {
        this.inboundHandlers = []
        this.conn = conn
    }

    public fireRead(data: Buffer) {
        for(let i in this.inboundHandlers) {
            let handler = this.inboundHandlers[i]
            if (!handler.onData(data)) {
                return
            }
        }
    }

    public emit(event: string, ...args: any[]) {
        this.conn.emit(event, ...args)
    }

    public addInboundHandler(handler: DataInboundHanlder): this {
        handler.setContext(this)
        this.inboundHandlers.unshift(handler)
        return this
    }

    public remove(handler: DataInboundHanlder): this {
        this.inboundHandlers = this.inboundHandlers.filter( obj => obj != handler)
        return this
    }
}

export abstract class DataInboundHanlder {

    protected context: DefaultHanlderContext

    constructor(context?: DefaultHanlderContext) {
        this.context = context
    }

    public abstract onData(data: Buffer): boolean
    
    public removeSelf() {
        console.log(`Remove ${this} from context`)
        this.context.remove(this)
    }

    public setContext(context: DefaultHanlderContext) {
        this.context = context
    }
}

export class DataCollector extends DataInboundHanlder {
    
    private header: Header = null
    private responseBytes: Buffer = null
    private remainingBytes: number = 0

    public onData(data: Buffer): boolean {
        if (this.header == null && data.length < ProtocolConstants.HEADER_BYTES) {
            let err = new Error("Illegal Packet")
            //@todo 通知conncetion端
            return false
        }
        let offset = 0
        if (this.header == null) {
            this.header = recvHeader(data)
            offset = ProtocolConstants.HEADER_BYTES
            this.remainingBytes = this.header.length
        }
        let buf = offset == 0 ? data : data.slice(offset, offset + this.remainingBytes)
        this.responseBytes = this.responseBytes == null ? buf : Buffer.concat([this.responseBytes, buf])
        this.remainingBytes = this.header.length - this.responseBytes.length
        if (this.remainingBytes == 0) {
            let header = this.header
            let responseBytes = this.responseBytes
            this.header = null
            this.remainingBytes = 0
            this.responseBytes = null
            this.context.emit("response", header, responseBytes)
            return
        }
        return true
    }

}


export class FastDfsConnection extends EventEmitter {
    
    private socket: net.Socket
    private connectionOptions: net.TcpNetConnectOpts

    private context: DefaultHanlderContext

    constructor(options: net.TcpNetConnectOpts) {
        super()
        this.connectionOptions = options
        this.socket = net.connect(options, ()=> {
            this._registerListener()
            this.emit('connect')
        })
        this.socket.setNoDelay(true)
        this.socket.setEncoding('binary')
        this.context = new DefaultHanlderContext(this)
        this.context.addInboundHandler(new DataCollector())
    }
    
    public out(): Writable {
        return this.socket
    }

    public write(data: Buffer) {
        this.socket.write(data)
    }

    private _registerListener() {
        this.socket.on("data",  (data) => this.recvData(data))
        this.socket.on("error", (err)  => this.onSocketError(err))
    }

    private recvData(data: Buffer) {
        this.context.fireRead(data)
    }

    private closeConnection(err: Error) {
        if (err != null) {
            this.emit("error", err, this)
        }
        this.socket.destroy(err)
    }

    private onSocketError(err:Error) {
        this.emit("error", err, this)
        this.socket.destroy(err)
    }

    public alive(): boolean {
        //@todo 
        return true
    }

    public addInboundHandler(handler: DataInboundHanlder): this {
        this.context.addInboundHandler(handler)
        return this
    }

    public removeInboundHandler(handler: DataInboundHanlder): this {
        this.context.remove(handler)
        return this
    }
}
