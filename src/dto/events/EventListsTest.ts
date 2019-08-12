import {CiEventsList} from './CiEventsList';

const jsonObject: object = {
    'server': {
        'type': 'custom',
        'suspended': false,
        'version': '1.1.1',
        'url': 'http://localhost:9999',
        'instanceId': '3a2dadcb-fc2a-443d-a7b3-1a07e795e0a8',
        'instanceIdFrom': null,
        'impersonatedUser': null,
        'sendingTime': 1564034979977
    },
    'events': [
        {
            'eventType': 'started',
            'buildCiId': '1',
            'project': 'job-a',
            'parentCiId': null,
            'multiBranchType': null,
            'number': null,
            'causes': null,
            'parameters': null,
            'result': null,
            'startTime': 1564034978370,
            'estimatedDuration': null,
            'duration': null,
            'scmData': null,
            'testResultExpected': null,
            'projectDisplayName': null,
            'phaseType': null,
            'commonHashId': null,
            'branchName': null
        },
        {
            'eventType': 'scm',
            'buildCiId': '1',
            'project': 'job-a',
            'parentCiId': null,
            'multiBranchType': null,
            'number': null,
            'causes': null,
            'parameters': null,
            'result': null,
            'startTime': null,
            'estimatedDuration': null,
            'duration': null,
            'scmData': {
                'repository': {
                    'type': 'git',
                    'url': 'http://github.org',
                    'branch': 'master'
                },
                'builtRevId': '21d9f3cd-ad38-426d-a65a-b6c7c59c3cb2',
                'commits': null,
                'fileBlameList': null
            },
            'testResultExpected': null,
            'projectDisplayName': null,
            'phaseType': null,
            'commonHashId': null,
            'branchName': null
        },
        {
            'eventType': 'finished',
            'buildCiId': '1',
            'project': 'job-a',
            'parentCiId': null,
            'multiBranchType': null,
            'number': null,
            'causes': null,
            'parameters': null,
            'result': null,
            'startTime': null,
            'estimatedDuration': null,
            'duration': 3000,
            'scmData': null,
            'testResultExpected': null,
            'projectDisplayName': null,
            'phaseType': null,
            'commonHashId': null,
            'branchName': null
        }
    ]
};

let ciEventsList: CiEventsList = JSON.parse(JSON.stringify(jsonObject), CiEventsList.reviver);
console.log(ciEventsList);
console.log(JSON.stringify(ciEventsList));
let jsonObjectConverted = ciEventsList.toJSON();
console.log(JSON.stringify(jsonObjectConverted));