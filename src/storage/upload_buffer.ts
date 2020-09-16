import { UploadDataSource } from "./upload_datasource";

import {Writable} from "stream"

/**
 * @description upload buffer to server
 * @author      kesanzz
 */
export class UploadBuffer implements UploadDataSource {
    
    private payload: Buffer

    constructor(payload: Buffer) {
        this.payload = payload
    }

    public invoke(out: Writable): void {
        out.write(this.payload)
    }
}