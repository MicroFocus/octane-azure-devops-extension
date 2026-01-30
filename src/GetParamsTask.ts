import {UrlUtils} from "./UrlUtils";
import {LogUtils} from "./LogUtils";
import {SharedSpaceUtils} from "./SharedSpaceUtils";
import {URL} from "url";
import {InputConstants} from "./ExtensionConstants";
import {AuthenticationService} from "./services/security/AuthenticationService";

export class GetParamsTask {
    private readonly tl: any;
    private readonly logger: LogUtils;
    private readonly OCTANE_CLIENT_ID_VAR = "octaneClientId";
    private readonly OCTANE_CLIENT_SECRET_VAR = "octaneClientSecret";
    private readonly OCTANE_URL_VAR = "octaneUrl";
    private readonly OCTANE_SHARED_SPACE_ID_VAR = "octaneSharedSpaceId";

    constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
    }

    public async run() {
        const octaneServiceConnection = this.tl.getInput(InputConstants.OCTANE_SERVICE_CONNECTION, true);

        const authentication =  await this.prepareAuthenticationService(octaneServiceConnection);

        const octaneUrl = this.getOctaneUrl(octaneServiceConnection);
        const sharedSpaceId = this.getSharedSpaceId(octaneServiceConnection);
        const clientId = authentication.clientId;
        const clientSecret = authentication.clientSecret;

        this.tl.setVariable(this.OCTANE_CLIENT_ID_VAR, clientId);
        this.tl.setVariable(this.OCTANE_CLIENT_SECRET_VAR, clientSecret);
        this.tl.setVariable(this.OCTANE_URL_VAR, octaneUrl);
        this.tl.setVariable(this.OCTANE_SHARED_SPACE_ID_VAR, sharedSpaceId);
    }

    private async prepareAuthenticationService(octaneServiceConnection: any) {
        const authenticationService = new AuthenticationService(this.tl, octaneServiceConnection, this.logger);
        const clientId = authenticationService.getOctaneClientId();
        const clientSecret = authenticationService.getOctaneClientSecret();

        return {
            clientId: clientId,
            clientSecret: clientSecret
        };
    }

    private getOctaneUrl(octaneServiceConnection: any): string {
        const url = UrlUtils.getUrlForDiscovery(octaneServiceConnection, this.tl, this.logger);
        this.logger.info("Base URL for discovery: " + url);
        return url;
    }

    private getSharedSpaceId(octaneServiceConnection: any): string {
        const endpointUrl = this.tl.getEndpointUrl(octaneServiceConnection, false);
        let url = new URL(endpointUrl);
        const sharedSpaceId = SharedSpaceUtils.validateOctaneUrlAndExtractSharedSpaceId(url);
        this.logger.info("Shared Space ID for discovery: " + sharedSpaceId);
        return sharedSpaceId;
    }
}

