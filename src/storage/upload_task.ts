import { NameValuePair } from "../protocol/name_value_pair";
import { Writable }       from "stream";
import { UploadDataSource } from "./upload_datasource";

export interface UploadTask {
    groupName?: string,
    masterFilename?: string,
    prefixName?: string,
    fileExtName: string,
    fileSize: number,
    dataSource: UploadDataSource,
    metaData?: NameValuePair[]
}