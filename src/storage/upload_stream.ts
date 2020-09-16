import { UploadDataSource } from "./upload_datasource";

import {Writable, Readable} from "stream"

/**
 * @description Upload byte stream to server
 * @author      kesanzz
 */
export class UploadStream implements UploadDataSource {

    private inStream: Readable

    constructor(inStream:Readable, autoClose: boolean = true) {
        this.inStream = inStream
        this.inStream.on('end', () => {
            if (autoClose) {
                this.inStream.destroy(null)
            }
        })
    }

    public invoke(out: Writable): void {
        this.inStream.pipe(out, { end: false })
    }

}