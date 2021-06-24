import tl = require('azure-pipelines-task-lib/task');
import {EndpointAuthorization} from 'azure-pipelines-task-lib';

export class Utility {

    private static readonly _onlyFirstLine = new RegExp('^.*$', 'm');
    private static readonly _githubPaginatedLinkRegex = new RegExp('^<(.*)>$');
    private static readonly _githubPaginatedRelRegex = new RegExp('^rel="(.*)"$');
    private static readonly _tagRef: string = 'refs/tags/';
    private static readonly _githubApiUrl: string = 'https://api.github.com'; // url without slash at end

    public static getGithubEndPointToken(githubEndpointObject: EndpointAuthorization): string {
        let githubEndpointToken: string = null;

        if (!!githubEndpointObject) {
            tl.debug('Endpoint scheme: ' + githubEndpointObject.scheme);

            if (githubEndpointObject.scheme === 'PersonalAccessToken') {
                githubEndpointToken = githubEndpointObject.parameters.accessToken
            } else if (githubEndpointObject.scheme === 'OAuth') {
                // scheme: 'OAuth'
                githubEndpointToken = githubEndpointObject.parameters.AccessToken
            } else if (githubEndpointObject.scheme === 'Token') {
                githubEndpointToken = githubEndpointObject.parameters.AccessToken
            }
            else if (githubEndpointObject.scheme) {
                throw new Error(tl.loc('InvalidEndpointAuthScheme', githubEndpointObject.scheme));
            }
        }

        if (!githubEndpointToken) {
            throw new Error(tl.loc('InvalidGitHubEndpoint'));
        }

        return githubEndpointToken;
    }

    public static getGitHubApiUrl(): string {
        return this._githubApiUrl; // url without slash at end
    }
}

export class GitHubAttributes {
    public static readonly id: string = 'id';
    public static readonly nameAttribute: string = 'name';
    public static readonly tagName: string = 'tag_name';
    public static readonly uploadUrl: string = 'upload_url';
    public static readonly htmlUrl: string = 'html_url';
    public static readonly assets: string = 'assets';
    public static readonly commit: string = 'commit';
    public static readonly message: string = 'message';
    public static readonly state: string = 'state';
    public static readonly title: string = 'title';
    public static readonly commits: string = 'commits';
    public static readonly files: string = 'files';
    public static readonly filename: string = 'filename';
    public static readonly sha: string = 'sha';
    public static readonly parents: string = 'parents';
    public static readonly behind: string = 'behind';
    public static readonly status: string = 'status';
    public static readonly link: string = 'link';
    public static readonly next: string = 'next';
    public static readonly draft: string = 'draft';
    public static readonly preRelease: string = 'prerelease';
    public static readonly getCommitUrlFormat: string = '%s/repos/%s/commits/%s';

}