export class FastDfsError extends Error {

    private code: number

    constructor(code: number, msg: string) {
        super(msg)
        this.code = code
    }

    public getErrorCode():number {
        return this.code
    }
}