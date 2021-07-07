import {LogUtils} from "../../LogUtils";
import {AuthenticationService} from "../../services/security/AuthenticationService";

export class TaskProcessorContext {
    private readonly logger: LogUtils;
    private readonly tl: any;
    private readonly authenticationService: AuthenticationService;

    constructor(tl: any, logger: LogUtils, authenticationService: AuthenticationService) {
        this.logger = logger;
        this.tl = tl;
        this.authenticationService = authenticationService;
    }

    public getLogger(): LogUtils {
        return this.logger;
    }

    public getTL(): any {
        return this.tl;
    }

    public getAuthenticationService(): AuthenticationService {
        return this.authenticationService;
    }
}