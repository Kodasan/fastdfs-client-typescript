import { UploadDataSource } from "./upload_datasource";

export interface ModfiyTask {
    filename:   string,
    offset:     number,
    modifySize: number,
    dataSource: UploadDataSource
}