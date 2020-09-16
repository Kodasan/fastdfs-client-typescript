import {Writable} from "stream"
/**
* @description upload datasource
* @author      kesanzz
*/
export interface UploadDataSource {
    invoke(out: Writable): void
}