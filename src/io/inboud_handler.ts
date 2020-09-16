import { EventHandlerContext } from "./context";

/**
 * @description Event handler
 */
export abstract class EventHandler {
    
    public connect(ctx: EventHandlerContext): boolean {
        return true
    }

    public read(ctx: EventHandlerContext, data: Buffer): boolean {
        return true
    }

    public error(ctx: EventHandlerContext, err: Error): boolean {
        return true
    }

    protected removeSelf(ctx: EventHandlerContext) {
        ctx.removeHandler(this)
    }

}