/*
 * Copyright 2020-2025 Open Text
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
import {Octane} from "@microfocus/alm-octane-js-rest-sdk";
import {OctaneConnectionUtils} from "../../OctaneConnectionUtils";

export class FeatureToggleService {
    private readonly tl: any;
    private readonly logger: LogUtils;
    private ciInternalAzureApiUrlPart: string;
    private useAzureDevopsParametersInOctane: boolean;
    private readonly octaneVersion: string;

    private readonly AZURE_FEATURE_TOGGLES : string = '/azure_feature_toggles';

    private constructor(tl: any, logger: LogUtils, octaneVersion: string) {
        this.tl = tl;
        this.logger = logger;
        this.octaneVersion = octaneVersion;
    }

    public static async getInstance(tl, logger: LogUtils, sharedSpaceId: string, workspaceId: string, octaneSDKConnection, octaneVersion: string) : Promise<FeatureToggleService> {
        let featureToggleService = new FeatureToggleService(tl, logger, octaneVersion);
        await featureToggleService.init(octaneSDKConnection, sharedSpaceId, workspaceId);
        return featureToggleService;
    }

    protected async init(octaneSDKConnection, sharedSpaceId: string, workspaceId: string) {
        await new Promise<void>(async (resolve, reject) => {
            try {
                if(OctaneConnectionUtils.isVersionGreaterOrEquals(this.octaneVersion, "25.3.24")){
                    this.initCiInternalAzureApiUrl(sharedSpaceId, workspaceId);
                    await this.getUseAzureDevopsParametersOctaneParameter(octaneSDKConnection);
                }
                else
                {
                    this.logger.debug("Octane version is lower than 25.3.24, setting USE_AZURE_DEVOPS_PARAMETERS to false by default.");
                    this.useAzureDevopsParametersInOctane = false;
                }
                resolve();
            } catch (ex) {
                reject(ex);
            }
        }).catch(ex => {
            this.logger.error(ex);
            this.tl.setResult(this.tl.TaskResult.Failed, 'Feature toggle service init task should have passed but failed.');
            throw ex;
        });
    }

    private initCiInternalAzureApiUrl(sharedSpaceId: string, workspaceId: string) {
        this.ciInternalAzureApiUrlPart = '/internal-api/shared_spaces/' + sharedSpaceId + '/workspaces/' + workspaceId + '/analytics/ci';
    }

    public async getUseAzureDevopsParametersOctaneParameter(octaneSDKConnection): Promise<void>{
        const url = this.ciInternalAzureApiUrlPart + this.AZURE_FEATURE_TOGGLES;
        this.logger.debug("Octane endpoint that fetches USE_AZURE_DEVOPS_PARAMETERS parameter: " + url);
        const response = await octaneSDKConnection.executeCustomRequest(url, Octane.operationTypes.get);

        const hasPropertyInResponse = OctaneParametersName.USE_AZURE_DEVOPS_PARAMETERS in response;

        const parameterValue = hasPropertyInResponse
            ? response[OctaneParametersName.USE_AZURE_DEVOPS_PARAMETERS]
            : false;

        this.logger.debug("Octane USE_AZURE_DEVOPS_PARAMETERS parameter value: " + JSON.stringify(parameterValue));

        this.useAzureDevopsParametersInOctane = parameterValue;
    }

    public isUseAzureDevopsParametersInOctaneEnabled(): boolean {
        return this.useAzureDevopsParametersInOctane;
    }
}

enum OctaneParametersName {
    USE_AZURE_DEVOPS_PARAMETERS = "USE_AZURE_DEVOPS_PARAMETERS"
}