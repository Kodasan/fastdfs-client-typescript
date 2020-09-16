import { RemoteAddress } from "./remote_address";

/**
 * @description storage server information
 * @author      kesanzz
 */
export interface StorageServer extends RemoteAddress {
    storePath?: number,
    groupName?: string
}

