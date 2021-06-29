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