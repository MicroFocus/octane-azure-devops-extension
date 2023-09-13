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
import * as fs from "fs";
const TOML = require('@ltd/j-toml');
import {DebugConf, DebugConfToDebugMapsConverter} from "./debug-conf";

export function initDebugConfFromInputParametersFile(): DebugConf {
    let confFilePath: string = '';

    for(let arg in process.argv) {
        if(process.argv[arg].includes("debugConf")) {
            confFilePath = process.argv[arg];
        }
    }

    if(confFilePath.length == 0) {
        throw new Error("No 'debugConf' parameter file specified. Please look into ../../conf folder for an example and provide one");
    }

    confFilePath = confFilePath.split('=')[1];

    let buffer = fs.readFileSync(confFilePath);
    let confData = TOML.parse(buffer, 1.0, '\n', false);
    console.log(confData);

    let conf = DebugConfToDebugMapsConverter.convert(confData);
    return conf;
}