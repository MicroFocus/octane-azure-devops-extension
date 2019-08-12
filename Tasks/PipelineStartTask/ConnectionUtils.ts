import {WebApi} from "azure-devops-node-api";
import * as azdev from "azure-devops-node-api";

export class ConnectionUtils {
    public static async getAzureDevopsConnection(token: string, orgUrl: string): Promise<WebApi> {
        let authHandler = await azdev.getPersonalAccessTokenHandler(token);
        let connection = await new azdev.WebApi(orgUrl, authHandler);
        return connection;
    }
}