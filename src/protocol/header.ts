/**
 * head of fasdfs frame
 */
export interface Header {
    length: number,
    status: number,
    cmd: number
}