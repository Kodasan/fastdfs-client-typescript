import { EventHandler }      from "./inboud_handler";
import { FastDfsConnection } from "./connection";

/**
 * @description context
 * @author kesanzz
 */
export class EventHandlerContext {

    private handlers: Array<EventHandler>

    private conn:     FastDfsConnection

    constructor(conn: FastDfsConnection) {
        this.handlers = []
        this.conn = conn
    }

    public established(cb: () => void): this {
        this.conn.on('connect', () => cb())
        return this
    }

    public fireConnect(): this {
        let idx = 0
        let len = this.handlers.length
        try {
           while (idx < len) {
               const handler = this.handlers[idx]
               if (handler && !handler.connect(this)) {
                   break
               }
               idx++
           }
        } catch (err) {
            this.fireError(err)
        }
        return this
    }

    public fireRead(data: Buffer): this {
        let idx = 0
        let len = this.handlers.length
        try {
            while (idx < len) {
                const handler = this.handlers[idx]
                if (handler && !handler.read(this, data)) {
                    break
                }
                idx++
            }
        } catch(err) {
            this.fireError(err)
        }
        return this
    }

    public fireError(err: Error): this {
        let idx = 0
        let len = this.handlers.length
        try {
           while (idx < len) {
               const handler = this.handlers[idx]
               if (handler && handler.error(this, err)) {
                   break
               }
               idx++
           }
        } catch(err) {
            //...
        }
        return this
    }

    public addHandler(handler: EventHandler): this {
        this.handlers.push(handler)
        return this
    }

    public unshiftHandler(handler: EventHandler): this {
        this.handlers.unshift(handler)
        return this
    }

    public removeHandler(handler: EventHandler): this {
        this.handlers = this.handlers.filter( item => item != handler)
        return this
    }
}
