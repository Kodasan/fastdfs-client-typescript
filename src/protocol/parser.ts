import { ProtocolConstants }    from "./constants"
import { StorageGroupStat }     from "./storage_group_stat"
import { StorageServerStat }    from "./storage_server_stat"
import { replaceEndStr }        from "./util"


export enum FastDfsTypes {
    LONG,
    INT,
    INT32,
    GROUP_NAME,
    PORT,
    ONE_BYTE,
    STORAGE_ID,
    STRING,
    DATE,
    BOOLEAN,
}

export interface Field {
    property: string
    offset?: number,
    size?: number,
    type?: FastDfsTypes
}

export function parseGroupName(data: Buffer, offset: number, charset: BufferEncoding) {
    return replaceEndStr(data.toString(charset, offset, offset + ProtocolConstants.GROUP_NAME_MAX_BYTES))
}

export function parseStorageId(data: Buffer, offset: number) {
    return replaceEndStr(data.toString('utf-8', offset, offset + ProtocolConstants.STORAGE_ID_MAX_SIZE))
}


export function parseFields<T>(fields: Array<Field>, data: Buffer, offset: number, charset?: BufferEncoding): [T, number] {
    let attr = {}
    let pos = offset
    fields.forEach( field => {
        switch(field.type) {
            case FastDfsTypes.GROUP_NAME : {
                attr[field.property] = parseGroupName(data, pos, charset ? charset : 'utf-8')
                pos = pos + ProtocolConstants.GROUP_NAME_MAX_BYTES + 1
                break
            }
            case FastDfsTypes.LONG : {
                attr[field.property] = data.readBigUInt64BE(pos)
                pos = pos + ProtocolConstants.LENGTH_BYTES
                break
            }
            case FastDfsTypes.INT: {
                attr[field.property] = data.readUInt32BE(pos + 4)
                pos = pos + ProtocolConstants.LENGTH_BYTES
                break
            }
            case FastDfsTypes.INT32: {
                attr[field.property] = data.readUInt32BE(pos)
                pos = pos + 4
                break
            }
            case FastDfsTypes.ONE_BYTE: {
                attr[field.property] = data.readUInt8(pos)
                pos = pos + 1
                break
            }
            case FastDfsTypes.STORAGE_ID: {
                attr[field.property] = parseStorageId(data, pos)
                pos = pos + ProtocolConstants.STORAGE_ID_MAX_SIZE
                break
            }
            case FastDfsTypes.STRING: {
                if (!field.size) {
                    throw new Error('String size must be set')
                }
                let nextPos = pos + field.size
                attr[field.property] = replaceEndStr(data.toString(charset, pos, nextPos))
                pos = nextPos
                break
            }
            case FastDfsTypes.BOOLEAN: {
                attr[field.property] = data.readUInt8(0) > 0
                pos +=  1
                break
            }
            case FastDfsTypes.DATE : {
                // FastDFS返回的数据以秒为单位
                let timestamp = data.readBigUInt64BE(pos)
                attr[field.property] = new Date(Number(timestamp) * 1000)
                pos = pos + 8
                break
            }
            default: {
                attr[field.property] = data.readBigUInt64BE(pos)
                pos = pos + ProtocolConstants.LENGTH_BYTES
                break
            }
        }
    })
    return [attr as T, pos]
}

function field(property:string, type?:FastDfsTypes, size?:number, offset?:number): Field {
    return {property, type, offset, size}
}

const STORAGE_GROUP_STAT_FILEDS: Array<Field> = [
    field('groupName',          FastDfsTypes.GROUP_NAME),
    field('totalMB'),
    field('freeMB'),
    field('trunkFreeMB'),
    field('storageCount',       FastDfsTypes.INT),
    field('storagePort',        FastDfsTypes.INT),
    field('storageHttpPort',    FastDfsTypes.INT),
    field('activeCount',        FastDfsTypes.INT),
    field('currentWriteServer', FastDfsTypes.INT),
    field('storePathCount',     FastDfsTypes.INT),
    field('subdirCountPerPath', FastDfsTypes.INT),
    field('currentTrunkFileId', FastDfsTypes.INT)
]


const STORAGE_SERVER_STAT_FILEDS: Array<Field> = [
    field('status',                 FastDfsTypes.ONE_BYTE),
    field('id',                     FastDfsTypes.STORAGE_ID),
    field('ipAddr',                 FastDfsTypes.STRING, ProtocolConstants.IP_ADDR_BYTES + 1),
    field('domainName',             FastDfsTypes.STRING, ProtocolConstants.DOMAIN_NAME_MAX_BYTES),
    field('srcIpAddr',              FastDfsTypes.STRING, ProtocolConstants.IP_ADDR_BYTES + 1),
    field('version',                FastDfsTypes.STRING, ProtocolConstants.VERSION_SIZE),
    field('joinTime',               FastDfsTypes.DATE),
    field('upTime',                 FastDfsTypes.DATE),
    field('totalMB'),
    field('freeMB'),
    field('uploadPriority',         FastDfsTypes.INT),
    field('storePathCount',         FastDfsTypes.INT),
    field('subdirCountPerPath',     FastDfsTypes.INT),
    field('currentWritePath',       FastDfsTypes.INT),
    field('storagePort',            FastDfsTypes.INT),
    field('storageHttpPort',        FastDfsTypes.INT),
    field('connectionAllocCount',   FastDfsTypes.INT32),
    field('connectionCurrentCount', FastDfsTypes.INT32),
    field('connectionMaxCount',     FastDfsTypes.INT32),
    field('totalUploadCount'),
    field('successUploadCount'),
    field('totalAppendCount'),
    field('successAppendCount'),
    field('totalModifyCount'),
    field('successModifyCount'),
    field('totalTruncateCount'),
    field('successTruncateCount'),
    field('totalSetMeatCount'),
    field('successSetMetaCount'),
    field('totalDeleteCount'),
    field('successDeleteCount'),
    field('totalDownloadCount'),
    field('successDownloadCount'),
    field('totalGetMeateCount'),
    field('successGetMeateCount'),
    field('totalCreateLinkCount'),
    field('successCreateLinkCount'),
    field('totalDeleteLinkCount'),
    field('successDeleteLinkCount'),
    field('totalUploadBytes'),
    field('successUploadBytes'),
    field('totalAppendBytes'),
    field('successApppendBytes'),
    field('totalModifyBytes'),
    field('successModifyBytes'),
    field('totalDownloadBytes'),
    field('successDownloadBytes'),
    field('totalSyncInBytes'),
    field('successSyncInBytes'),
    field('totalSyncOutBytes'),
    field('successSyncOutBytes'),
    field('totalFileOpenCount'),
    field('successFileOpenCount'),
    field('totalFileReadCount'),
    field('successFileReadCount'),
    field('totalFileWriteCount'),
    field('successFileWriteCount'),
    field('lastSourceUpdate',       FastDfsTypes.DATE),
    field('lastSyncDate',           FastDfsTypes.DATE),
    field('lastSyncedTimestamp',    FastDfsTypes.DATE),
    field('lastHeartBeatTime',      FastDfsTypes.DATE),
    field('ifTrunkServer',          FastDfsTypes.BOOLEAN)
]

export function parseStorageGroupStat(data: Buffer, offset: number, charset?: BufferEncoding): [StorageGroupStat, number] {
    return parseFields<StorageGroupStat>(STORAGE_GROUP_STAT_FILEDS, data, offset, charset)
}

export function parseStorageServerStat(data: Buffer, offset: number, charset?: BufferEncoding): [StorageServerStat, number] {
    return parseFields<StorageServerStat>(STORAGE_SERVER_STAT_FILEDS, data, offset, charset)
}
