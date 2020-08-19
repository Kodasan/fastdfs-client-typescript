import { Task, Header } from "./protocol";

export abstract class AbstractCommandQuque {

    private tasks: Array<Task> = []
    private current: Task

    protected submit(task: Task): void {
        if (this.current == null) {
            this.current = task
            setTimeout(() => {
                task.request()
            }, 0)
        } else {
            this.tasks.push(task)
        }
    }

    protected handleResponse(header: Header, data: Buffer) {
        if (this.current.response != null) {
            this.current.response(null, header, data)
        }
        this.nextTask()
    }

    protected nextTask(): void { 
        if (this.tasks.length < 1) {
            return
        }
        let task = this.tasks.shift()
        this.current = task
        setTimeout(() => {
            task.request()
        }, 0)
    }
    
}