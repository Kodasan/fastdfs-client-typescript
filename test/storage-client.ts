import * as fs from "fs"
/**
 * storage client test
 */
import { StorageClient } from '../src/storage/client'
let connOpts = {
    host: 'localhost',
    port: 23000
}

let storageServer = {
    host: 'localhost',
    port: 23000,
    storePath: 0,
    groupName: 'group1'
}


const file = '/root/text.jpg'

test('upload an file',  async () => {
    const client = new StorageClient(connOpts, storageServer)
    const res = await client.uploadFile(file)
    expect(res.filename).not.toBeNull()
    client.close()
})

const fastdfsFile = 'M00/00/00/rBLkSl9iFB-AE1gFAAAn1mYFCok16_big.conf'
const groupName = 'group1'

test('download an file to buffer', async () => {
    const client = new StorageClient(connOpts, storageServer)
    const res = await client.download({
        filename: fastdfsFile,
        groupName,
        fileOffset: 0,
        byteAmount: 256
    })
    expect(res).not.toBeNull()
    expect(res.length).toEqual(256)
    client.close()
})



test('redirect download stream test',  done => {
    const savePath = '/root/target'
    const client = new StorageClient(connOpts, storageServer)
    client.downloadToStream({
        filename: fastdfsFile,
        groupName,
        fileOffset: 0,
        byteAmount: 512
    })
    .pipe(fs.createWriteStream(savePath))
    .on('close', () => {
        fs.stat(savePath, (err, stat) => {
            expect(err).toBeNull()
            expect(stat.size).toBe(512)
            done()
        })
        client.close()
    })
})
