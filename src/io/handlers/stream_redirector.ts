import { EventHandler }        from "../inboud_handler";
import { Readable }            from "stream"
import { EventHandlerContext } from "../context";
import { Header }              from "../../protocol/header";
import { ProtocolConstants }   from "../../protocol/constants";
import { recvHeader }          from "../../protocol/util";

/**
 * @description Redirect file stream to readable stream
 * @author      kesanzz
 */
export class StreamRedirector extends EventHandler {

    private inputStream:   Readable

    private interceptData: boolean

    private header:        Header

    private remaining:     number

    constructor(inputStream: Readable, interceptData: boolean) {
        super()
        this.inputStream   = inputStream
        this.interceptData = interceptData
        this.header        = null
        this.remaining     = 0
    }

    public read(ctx: EventHandlerContext, data: Buffer): boolean {
        let readPos = 0
        if (this.header == null) {
            if (data.length < ProtocolConstants.HEADER_BYTES) {
                this.inputStream.emit('error', new Error(`Illegal packet, recv ${data.length} bytes, but expect ${ProtocolConstants.HEADER_BYTES} bytes`))
                return
            }
            this.header     = recvHeader(data)
            readPos         = ProtocolConstants.HEADER_BYTES
            this.remaining  = this.header.length
        }
        const chunk      = data.slice(readPos, this.remaining + readPos)
        this.remaining = this.remaining - chunk.length
        if (chunk.length > 0) {
            this.redirect(chunk)
        }

        if (this.remaining == 0) { 
            this.redirect(null)
            this.removeSelf(ctx)
            this.header    = null
            this.remaining = 0
        }

        return !this.interceptData
    }

    public error(ctx: EventHandlerContext, error: Error): boolean {
        if (this.inputStream != null) {
            let _in = this.inputStream
            process.nextTick(() => _in.emit('error', error))
        }
        return true
    }

    protected redirect(chunk: Buffer): this {
        if (this.inputStream != null) {
            let _in = this.inputStream
            process.nextTick(() => _in.push(chunk))
        }
        return this
    }

}