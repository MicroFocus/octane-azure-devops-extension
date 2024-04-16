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
import {EntityTypeConstants} from "./ExtensionConstants";

import {Octane, Query} from '@microfocus/alm-octane-js-rest-sdk';

export class MetadataUtils {
    public static async enhanceOctaneSDKConnectionWithEntitiesMetadata(octaneSDKConnection) {
        let entitiesMetadataQuery = Query.field('name').equal(EntityTypeConstants.CI_SERVER_ENTITY_TYPE)
            .or().field('name').equal(EntityTypeConstants.PIPELINE_ENTITY_TYPE).build();
        octaneSDKConnection.entitiesMetadata = await octaneSDKConnection
            .get(Octane.entityTypes.entitiesMetadata).query(entitiesMetadataQuery).execute();
    }

    public static async enhanceOctaneSDKConnectionWithFieldsMetadata(octaneSDKConnection) {
        let fieldMetadataQuery = Query.field('entity_name').equal(EntityTypeConstants.CI_SERVER_ENTITY_TYPE)
            .or().field('entity_name').equal(EntityTypeConstants.PIPELINE_ENTITY_TYPE).build();
        octaneSDKConnection.fieldsMetadata = await octaneSDKConnection
            .get(Octane.entityTypes.fieldsMetadata).query(fieldMetadataQuery).execute();
    }
}