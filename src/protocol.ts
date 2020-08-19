export enum TrackerCmd {
    QUERY_STORE_WITH_GROUP_ALL = 107,
    QUERY_STORE_WITH_GROUP_ONE = 104,
    QUERY_STORE_WITHOUT_GROUP_ONE = 101,
    QUERY_FETCH_ONE = 102,
    QUERY_FETCH_WITHOUT_GROUP_ONE = 101,
    QUERY_FETCH_ALL = 105
}

export enum StorageCmd {
    UPLOAD_FILE = 11,
    DOWNLOAD_FILE = 14
}

export interface Header {
    length: number,
    status: number,
    cmd: number
}

export interface Task {
    request: () => void
    response?: (err: Error, header?: Header, data?: Buffer) => void
    interceptor?: (data:Buffer) => void
}

export enum ProtocolConstants {
    LENGTH_INDEX = 0,
    CMD_INDEX = 8,
    STATUS_INDEX = 9,
    LENGTH_BYTES = 8,
    GROUP_NAME_MAX_BYTES = 16,
    HEADER_BYTES = 10,
    IP_ADDR_BYTES = 15,
    PORT_BYTES = 8,
    EXT_NAME_BYTES = 6,
    TRACKER_QUERY_STORAGE_STORE_BODY_LEN = 40,
    TRACKER_QUERY_STORAGE_FETCH_BODY_LEN = IP_ADDR_BYTES + GROUP_NAME_MAX_BYTES + PORT_BYTES
}

export enum FastDfsErrorCode {

}

export class FastDfsError extends Error {

    private code: number

    constructor(code: number, msg: string) {
        super(msg)
        this.code = code
    }

    public getErrorCode():number {
        return this.code
    }
}

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
    buffer.writeBigInt64BE(num, 0)
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