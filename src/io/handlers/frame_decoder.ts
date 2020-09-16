import { EventHandler }        from "../inboud_handler";
import { EventHandlerContext } from "../context";
import { Header }              from "../../protocol/header";
import { ProtocolConstants }   from "../../protocol/constants";
import { recvHeader }          from "../../protocol/util";

/**
 * @description FastDFS protocol decoder
 * @author      kesanzz
 */
export class FrameDecoder extends EventHandler {

    private header:     Header
    private data:       Buffer
    private writePos:   number

    private cb: (err: Error, header: Header, responseBytes: Buffer) => void

    constructor(cb?: (err: Error, header: Header, responseBytes: Buffer) => void) {
        super()
        if (cb) {
            this.cb = cb
        }
    }

    public bind(cb: (err: Error, header: Header, responseBytes: Buffer) => void): this {
        this.cb = cb
        return this
    }

    public read(ctx: EventHandlerContext, buff: Buffer): boolean {
        if (this.header == null) {
            if (buff.length < ProtocolConstants.HEADER_BYTES) {
                ctx.fireError(new Error(`Illegal packet, recv ${buff.length} bytes, but expect ${ProtocolConstants.HEADER_BYTES} bytes`))
                return
            }
            this.header = recvHeader(buff)
            if (this.header.length > 0) {
                if (this.header.length == buff.length - ProtocolConstants.HEADER_BYTES) {
                    let responseBytes = buff.slice(ProtocolConstants.HEADER_BYTES)
                    let header = this.header
                    this.header = null
                    this.writePos = 0
                    this.invoke(null, header, responseBytes)
                } else {
                    this.writePos = buff.length - ProtocolConstants.HEADER_BYTES
                    this.data = Buffer.alloc(this.header.length)
                    buff.copy(this.data, 0, ProtocolConstants.HEADER_BYTES)
                }
            } else {
                let header = this.header
                this.header = null
                this.invoke(null, header, null)
            }
            return
        }
        buff.copy(this.data, this.writePos, 0)
        this.writePos += buff.length
        if (this.writePos == this.header.length) {
            let header = this.header
            let responseBytes = this.data
            this.writePos = 0
            this.header = null
            this.data = null
            this.invoke(null, header, responseBytes)
        }
        return true
    }

    private invoke(err: Error, header: Header, responseBytes: Buffer) {
        if (!this.cb) {
            return
        }
        process.nextTick(() => this.cb(err, header, responseBytes))
    }
}
