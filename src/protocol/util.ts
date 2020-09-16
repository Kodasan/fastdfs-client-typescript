import { ProtocolConstants } from "./constants"
import { Header }            from "./header"

export function packHeader(length: number, status: number, cmd: number): Buffer {
    let buf = Buffer.alloc(10)
    numberToBuff(length, buf, ProtocolConstants.LENGTH_INDEX)
    buf[ProtocolConstants.CMD_INDEX] = cmd
    buf[ProtocolConstants.STATUS_INDEX] = status
    return buf
}

export function recvHeader(buffer: Buffer): Header {
    let length = buffToNumber(buffer, 0)
    return {
        length,
        status: buffer.readUInt8(ProtocolConstants.STATUS_INDEX),
        cmd: buffer.readUInt8(ProtocolConstants.CMD_INDEX)
    }
}

export function numberToBuff(length: number, buffer: Buffer, offset: number) {
    let num = BigInt(length)
    buffer.writeBigInt64BE(num, offset)
}

export function buffToNumber(buffer: Buffer, offset: number): number {
    return    buffer.readUInt8(offset) << 56 
            | buffer.readUInt8(offset + 1) << 48 
            | buffer.readUInt8(offset + 2) << 40 
            | buffer.readUInt8(offset + 3) << 32
            | buffer.readUInt8(offset + 4) << 24
            | buffer.readUInt8(offset + 5) << 16
            | buffer.readUInt8(offset + 6) << 8
            | buffer.readUInt8(offset + 7);
}

export function replaceEndStr(str: string): string {
    let i = str.indexOf('\u0000')
    if ( i < 0) {
        return str
    }
    if ( i == 0 ) {
        return ''
    }
    return str.substring(0, i)
}