import { NameValuePair }    from "../protocol/name_value_pair"
import { UploadDataSource } from "./upload_datasource"
import { StorageCmd }       from "../protocol/storage_cmd"

export interface UploadTask {
    cmd: StorageCmd,
    groupName?: string,
    masterFilename?: string,
    prefixName?: string,
    fileExtName: string,
    fileSize: number,
    dataSource: UploadDataSource,
    metaData?: NameValuePair[]
}