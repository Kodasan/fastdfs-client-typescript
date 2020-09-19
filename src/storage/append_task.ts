import { UploadDataSource } from "./upload_datasource";

export interface AppendTask {
    filename: string,
    appendSize: number,
    dataSource: UploadDataSource
}
