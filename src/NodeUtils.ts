import {LogUtils} from "./LogUtils";

export class NodeUtils {
    public static outputNodeVersion(tl: any, logger: LogUtils) {
        try {
            let result = tl.execSync(`node`, `--version`);
            logger.info('Machine node version: ' + result.stdout);
        } catch (e) {
            logger.error('Failed to get agent node js version error: ' + e );
        }
        logger.info('Actual process.version(Agent node version in Azure DevOps): ' + process.version);
    }
}