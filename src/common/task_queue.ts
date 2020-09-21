import { Header }         from "../protocol/header"
import { Task }           from "./task"
import { TaskQueueState } from "./task_queue_state"

/**
 * @description task queue
 * @author      kesanzz
 */
export abstract class TaskQueue {

    protected tasks:      Array<Task>
    protected execute:    Task
    protected state:      TaskQueueState
    protected fatalError: Error

    constructor() {
        this.state = TaskQueueState.WAITING
        this.tasks = new Array<Task>()
    }

    protected _submit(task: Task): this {
        if (this.state == TaskQueueState.REJECT) {
            let fatalError = this.fatalError
            process.nextTick(() => {
                if (task.response) {
                    task.response(fatalError)
                }
            })          
            return this
        }
        if (this.state == TaskQueueState.CLOSED) {
            process.nextTick(() => { 
                if (task.response) {
                    task.response(new Error('client already closed'))
                }
            })
            return this
        }
        if (this.state == TaskQueueState.WAITING) {
            this.tasks.push(task)
            return this
        }
        if (this.execute == null) {
            this.execute = task
            process.nextTick(() => task.request())
            return this
        }
        this.tasks.push(task)
        return this
    }

    protected _response(error:Error, header?: Header, data?: Buffer): this {
        if (this.execute != null && this.execute.response != null) {
            this.execute.response(error, header, data)
        }
        // if decide to reject all task, we cannot invoke netxt task
        if (this.state == TaskQueueState.REJECT) {
            return
        }
        this._next()
        return this
    }

    protected _next(): this {
        if (this.tasks.length == 0) {
            return
        }        
        let task     = this.tasks.shift()
        this.execute = task
        process.nextTick(() => task.request())
        return this
    }

    protected _reject(err: Error): this {
        this.fatalError = err
        this.state      = TaskQueueState.REJECT
        this._rejectAllTask()
        return this
    }

    protected _rejectAllTask(): this {
        let fatalError = this.fatalError
        if (this.execute != null && this.execute.response != null) {
            process.nextTick(() => this.execute.response(fatalError))
        }
        // reject all tasks
        let rejectedTask = this.tasks
        // help release memory
        this.tasks       = null
        rejectedTask.forEach(task => {
            process.nextTick(() => task.response(fatalError))
        })
        return this
    }

    protected _activeTaskQueue() {
        this.state = TaskQueueState.ACCEPT
        this._next()
    }

    protected _closeTaskQueue() {
        this.state = TaskQueueState.CLOSED
    }


    protected getState(): TaskQueueState {
        return this.state
    }

}