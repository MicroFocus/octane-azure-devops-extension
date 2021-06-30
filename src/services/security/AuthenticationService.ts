import {LogUtils} from "../../LogUtils";
import {Auth} from "./Auth";
import {AuthScheme} from "./AuthScheme";
import {UsernamePassword} from "./UsernamePassword";
import {ConnectionUtils} from "../../ConnectionUtils";
import {AccessToken} from "./AccessToken";
import {CryptoUtils} from "../../CryptoUtils";

export class AuthenticationService {
    private readonly tl: any;
    private readonly octaneServiceConnectionData: any;
    private readonly logger: LogUtils;
    private readonly octaneAuth: Auth;
    private readonly azureAuth: Auth;

    constructor(tl: any, octaneServiceConnectionData: any, logger: LogUtils) {
        this.tl = tl;
        this.octaneServiceConnectionData = octaneServiceConnectionData;
        this.logger = logger;

        this.octaneAuth = this.getOctaneAuthentication(this.tl, this.octaneServiceConnectionData, this.logger);
        this.azureAuth = ConnectionUtils.getAccessToken(this.tl);
        if(this.azureAuth.scheme === AuthScheme.SYSTEM_ACCESS_TOKEN) {
            this.logger.warn('In order to avoid using system access token, ' +
                'please define Personal Access Token(PAT) with key: AZURE_PERSONAL_ACCESS_TOKEN');
        }
    }

    public getOctaneClientId(): string {
        if(this.octaneAuth.scheme === AuthScheme.USERNAME_PASSWORD) {
            return (this.octaneAuth.parameters as UsernamePassword).username;
        }

        return '';
    }

    public getOctaneClientSecret(): string {
        if(this.octaneAuth.scheme === AuthScheme.USERNAME_PASSWORD) {
            return (this.octaneAuth.parameters as UsernamePassword).password;
        }

        return '';
    }

    public getAzureAccessToken(): string {
        if(this.azureAuth.scheme === AuthScheme.PERSONAL_ACCESS_TOKEN) {
            return (this.azureAuth.parameters as AccessToken).accessToken;
        }

        return '';
    }

    public getAzureSchemeAndAccessToken(): string {
        if(this.azureAuth.scheme === AuthScheme.SYSTEM_ACCESS_TOKEN) {
            return AuthScheme.SYSTEM_ACCESS_TOKEN;
        } else if(this.azureAuth.scheme === AuthScheme.PERSONAL_ACCESS_TOKEN) {
            return AuthScheme.PERSONAL_ACCESS_TOKEN + ': ' + (this.azureAuth.parameters as AccessToken).accessToken;
        }

        return AuthScheme.UNDEFINED + '';
    }

    private getOctaneAuthentication(tl: any, octaneServiceConnectionData: any, logger: LogUtils): Auth {
        let endpointAuth = tl.getEndpointAuthorization(octaneServiceConnectionData, true);
        let username = endpointAuth.parameters['username'];
        let password = endpointAuth.parameters['password'];

        logger.debug('clientId = ' + username);
        logger.debug('clientSecret = ' + CryptoUtils.obfuscate(password));

        return {
            scheme: AuthScheme.USERNAME_PASSWORD,
            parameters: {
                username: username,
                password: password
            }
        }
    }
}