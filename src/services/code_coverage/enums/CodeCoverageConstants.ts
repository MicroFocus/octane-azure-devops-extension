/*
 * Copyright 2020-2026 Open Text
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

export enum CoverageReportType {
    JACOCOXML = "jacocoxml",
    LCOV = "lcov",
    SONARQUBE = "sonar_report",
}

export function parseCoverageReportType(value: string): CoverageReportType | null {
    if (!value) {
        return null;
    }

    const normalized = value.toLowerCase();

    const values = Object.values(CoverageReportType);

    return values.includes(normalized as CoverageReportType)
        ? (normalized as CoverageReportType)
        : null;
}

export enum CoverageFilePattern {
    JACOCO = 'jacoco',
    JACOCO_EXTENSION = '.xml',
    LCOV = 'lcov',
    LCOV_EXTENSION = '.info'
}

export enum EncodingType {
    BASE64 = 'base64',
    UTF8 = 'utf8'
}

export enum CoverageUrlParam {
    COVERAGE_PATH = '/coverage',
    CI_SERVER_IDENTITY = 'ci-server-identity',
    CI_JOB_ID = 'ci-job-id',
    CI_BUILD_ID = 'ci-build-id',
    FILE_TYPE = 'file-type',
    CI_JOB_ENCODING = 'ci-job-encoding'
}

export enum SonarQubeInjectedVariables {
    SONAR_HOST_URL = 'sonar.host.url',
    SONAR_LOGIN = 'sonar.login',
    SONAR_PROJECT_KEY = 'sonar.projectKey'
}

export enum SonarCodeCoverageFetchParameters {
    LINES_TO_COVER = 'lines_to_cover',
    UNCOVERED_LINES = 'uncovered_lines',
    FIL = 'FIL', // file qualifier
    TRK = 'TRK', // base component qualifier
    PAGE_SIZE = '500'
}