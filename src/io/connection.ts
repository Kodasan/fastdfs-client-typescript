import { EventEmitter }         from "events"
import * as net                 from "net"
import { Writable, Readable }   from "stream"

import { EventHandlerContext }  from "./context"

/**
 * @description FastDfs Connection
 */
export class FastDfsConnection extends EventEmitter {

    private ctx:     EventHandlerContext

    private socket:  net.Socket

    private options: net.TcpNetConnectOpts

    constructor(options: net.TcpNetConnectOpts) {
        super()
        this.ctx     = new EventHandlerContext(this)
        this.options = options
    }

    public connect(cb:() => void): void {
        this.socket = net.connect(this.options, cb)
        this.configureSocket()
    }

    public context(): EventHandlerContext {
        return this.ctx;
    }

    public _in(): Readable {
        return this.socket
    }

    public _out(): Writable {
        return this.socket
    }

    public close() {
        this.socket.removeAllListeners()
        this.socket.destroy(null)
    }

    private configureSocket() {
        this.socket.setNoDelay(true)

        this.socket.on('connect', ()     => this.emit('connect'))
        this.socket.on('data',    (data) => this.ctx.fireRead(data))
        this.socket.on('error',   (err)  => { 
            process.nextTick(() => this.ctx.fireError(err)) 
            this.emit('error',  err)
        })
    }
}