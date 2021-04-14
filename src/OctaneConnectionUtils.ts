const OctaneSDK = require('@microfocus/alm-octane-js-rest-sdk').Octane;

export class OctaneConnectionUtils {
    public static getServerUrl(url: URL, customWebContext: string): string {
        let returnURL = url.protocol + '//' + url.hostname + ':' + url.port;

        if(!!customWebContext) {
            returnURL = returnURL + '/' + customWebContext;
        }

        return returnURL;
    }

    public static getNewOctaneSDKConnection(url: URL, customWebContext: string, sharedSpace: string,
                                         workspace: string, clientId: string, clientSecret: string) {
        return new OctaneSDK({
            server: OctaneConnectionUtils.getServerUrl(url, customWebContext),
            sharedSpace: sharedSpace,
            workspace: workspace,
            user: clientId,
            password: clientSecret,
            headers: {
                ALM_OCTANE_TECH_PREVIEW: true
            }
        });
    }
}