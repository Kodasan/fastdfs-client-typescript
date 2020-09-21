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
    .on('error', (err) => {
        console.log(err)
    })
})
const DELETE_FILE = 'M00/00/00/rBLkSl9oCZ2AX5QKAAAn1mYFCok13.conf'

test('delete an file', async () => {
    // file already delete
    const client = new StorageClient(connOpts, storageServer)
    try {
        const res    = await client.delete(DELETE_FILE, groupName)
    } catch(ex) {
        expect(ex).not.toBeNull()
    }
    client.close()
})

const FILE_TO_MODIFY = 'M00/00/00/rBLkSl9oQTyEayp6AAAAAJmIxso430.bin'

test('modify an file', async () => {
    const client = new StorageClient(connOpts, storageServer)
    const payload = Buffer.alloc(1)
    for(let i = 0 ; i < 1; i++) {
        payload[i] = i
    }
    const res    = await client.modify(FILE_TO_MODIFY, 10, payload)
    expect(res).toBe(true)
    client.close()
})

const FILE_TO_APPEND = 'M00/00/00/rBLkSl9oQTyEayp6AAAAAJmIxso430.bin'

test('append an file', async () => {
    const client  = new StorageClient(connOpts, storageServer)
    const payload = Buffer.alloc(1024)
    payload.fill(0xFE)
    const res = await client.append(FILE_TO_APPEND, payload)
    expect(res).toBe(true)
    client.close()
})

const FILE_TO_TRUNCATE = FILE_TO_APPEND

test('truncate file', async () => {
    const client = new StorageClient(connOpts, storageServer)
    const res    = await client.truncate(FILE_TO_TRUNCATE, 10)
    expect(res).toBe(true)
    client.close()
})
