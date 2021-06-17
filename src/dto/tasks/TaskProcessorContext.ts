import {LogUtils} from "../../LogUtils";

export class TaskProcessorContext {
    private readonly logger: LogUtils;
    private readonly tl: any;

    constructor(tl: any, logger: LogUtils) {
        this.logger = logger;
        this.tl = tl;
    }

    public getLogger(): LogUtils {
        return this.logger;
    }

    public getTL(): any {
        return this.tl;
    }
}