import {LogUtils} from "./LogUtils";
import {URL} from "url";
import {OctaneConnectionUtils} from "./OctaneConnectionUtils";

export class PipelinesOrchestratorTask {
    protected logger: LogUtils;

    private tl: any;
    private url: URL;
    private octaneServiceConnectionData: any;
    private customWebContext: string;
    private token: string;
    private sharedSpaceId: string;
    private analyticsCiInternalApiUrlPart: string;
    protected octaneSDKConnection: any;

    constructor(tl: any) {
        this.tl = tl;
        let logLevel = this.tl.getVariable('ALMOctaneLogLevel');
        this.logger = new LogUtils(logLevel);
        this.logger.debug("ALMOctaneLogLevel: " + logLevel);
    }

    public static async instance(tl: any): Promise<PipelinesOrchestratorTask> {
        let task = new PipelinesOrchestratorTask(tl);
        await task.init();

        return task;
    }

    public async run() {
        await new Promise<void>(((resolve, reject) => {
            resolve();
        }));
    }

    protected async init() {
        await new Promise<void>(async (resolve, reject) => {
            try {
                this.outputGlobalNodeVersion();
                this.prepareOctaneServiceConnectionData();
                this.prepareOctaneUrlAndCustomWebContext();
                this.prepareAzureToken();
                this.validateOctaneUrlAndExtractSharedSpaceId();
                this.buildAnalyticsCiInternalApiUrlPart();

                let octaneAuthenticationData: any = this.getOctaneAuthentication();
                await this.createOctaneConnection(octaneAuthenticationData);

                resolve();
            } catch(ex) {
                reject(ex);
            }
        }).catch(ex => {
            this.logger.error(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'Pipelines Orchestrator initialization failed');

            throw ex;
        });
    }

    private async createOctaneConnection(octaneAuthenticationData: any) {
        this.octaneSDKConnection = OctaneConnectionUtils.getNewOctaneSDKConnection(this.url,
            this.customWebContext, this.sharedSpaceId, '500', octaneAuthenticationData.clientId, octaneAuthenticationData.clientSecret);

        await this.octaneSDKConnection._requestHandler.authenticate();

        let serverConnectivityStatusObj = await this.octaneSDKConnection._requestHandler._requestor.get(this.analyticsCiInternalApiUrlPart + '/servers/connectivity/status');

        this.logger.info('Server connectivity status:' + JSON.stringify(serverConnectivityStatusObj));
    }

    private outputGlobalNodeVersion() {
        let result = this.tl.execSync(`node`, `--version`);
        this.logger.info('node version = ' + result.stdout);
    }

    private prepareOctaneServiceConnectionData() {
        this.octaneServiceConnectionData = this.tl.getInput('OctaneServiceConnection', true);
        this.logger.info('OctaneService = ' + this.octaneServiceConnectionData);
    }

    private prepareOctaneUrlAndCustomWebContext() {
        let endpointUrl = this.tl.getEndpointUrl(this.octaneServiceConnectionData, false);
        this.url = new URL(endpointUrl);

        this.logger.info('rawUrl = ' + endpointUrl + '; url.href = ' + this.url.href);

        this.customWebContext = this.url.pathname.toString().split('/ui/')[0].substring(1);
        this.logger.info('customWebContext = ' + this.customWebContext);
    }

    private prepareAzureToken() {
        this.token = this.tl.getEndpointDataParameter(this.octaneServiceConnectionData,
            'AZURE_PERSONAL_ACCESS_TOKEN', true);
        this.logger.debug('token = ' + this.token);
    }

    private validateOctaneUrlAndExtractSharedSpaceId() {
        let paramsError = 'shared space and workspace must be a part of the Octane server URL. For example: https://octane.example.com/ui?p=1001/1002';
        let params = this.url.searchParams.get('p');
        if (params === null) {
            throw new Error(paramsError);
        }

        const spaces = params.match(/\d+/g);
        if (!spaces || spaces.length < 1) {
            throw new Error(paramsError);
        }

        this.sharedSpaceId = spaces[0];
    }

    private buildAnalyticsCiInternalApiUrlPart() {
        this.analyticsCiInternalApiUrlPart = '/internal-api/shared_spaces/' + this.sharedSpaceId + '/analytics/ci';
    }

    private getOctaneAuthentication(): object {
        let endpointAuth = this.tl.getEndpointAuthorization(this.octaneServiceConnectionData, false);
        let clientId = endpointAuth.parameters['username'];
        let clientSecret = endpointAuth.parameters['password'];

        this.logger.debug('clientId = ' + clientId);
        this.logger.debug('clientSecret = ' + this.getObfuscatedSecretForLogger(clientSecret));

        return {
            clientId,
            clientSecret
        }
    }

    private getObfuscatedSecretForLogger(str: string) {
        return str.substr(0, 3) + '...' + str.substr(str.length - 3);
    }
}