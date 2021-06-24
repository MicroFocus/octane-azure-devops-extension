import {EntityTypeConstants} from './ExtensionConstants';

const Query = require('@microfocus/alm-octane-js-rest-sdk/lib/query');
const OctaneSDK = require('@microfocus/alm-octane-js-rest-sdk').Octane;

export class MetadataUtils {
    public static async enhanceOctaneSDKConnectionWithEntitiesMetadata(octaneSDKConnection) {
        let entitiesMetadataQuery = Query.field('name').equal(EntityTypeConstants.CI_SERVER_ENTITY_TYPE)
            .or().field('name').equal(EntityTypeConstants.PIPELINE_ENTITY_TYPE).build();
        octaneSDKConnection.entitiesMetadata = await octaneSDKConnection
            .get(OctaneSDK.entityTypes.entitiesMetadata).query(entitiesMetadataQuery).execute();
    }

    public static async enhanceOctaneSDKConnectionWithFieldsMetadata(octaneSDKConnection) {
        let fieldMetadataQuery = Query.field('entity_name').equal(EntityTypeConstants.CI_SERVER_ENTITY_TYPE)
            .or().field('entity_name').equal(EntityTypeConstants.PIPELINE_ENTITY_TYPE).build();
        octaneSDKConnection.fieldsMetadata = await octaneSDKConnection
            .get(OctaneSDK.entityTypes.fieldsMetadata).query(fieldMetadataQuery).execute();
    }
}