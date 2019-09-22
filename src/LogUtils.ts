export class LogUtils {
    public static debug(message: any, caller?: any, ...optionalParams: any[]): void {
        if (process.env.ALMOctaneExtentionConf === 'debug') {
            this.logMessage('DEBUG', message, caller, optionalParams);
        }
    }

    public static info(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('INFO', message, caller, optionalParams);
    }

    public static error(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('ERROR', message, caller, optionalParams);
    }

    public static warn(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('WARN', message, caller, optionalParams);
    }

    private static logMessage(msgType: 'DEBUG' | 'ERROR' | 'WARN' | 'INFO', msg: any, caller?: any, ...optionalParams: any[]): void {
        if (typeof msg !== 'string') {
            msg = JSON.stringify(msg);
        }
        msg = caller ? caller + '| ' + msg : msg;
        msg = '[' + msgType + ']' + msg;
        if (optionalParams.toString().length > 0) {
            console.log(msg, optionalParams);
        } else {
            console.log(msg);
        }
    }

    public static getCaller() {
        return ((new Error().stack).split("at ")[2]).trim();
    }
}