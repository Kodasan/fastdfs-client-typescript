/**
 * @description download task
 * @author      kesanzz
 */
export interface DownloadTask {
    groupName?: string,
    filename: string,
    fileOffset: number,
    byteAmount: number
}