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
import tl = require("azure-pipelines-task-lib/task");
import {EndpointAuthorization} from "azure-pipelines-task-lib";

export class Utility {

    private static readonly _onlyFirstLine = new RegExp("^.*$", "m");
    private static readonly _githubPaginatedLinkRegex = new RegExp("^<(.*)>$");
    private static readonly _githubPaginatedRelRegex = new RegExp('^rel="(.*)"$');
    private static readonly _tagRef: string = "refs/tags/";
    private static readonly _githubApiUrl: string = "https://api.github.com"; // url without slash at end

    public static getGithubEndPointToken(githubEndpointObject: EndpointAuthorization): string {
        let githubEndpointToken: string = null;

        if (!!githubEndpointObject) {
            tl.debug("Endpoint scheme: " + githubEndpointObject.scheme);

            if (githubEndpointObject.scheme === 'PersonalAccessToken') {
                githubEndpointToken = githubEndpointObject.parameters.accessToken
            } else if (githubEndpointObject.scheme === 'OAuth') {
                // scheme: 'OAuth'
                githubEndpointToken = githubEndpointObject.parameters.AccessToken
            } else if (githubEndpointObject.scheme === 'Token') {
                githubEndpointToken = githubEndpointObject.parameters.AccessToken
            }
            else if (githubEndpointObject.scheme) {
                throw new Error(tl.loc("InvalidEndpointAuthScheme", githubEndpointObject.scheme));
            }
        }

        if (!githubEndpointToken) {
            throw new Error(tl.loc("InvalidGitHubEndpoint"));
        }

        return githubEndpointToken;
    }

    public static getGitHubApiUrl(): string {
        return this._githubApiUrl; // url without slash at end
    }
}

export class GitHubAttributes {
    public static readonly id: string = "id";
    public static readonly nameAttribute: string = "name";
    public static readonly tagName: string = "tag_name";
    public static readonly uploadUrl: string = "upload_url";
    public static readonly htmlUrl: string = "html_url";
    public static readonly assets: string = "assets";
    public static readonly commit: string = "commit";
    public static readonly message: string = "message";
    public static readonly state: string = "state";
    public static readonly title: string = "title";
    public static readonly commits: string = "commits";
    public static readonly files: string = "files";
    public static readonly filename: string = "filename";
    public static readonly sha: string = "sha";
    public static readonly parents: string = "parents";
    public static readonly behind: string = "behind";
    public static readonly status: string = "status";
    public static readonly link: string = "link";
    public static readonly next: string = "next";
    public static readonly draft: string = "draft";
    public static readonly preRelease: string = "prerelease";
    public static readonly getCommitUrlFormat: string = "%s/repos/%s/commits/%s";
    public static readonly previousFile: string = "previous_filename";

}