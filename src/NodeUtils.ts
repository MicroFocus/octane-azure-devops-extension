import {LogUtils} from "./LogUtils";

export class NodeUtils {
    public static outputNodeVersion(tl: any, logger: LogUtils) {
        let result = tl.execSync(`node`, `--version`);
        logger.info('Machine node version: ' + result.stdout);
        logger.info('Actual process.version: ' + process.version);
    }
}