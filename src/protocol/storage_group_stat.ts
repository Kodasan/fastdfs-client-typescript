/**
 * stat of storage group
 */
export interface StorageGroupStat {
    groupName: string,
    totalMB: bigint,
    freeMB: bigint,
    trunkFreeMB: bigint,
    storageCount: number,
    storagePort: number,
    storageHttpPort: number,
    activeCount: number,
    currentWriteServer: number,
    storePathCount: number,
    subbdirCountPerPath: number,
    currentTrunkFileId: number
}