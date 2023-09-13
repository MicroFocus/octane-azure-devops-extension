/*
 * Copyright 2020-2023 Open Text
 *
 * The only warranties for products and services of Open Text and
 * its affiliates and licensors (“Open Text”) are as may be set forth
 * in the express warranty statements accompanying such products and services.
 * Nothing herein should be construed as constituting an additional warranty.
 * Open Text shall not be liable for technical or editorial errors or
 * omissions contained herein. The information contained herein is subject
 * to change without notice.
 *
 * Except as specifically indicated otherwise, this document contains
 * confidential information and a valid license is required for possession,
 * use or copying. If this work is provided to the U.S. Government,
 * consistent with FAR 12.211 and 12.212, Commercial Computer Software,
 * Computer Software Documentation, and Technical Data for Commercial Items are
 * licensed to the U.S. Government under vendor's standard commercial license.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as azdev from 'azure-devops-node-api';
import {IRequestOptions} from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as tl from 'azure-pipelines-task-lib/task';
import {EndpointDataConstants, InputConstants} from "./ExtensionConstants";
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

        let accessToken = this.getDebugAccessToken(tl);
        if (accessToken) {
            scheme = AuthScheme.PERSONAL_ACCESS_TOKEN;
        } else {
            accessToken = this.getAzurePAT(tl);
            if(accessToken) {
                scheme = AuthScheme.PERSONAL_ACCESS_TOKEN;
            } else {
                accessToken = this.getSystemAccessToken();
                scheme = AuthScheme.SYSTEM_ACCESS_TOKEN;
            }
        }

        return {
            scheme: scheme,
            parameters: {
                accessToken: accessToken
            }
        };
    }

    private static getDebugAccessToken(tl: any) {
        return tl.getVariable(EndpointDataConstants.ENDPOINT_DATA_OCTANE_AZURE_PERSONAL_ACCESS_TOKEN);
    }

    private static getAzurePAT(tl:any) {
        return tl.getInput(InputConstants.AZURE_PAT, false);
    }
}