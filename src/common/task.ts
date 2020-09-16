import { Header } from "../protocol/header"
/**
 * @description task
 * @author      kesanzz
 */
export interface Task {
    request:   () => void
    response?: (err: Error, header?: Header, payload?: Buffer) => void
}
