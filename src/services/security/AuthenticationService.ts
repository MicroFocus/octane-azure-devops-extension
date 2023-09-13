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
import {LogUtils} from "../../LogUtils";
import {Auth} from "./Auth";
import {AuthScheme} from "./AuthScheme";
import {UsernamePassword} from "./UsernamePassword";
import {ConnectionUtils} from "../../ConnectionUtils";
import {AccessToken} from "./AccessToken";
import {CryptoUtils} from "../../CryptoUtils";

export class AuthenticationService {
    private readonly tl: any;
    private readonly octaneServiceConnectionData: any;
    private readonly logger: LogUtils;
    private readonly octaneAuth: Auth;
    private readonly azureAuth: Auth;

    constructor(tl: any, octaneServiceConnectionData: any, logger: LogUtils) {
        this.tl = tl;
        this.octaneServiceConnectionData = octaneServiceConnectionData;
        this.logger = logger;

        this.octaneAuth = this.getOctaneAuthentication(this.tl, this.octaneServiceConnectionData, this.logger);
        this.azureAuth = ConnectionUtils.getAccessToken(this.tl);

        logger.info(this.getAzureSchemeAndObfuscatedAccessTokenString());

        if(this.azureAuth.scheme === AuthScheme.SYSTEM_ACCESS_TOKEN) {
            this.logger.warn('System access token is usable only in current repository/pipeline. ' +
                'Please define Personal Access Token(PAT) for access to all pipelines and repositories');
        }
    }

    public getOctaneClientId(): string {
        if(this.octaneAuth.scheme === AuthScheme.USERNAME_PASSWORD) {
            return (this.octaneAuth.parameters as UsernamePassword).username;
        }

        return '';
    }

    public getOctaneClientSecret(): string {
        if(this.octaneAuth.scheme === AuthScheme.USERNAME_PASSWORD) {
            return (this.octaneAuth.parameters as UsernamePassword).password;
        }

        return '';
    }

    public getAzureAccessToken(): string {
        if(this.azureAuth.scheme === AuthScheme.PERSONAL_ACCESS_TOKEN) {
            return (this.azureAuth.parameters as AccessToken).accessToken;
        } else if(this.azureAuth.scheme == AuthScheme.SYSTEM_ACCESS_TOKEN) {
            return (this.azureAuth.parameters as AccessToken).accessToken;
        }

        return '';
    }

    public getAzureSchemeAndAccessToken(): string {
        if(this.azureAuth.scheme === AuthScheme.SYSTEM_ACCESS_TOKEN) {
            return AuthScheme.SYSTEM_ACCESS_TOKEN;
        } else if(this.azureAuth.scheme === AuthScheme.PERSONAL_ACCESS_TOKEN) {
            return AuthScheme.PERSONAL_ACCESS_TOKEN + ': ' + (this.azureAuth.parameters as AccessToken).accessToken;
        }

        return AuthScheme.UNDEFINED + '';
    }

    public getAzureSchemeAndObfuscatedAccessTokenString() {
        if(this.azureAuth.scheme === AuthScheme.SYSTEM_ACCESS_TOKEN) {
            return AuthScheme.SYSTEM_ACCESS_TOKEN;
        } else if(this.azureAuth.scheme === AuthScheme.PERSONAL_ACCESS_TOKEN) {
            return AuthScheme.PERSONAL_ACCESS_TOKEN + ': ' + CryptoUtils.obfuscate((this.azureAuth.parameters as AccessToken).accessToken);
        }

        return AuthScheme.UNDEFINED + '';
    }

    private getOctaneAuthentication(tl: any, octaneServiceConnectionData: any, logger: LogUtils): Auth {
        let endpointAuth = tl.getEndpointAuthorization(octaneServiceConnectionData, true);
        let username = endpointAuth.parameters['username'];
        let password = endpointAuth.parameters['password'];

        logger.debug('clientId = ' + username);
        logger.debug('clientSecret = ' + CryptoUtils.obfuscate(password));

        return {
            scheme: AuthScheme.USERNAME_PASSWORD,
            parameters: {
                username: username,
                password: password
            }
        }
    }
}