export class LogUtils {

    private readonly isDebug: boolean;

    constructor(config: string) {
        this.isDebug = config === 'DEBUG';
    }

    public debug(message: any, caller?: any, ...optionalParams: any[]): void {
        if (this.isDebug) {
            this.logMessage('DEBUG', message, caller, optionalParams);
        }
    }

    public info(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('INFO', message, caller, optionalParams);
    }

    public error(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('ERROR', message, caller, optionalParams);
    }

    public warn(message: any, caller?: any, ...optionalParams: any[]): void {
        this.logMessage('WARN', message, caller, optionalParams);
    }

    private logMessage(msgType: 'DEBUG' | 'ERROR' | 'WARN' | 'INFO', msg: any, caller?: any, ...optionalParams: any[]): void {
        if (typeof msg !== 'string') {
            try {
                msg = JSON.stringify(msg);
            } catch(ex) {
                console.info('Could not stringify object, calling console.log instead');
                console.log(msg);
                return;
            }
        }

        msg = caller ? caller + '| ' + msg : msg;
        msg = '[' + msgType + ']' + msg;
        let logFunction = (console[msgType.toLowerCase()] || console.log).bind(console);
        if (optionalParams.toString().length > 0) {
            logFunction(msg, optionalParams);
        } else {
            logFunction(msg);
        }
    }

    public getCaller() {
        return ((new Error().stack).split("at ")[2]).trim();
    }
}