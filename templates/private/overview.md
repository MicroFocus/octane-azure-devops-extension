# ALM Octane Integration with Azure DevOps Services
## 0.4.2.112 version Release notes
* Added support for aborted pipeline runs
* Secret variables set in Azure DevOps will not be shown in Octane
## 0.4.2.94 version Release notes
* Added project name into pipeline name
## 0.4.2.92 version Release notes
* Upgraded ALM Octane Js SDK Version
## 0.4.2.88 version Release notes
* Fix defects
## 0.4.2.86 version Release notes
* Add option to define pipeline name created on ALM Octane or use pipeline's full folder path.
* Fix issue that not all test result was sent to ALM Octane.
* Fix issue that test result was sent without escape characters. 
## 0.4.2.67 version Release notes
* Added support to Testing Framework for running test using test runners starting from version 23.4 of ALM Octane.  
* Added possibility to skip creation of ALM Octane pipelines starting from version 23.4 of ALM Octane.
* Rebranding to Open Text
## 0.4.2.41 version Release notes
* Fix defects
* Fix Documentation
## 0.4.2.38 version Release notes
* Fix defects
## 0.4.2.36 version Release notes
* Fix defects
## 0.4.2.32 version Release notes
* Fix test run report path that send to Octane, supported from version 16.1.100 of Octane
## 0.4.2.31 version Release notes
* Merge of versions 0.4.2.21 and 0.4.2.22 
## 0.4.2.22 version Release notes
* Added support for multi-branch pipelines:  
ALM Octane automatically creates a corresponding child pipeline whenever a new branch is built for the first time.   
Existing pipelines are upgraded to be multi-branch.
## 0.4.2.21 version Release notes
* Fix defects
## 0.4.2.14 version Release notes
* Send parameters structure to Octane, from version 16.1.18.
* Send parameters values executed to Octane, from version 16.1.18.
* Fix defects
## 0.4.2.5 version Release notes
* Update Octane CI Server plugin version.
* Ability to run Azure DevOps pipelines from within ALM Octane, from version 16.0.400.
## 0.4.1.16 version Release notes
* Report to Octane duration of the pipeline run
## 0.4.1.13 version Release notes
* handle multi changes per commit
* report to Octane max number of commits the Azure devops API return
## 0.4.1.5 version Release notes
* Fix issue with unknown change type on commits, and added logs
 
## 0.4.1.4 version Release notes
* Added support for Gherkin injection
* Various other improvements, including bug fixes and logs

## 0.3.5.1 version Release notes
* Removed the pipeline decorators as they work only in private and cannot be customized for individual pipelines, this making the whole organization's pipelines generate pipelines in Octane.
* Fixed 401 error in tasks not showing as failed
* Homogenized public and private extensions. Currently, besides Azure DevOps required manifests and versions there will not be any difference between the private and the public extension.
* Other non functional improvements

## General information

* An Azure DevOps Services account normally implies an organization level.
* Every account (organization) may have one or more projects.
* Every project may have one or more pipelines.
* Every pipeline consists of one or more jobs that may run in parallel.
* Every job is a sequence of one or more tasks.
* Every task is an activity executed during the run of the job containing it. A task can be written in a variety of programming/scripting languages and can be a part of either the Azure DevOps Services framework or an extension.
* The only unit of an executable code that an extension can contribute to the Azure DevOps Services framework is a task that is normally executed during a pipeline run. The task can be integrated into existing jobs or can be added to the pipeline under a separate job.

## The integration
* The integration was implemented by developing an Azure DevOps Services extension with the following contributions:
  1. A new service connection type (ALM Octane Service Connection). By creating an a service connection of this type the user provides the properties of an ALM Octane Workspace (Connection name, URL, instance ID, shared space ID, workspace ID, API client ID and secret). This instance is then used by Azure DevOps pipelines for notifying the workspace with the events and data specified above.
  2. Two new task types (“ALM Octane Job Start” and “ALM Octane Job End”), instances of which must be added to every job in the pipeline at the appropriate locations – the start and the end points of every job by the client itself, either through YAML or Legacy drag&drop process

 ### The workflow for establishing a successful integration between an ALM Octane workspace and an Azure DevOps Services project
 1. In the Azure DevOps organization you must install the ALM Octane Integration Extension.
 2. In the ALM Octane shared space: Create an API client ID and secret with the “CI/CD Integration” role over the target ALM Octane workspace.
 3. In the target Azure DevOps project:
     1. Create a new ALM Octane Service Connection by providing all the required settings. Let’s assume the connection name is OctaneCon.
     2. Let’s assume your pipeline consists of the following jobs: A, B, and you created the pipeline through the YAML editor (The same steps should apply with classic editor, just without manual editing). You must add 2 extra jobs to the pipeline: one to the pipeline beginning and the other to the pipeline end. These jobs must have the following names: AlmOctanePipelineStart and AlmOctanePipelineEnd. They must be set to always run (independently of the status of any other jobs). Moreover, the AlmOctanePipelineEnd must wait until all the other jobs will finish, even if the other jobs run in parallel. The best way to ensure this is by setting it as dependent on the other jobs. Thus the final version of our AlmOctanePipelineEnd job will be:
           ```
           - job: AlmOctanePipelineEnd
             condition: always()
             dependsOn:
             - AlmOctanePipelineStart
             - A
             - B      
           ```
           On the other hand, we want to let the AlmOctanePipelineStart to always run first. <br />
     Therefore we need to force the other jobs to depend on it:
        ```
        - job: A
          dependsOn:
          - AlmOctanePipelineStart
        ```    
        The final version of our pipeline should be similar to the figure below. After it runs, the appropriate “CI server” and “Pipeline” entries will be created in ALM Octane (if they don’t already exist), and the pipeline UI will reflect all the regular properties related to the pipeline run: its progress, topology, status, related source control commits, and test results.
        ```
        jobs:
        - job: AlmOctanePipelineStart
          condition: always()
          steps:
          - task: octane-start-task@1
            inputs:
              OctaneServiceConnection: 'OctaneCon'
              WorkspaceList: 'YOUR_COMMA_SEPARATED_WORKSPACE_IDS'
          
        - job: A
          dependsOn: AlmOctanePipelineStart
          steps:
          - bash: echo "A"
        
        - job: B
          dependsOn: AlmOctanePipelineStart
          pool:
            vmImage: 'ubuntu-latest'
          steps:
          - task: Maven@3
            inputs:
              mavenPomFile: 'pom.xml'
              mavenOptions: '-Xmx3072m'
              javaHomeOption: 'JDKVersion'
              jdkVersionOption: '1.8'
              jdkArchitectureOption: 'x64'
              publishJUnitResults: true
              testResultsFiles: '**/surefire-reports/TEST-*.xml'
              goals: 'package'
        
        - job: AlmOctanePipelineEnd
          condition: always()
          dependsOn:
          - AlmOctanePipelineStart
          - A
          - B
          steps:
          - task: octane-end-task@1
            inputs:
              OctaneServiceConnection: 'OctaneCon'
              WorkspaceList: 'YOUR_COMMA_SEPARATED_WORKSPACE_IDS'
        ```