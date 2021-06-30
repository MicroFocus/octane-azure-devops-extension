import {AuthScheme} from "./AuthScheme";
import {UsernamePassword} from "./UsernamePassword";
import {AccessToken} from "./AccessToken";

export interface Auth {
    parameters: UsernamePassword | AccessToken;
    scheme: AuthScheme;
}