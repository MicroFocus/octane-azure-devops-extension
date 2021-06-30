import * as azdev from 'azure-devops-node-api';
import {IRequestOptions} from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as tl from 'azure-pipelines-task-lib/task';
import {EndpointDataConstants} from "./ExtensionConstants";
import {Auth} from "./services/security/Auth";
import {AuthScheme} from "./services/security/AuthScheme";

export class ConnectionUtils {
    public static async getAzureDevOpsConnection(token: string, orgUrl: string): Promise<azdev.WebApi> {
        let authHandler = await azdev.getPersonalAccessTokenHandler(token);
        let connection = await new azdev.WebApi(orgUrl, authHandler);
        return connection;
    }

    public static getWebApiWithProxy(serviceUri: string, accessToken?: string): azdev.WebApi {
        if (!accessToken) {
            accessToken = this.getSystemAccessToken();
        }

        const credentialHandler = azdev.getBasicHandler('vsts', accessToken);
        const options: IRequestOptions = {
            proxy: tl.getHttpProxyConfiguration(serviceUri),
            allowRetries: true,
            maxRetries: 5
        };
        return new azdev.WebApi(serviceUri, credentialHandler, options);
    }

    private static getSystemAccessToken(): string {
        tl.debug('Getting credentials for local feeds');
        const auth = tl.getEndpointAuthorization('SYSTEMVSSCONNECTION', false);
        if (auth.scheme === 'OAuth') {
            tl.debug('Got auth token');
            return auth.parameters['AccessToken'];
        } else {
            tl.warning('Could not determine credentials to use');
        }
    }

    public static getAccessToken(tl: any): Auth {
        let scheme: AuthScheme;

        let accessToken = tl.getVariable(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);
        if (accessToken) {
            scheme = AuthScheme.PERSONAL_ACCESS_TOKEN;
        } else {
            accessToken = this.getSystemAccessToken();
            scheme = AuthScheme.SYSTEM_ACCESS_TOKEN;
        }

        return {
            scheme: scheme,
            parameters: {
                accessToken: accessToken
            }
        };
    }
}