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


const file   = '/root/text.jpg'

test('upload an file',  async () => {
    const client = new StorageClient(connOpts, storageServer)
    const res = await client.uploadFile(file)
    expect(res.filename).not.toBeNull()
    client.close()
})

