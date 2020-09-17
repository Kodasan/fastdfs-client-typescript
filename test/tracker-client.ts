import { TrackerClient } from '../src/tracker/client'

let connOpts = {
    host: 'localhost',
    port: 22122
}

const STORAGE_SERVER_IP  = 'your storage server ip address'
const FILE_PATH          = 'M00/00/00/rBLkSl9iFB-AE1gFAAAn1mYFCok16_big.conf'
const GROUP_NAME         = 'group1'
const STORE_PATH         = 0
const PORT               = 23000


test('query an download server', async () => {
    const client = new TrackerClient(connOpts)
    const res    = await client.fetchResourcesServer(GROUP_NAME, FILE_PATH)
    expect(res.host).toMatch(STORAGE_SERVER_IP)
    expect(res.port).toBe(PORT)
    client.close()
})

test('query an upload server', async () => {
    const client = new TrackerClient(connOpts)
    const res    = await client.fetchStoreServer()
    expect(res).not.toBeNull()
    expect(res.host).toMatch(STORAGE_SERVER_IP)
    expect(res.port).toBe(PORT)
    expect(res.storePath).toBe(STORE_PATH)
    client.close()
})

const STORAGE_SERVER_AMOUNT  = 1

test('query download servers', async () => {
    const client = new TrackerClient(connOpts)
    const res    = await client.fetchResourcesServers(GROUP_NAME, FILE_PATH)
    expect(res).not.toBeNull()
    expect(res.length).toBe(STORAGE_SERVER_AMOUNT)
    expect(res[0].host).toMatch(STORAGE_SERVER_IP)
    expect(res[0].port).toBe(PORT)
    client.close()
})

test('list group stat', async () => {
    const client = new TrackerClient(connOpts)
    const res    = await client.listGroupsStat()
    expect(res).not.toBeNull()
    expect(res.length).toBeGreaterThan(0)
    expect(res.length).toBe(STORAGE_SERVER_AMOUNT)
    expect(res[0].groupName).toMatch(GROUP_NAME)
    expect(res[0].storagePort).toBe(PORT)
    client.close()
})

test('list storage server stat', async () => {
    const client = new TrackerClient(connOpts)
    const res    = await client.listStorageStat(GROUP_NAME)
    expect(res).not.toBeNull()
    expect(res.length).toBe(STORAGE_SERVER_AMOUNT)
    expect(res[0].ipAddr).toMatch(STORAGE_SERVER_IP)
    expect(res[0].storagePort).toBe(PORT)
})