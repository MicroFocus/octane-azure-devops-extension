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