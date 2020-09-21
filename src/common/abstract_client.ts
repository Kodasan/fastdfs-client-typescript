import { FastDfsConnection } from "../io/connection";
import { TaskQueue }         from "./task_queue";
import * as net              from "net"
import { FrameDecoder }      from "../io/handlers/frame_decoder";
import { Header }            from "../protocol/header";

/**
 * @description net event client
 * @author      kesanzz
 */
export class AbstractClient extends TaskQueue {

    protected conn: FastDfsConnection

    constructor(arg: FastDfsConnection | net.TcpNetConnectOpts) {
        super()
        const conn = arg instanceof FastDfsConnection ? arg : new FastDfsConnection(arg)
        this._init(conn)
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
        this._reject(new Error('client has been abort'))
    }
    
    private _init(conn: FastDfsConnection) {
        this.conn = conn
        this.conn.connect(() => this._connected())
        this.conn.on('close', (args) => this._closed(args)) 
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
        let frameDecoder = new FrameDecoder((fatalError: boolean, err: Error, header: Header, data: Buffer) => {
            if (fatalError) {
                this._fatalError(err)
                return
            }
            this._response(err, header, data)
        })
        ctx.addHandler(frameDecoder)
        // trigger to invoke next task
        this._activeTaskQueue()
    }

}