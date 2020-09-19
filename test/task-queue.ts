import { TrackerClient } from "../src/tracker/client"

let connOpts = {
    host: 'localhost',
    port: 22122
}

const fastdfsFile = 'M00/00/00/rBLkSl9iFB-AE1gFAAAn1mYFCok16_big.conf'

test("task queue test", async () => {
    const client = new TrackerClient(connOpts)
    let p1   = client.fetchResourcesServer('group1', fastdfsFile)
    let p2   = client.fetchStoreServer()
    const r1 = await p1
    const r2 = await p2
    expect(r1).not.toBeNull()
    expect(r2).not.toBeNull()
    expect(r1.host).not.toBeNull()
    expect(r1.host.length).toBeGreaterThan(0)
    expect(r1.host).toMatch(r2.host)
    expect(r1.host).toBe(r2.host)
    client.close()
})

test("submit task after client close", async () => {
    const client = new TrackerClient(connOpts)
    client.close()
    let err: Error = null
    try {
        const res = await client.fetchStoreServer()
    } catch (ex) {
        if (ex instanceof Error) {
            err = ex
        }
    }
    expect(err).not.toBeNull()
    expect(err.message).toMatch('client already closed')
})

test('abort all task', async () => {
    const client = new TrackerClient(connOpts)
    let p1   = client.fetchResourcesServer('group1', fastdfsFile)
    let p2   = client.fetchStoreServer()
    client.abort()
    let err1:Error, err2: Error
    try {
        await p1
    } catch (err) {
        if (err instanceof Error) {
            err1 = err
        }
    }

    try {
        await p2
    } catch (err) {
        if (err instanceof Error) {
            err2 = err
        }
    }
    expect(err1).not.toBeNull()
    expect(err2).not.toBeNull()
    expect(err1.message).toMatch(err2.message)
    expect(err1.message).toMatch('client has been abort')
})

test('submit tasks then close client', async () => {
    const client = new TrackerClient(connOpts)
    let p1   = client.fetchResourcesServer('group1', fastdfsFile)
    let p2   = client.fetchStoreServer()
    client.close()
    const r1 = await p1
    const r2 = await p2
    expect(r1).not.toBeNull()
    expect(r2).not.toBeNull()
    expect(r1.host).not.toBeNull()
    expect(r1.host.length).toBeGreaterThan(0)
    expect(r1.host).toMatch(r2.host)
})