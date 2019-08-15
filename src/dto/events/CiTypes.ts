export const enum CiEventType {
    UNDEFINED = 'undefined',
    QUEUED = 'queued',
    STARTED = 'started',
    FINISHED = 'finished',
    SCM = 'scm',
    DELETED = 'deleted'
}

export const enum CiCausesType {
    TIMER = 'timer',
    USER = 'user',
    SCM = 'scm',
    UPSTREAM = 'upstream',
    UNDEFINED = 'undefined'
}

export const enum PhaseType {
    POST = 'post',
    INTERNAL = 'internal'
}

export const enum Result {
    SUCCESS = 'success',
    ABORTED = 'aborted',
    UNSTABLE = 'unstable',
    UNAVAILABLE = 'unavailable'
}

export const enum SCMType {
    UNKNOWN = 'unknown',
    GIT = 'git',
    SVN = 'svn'
}