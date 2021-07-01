import {URL} from "url";
import {LogUtils} from "./LogUtils";

export class UrlUtils {
    public static getUrlAndCustomWebContext(octaneServiceConnectionData: any, tl: any, logger: LogUtils) {
        let endpointUrl = tl.getEndpointUrl(octaneServiceConnectionData, false);
        let url = new URL(endpointUrl);

        let customWebContext = url.pathname.toString().split('/ui/')[0].substring(1);

        logger.info('rawUrl = ' + endpointUrl + '; url.href = ' + url.href);
        logger.info('customWebContext = ' + customWebContext);

        return {
            url: url,
            customWebContext: customWebContext
        }
    }
}