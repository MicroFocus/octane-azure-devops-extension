export const enum TestRunStatus {
    PASSED = 'Passed',
    FAILED = 'Failed',
    SKIPPED = 'Skipped'
}

export const enum Framework {
    JUNIT = 'junit',
    TEST_NG = 'testng',
    UFT = 'uft',
    NUNIT = 'nunit',
    JBEHAVE = 'jbehave',
    KARMA = 'karma',
    JASMINE = 'jasmine',
    MOCHA = 'mocha',
    CUCUMBER = 'cucumber'
}

export const enum TestFieldNames {
    FRAMEWORK = 'Framework',
    TEST_LEVEL = 'Test_Level'
}