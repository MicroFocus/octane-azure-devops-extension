## 1. Introduction

In the following documentation, the **OpenText Core Software Delivery Platform** and **OpenText Software Delivery Management** will collectively be referred to as 'the product'.

This is a custom plugin which facilitates communication between Azure DevOps and the product (formally known as ALM Octane/ValueEdge) regarding CI/CD.
The extension will monitor and reflect the pipeline activity into the product.

## 2. Table of Contents

- [1. Introduction](#1-introduction)
- [2. Table of Contents](#2-table-of-contents)
- [3. Requirements](#3-requirements)
- [4. Extension configuration](#4-extension-configuration)
    - [4.1. How to install the Azure DevOps ALM Octane extension from Marketplace](#41-how-to-install-the-azure-devops-alm-octane-extension-from-marketplace)
    - [4.2. How to add an API Access Key in Octane for Azure Service Connection ](#42-how-to-add-an-api-access-key-in-octane-for-azure-service-connection)
    - [4.3. How to create a new service connection](#43-how-to-create-a-new-service-connection)
- [5. Pipeline interaction](#5-pipeline-interaction)
    - [5.1. Create a new pipeline with the Octane start and end tasks through YAML editing (implicit Azure job)](#51-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-yaml-editing-implicit-azure-job)
    - [5.2. Create a new pipeline with the Octane start and end tasks through classic editor (implicit Azure job)](#52-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-classic-editor-implicit-azure-job)
    - [5.3. Create a new pipeline with the Octane start and end tasks through YAML editing (explicit Azure jobs)](#53-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-yaml-editing-explicit-azure-jobs)
- [6. Displaying Cucumber Gherkin test results into Octane](#6-displaying-cucumber-gherkin-test-results-into-octane)
    - [6.1. Displaying Cucumber Gherkin test results into Octane using yml editor](#61-displaying-cucumber-gherkin-test-results-into-octane-using-yml-editor)
    - [6.2. Displaying Cucumber Gherkin test results into Octane using classic editor](#62-displaying-cucumber-gherkin-test-results-into-octane-using-classic-editor)
- [7. Configuring test runner pipeline](#7-configuring-test-runner-pipeline)
- [8. Useful Configurations](#8-useful-configurations)
    - [8.1. Running pipelines from octane](#81-running-pipelines-from-octane)
    - [8.2. Running pipelines with variables](#82-running-pipelines-with-variables)
    - [8.3. Activating debug messages](#83-activating-debug-messages) 


## 3. Requirements

- At least one Azure Devops agent allocated for running the pipeline
- The product version should be **1.0.0.8** or **higher** (certain features require a newer version - see documentation)
- API access to the product with **CI/CD Integration** or **DevOps Admin** roles

## 4. Extension configuration  

### 4.1. How to install the Azure DevOps ALM Octane extension from Marketplace

In Azure DevOps, click on "Manage extensions":

![image](https://github.com/user-attachments/assets/6bce2e6b-0abe-4df3-a387-0ed529ca9ac4)

Then click on click on "Browse marketplace":

![image](https://github.com/user-attachments/assets/616bc022-0b9a-4d21-a68d-4011b8c00ace)

Search for "Octane" and filter by "Azure Pipelines":

![image](https://github.com/user-attachments/assets/cd505af3-4520-4bbc-acb1-75969f4afb6c)

Click on "Get it free":

![image](https://github.com/user-attachments/assets/ca4fbdb5-cbe9-4cb3-82b8-8157705f2b32)

Choose the Azure DevOps organization you want to install this extension into and press "Install":

![image](https://github.com/user-attachments/assets/e50dfee9-25ee-4396-bb44-998b088a944e)

Go back to your organization by pressing the "Proceed to organization" button:

![image](https://github.com/user-attachments/assets/63b31041-ec89-4d55-b0a0-1e7d8972c961)

### 4.2. How to add an API Access Key in Octane for Azure Service Connection

Before you can add a new service connection, please make sure you have a valid API ACCESS key and secret set in Octane. You can follow the steps below to create one:

Firstly, go to the space and in the API Access tab press the "+ API access" button:

![image](https://github.com/user-attachments/assets/a4e1f334-f3fa-443f-88c4-ac25b0e485a2)

Fill in all required data, like name, and don’t forget to select the role for CI/CD Integration in the required workspace: 

![image](https://github.com/user-attachments/assets/b2249ae0-648c-4930-b805-3018877d342d)

In the displayed popup, press copy and save your newly created API Access, but be careful, after closing this prompt, you won't be able to visualise these variables again, so its highly recommended to save these values somewhere:

![image](https://github.com/user-attachments/assets/b6b64630-fb2a-475c-829a-bdd65f96e961)

### 4.3. How to create a new service connection

Firstly, go back in Azure DevOps, and go to "Project settings" in the bottom left corner:

![image](https://github.com/user-attachments/assets/6f3980ae-55af-4d3f-97a0-cf98e4b1835a)

Click on the "Service connections" available in the "Pipeleines" tab:

![image](https://github.com/user-attachments/assets/a208b355-ed6a-43e9-8612-26880f409b1a)\

Press the “Create service connection” button: 

![image](https://github.com/user-attachments/assets/0bbe0394-3288-45c6-9172-da17cc1bd7cc)

Select the ALM Octane connection type: 

![image](https://github.com/user-attachments/assets/0c1f9425-8d75-4125-a95b-2725d68e11c9)

Fill in all fields required in the form which appears, as follows:

![image](https://github.com/user-attachments/assets/5c719141-b5f1-4025-b403-ac617505d154)

**Server Url** - the URL of the Octane the service connection will point to. Make sure to include the sharedspace/workspace query parameter (p=1002/1002)

**Instance ID** - the name you expect to see in CI Servers grid in DEVOPS tab for a specific space, like in the example: 

![image](https://github.com/user-attachments/assets/5d886c5c-1f1c-4c7f-92eb-172c44e0b36d)

**Authentication** - The API Access key and secret which are created inside the shared space, the creation of which was presented earlier in the guide.

**Service connection name** - The name to be used anywhere inside Azure DevOps to reference this service connection.

**Grant access permission to all pipelines** - Selecting this checkbox will make this service connection available for all pipelines for usage.

## 5. Pipeline interaction

### 5.1. Create a new pipeline with the Octane start and end tasks through YAML editing (implicit Azure job)

Go to Pipelines and press Create Pipeline:

![image](https://github.com/user-attachments/assets/27b6b036-1bd0-48bf-a332-43f5f5a9692b)

Select the source code repository type you use, in this case we will use the local Azure Repos Git: 

![image](https://github.com/user-attachments/assets/66a12591-bbbb-437a-8eb8-f18d4cb297ca)

> [!NOTE]
> Note that depending on the repository type you select, there might be different steps to execute.

Select the actual repository: 

![image](https://github.com/user-attachments/assets/52d5cac5-8434-4750-a916-024ee83b1269)

Edit your YML if you require, and press Save and Run:

![image](https://github.com/user-attachments/assets/5ed608ed-0493-4507-8487-a07b79c3e085)

![image](https://github.com/user-attachments/assets/749a805e-55e2-4333-8854-eed974ec05ce)

Go to Pipelines, where you should see your new pipeline. It should be marked green, as the job succeeded:

![image](https://github.com/user-attachments/assets/61046daa-9470-4142-a13d-8fb7378e0407)

Press on the pipeline and edit it:

![image](https://github.com/user-attachments/assets/ad3a6d48-eb0a-42e5-bdc4-0e3d29221685)

Add the ALM Octane Job Start and ALM Octane Job End. You must make sure to add them together because otherwise the pipelines will not show properly in Octane. Job start is required in order to create the CI Server and Pipeline in Octane and mark it as running. Job end is required in order to let Octane know that the pipeline ended. This should be the last task inside your Azure DevOps pipeline. Make sure you put your cursor in the right location before adding the task as it will generate a YAML task entry directly in the position where your cursor was before you click on the task.

![image](https://github.com/user-attachments/assets/e59a6b74-b2a3-41d7-93fb-47f9752391ef)

You need to know your workspace ID(s) within Octane where you want your pipeline to be created and updated. You can find it in two ways:
1. From the URL of the Octane instance you access, usually it is the second integer, as you can see from this example mock link: https://yourOctaneDomain.com/ui/?p=1001/1002
2. If you have shared space admin rights, go to Spaces within Octane and press the Edit Workspace button

![image](https://github.com/user-attachments/assets/7b90e3b3-6479-4340-ac77-9188a199d38b)

After finding the respective workspace id, make sure to paste it in the form that opens when you select either the start task or the end task.

![image](https://github.com/user-attachments/assets/28b7b773-4f5a-4a66-b9b0-599795b08379)

In the end you should have in your YAML file something like below:

![image](https://github.com/user-attachments/assets/398c519d-4e30-47e0-a9ab-ceebbff13c3b)

> [!CAUTION]
> Make sure to add the following condition inside both the start task and the end task: **condition:always()**. This will make sure that if you cancel a pipeline run, the respective run will still be replicated into Octane and will appear with the status set to "Aborted". After adding this condition, the tasks should look like this:

```yaml
- task: octane-start-task@1
  condition: always()
  inputs:
    OctaneServiceConnection: 'AzureExtensionPipelineServiceConnection'
    WorkspaceList: '1002'
```

and

```yaml
- task: octane-end-task@1
  condition: always()
  inputs:
    OctaneServiceConnection: 'AzureExtensionPipelineServiceConnection'
    WorkspaceList: '1002'
```

Press the save button in the top right corner:

![image](https://github.com/user-attachments/assets/c3742d9e-626e-4a9c-95a0-104b4669d145)

Execute the pipeline by pressing Run: 

![image](https://github.com/user-attachments/assets/70be78d7-3893-4f8a-95e6-8d159141e0de)

You should observe that the job was successful, like below: 

![image](https://github.com/user-attachments/assets/8db2952b-add6-449e-b5dc-f9993a11e81b)

If you click on the job you can see all its tasks. If you press, for example, on octanestarttask, you can observe logs indicating that the connection to Octane was successful:

![image](https://github.com/user-attachments/assets/7cc3a804-7aa8-4f82-a68f-2b2cf0df6dda)

Back in Octane, you can check two things that were created successfully:

1.	That the pipeline was actually created:

![image](https://github.com/user-attachments/assets/58ad8272-ad73-433c-ac7f-a8d3b6debe90)

2. If you have shared space admin role, see that you have a new entry in the CI Servers grid, with the Instance ID matching the one you have previously configured: 

![image](https://github.com/user-attachments/assets/609fefea-d69e-4628-a3a3-d5b3fc53335d)

### 5.2. Create a new pipeline with the Octane start and end tasks through classic editor (implicit Azure job)

Go to the Pipelines and find the hyperlink as below:

![image](https://github.com/user-attachments/assets/518eab38-a38d-44df-bad9-c228e173ccf3)

In the next step, choose the right team project, repository and branch:

![image](https://github.com/user-attachments/assets/426f4365-089e-490c-b6f5-b6291878e8bf)

Choose the right template (suppose you want a Maven configuration to build Java code):

![image](https://github.com/user-attachments/assets/a862f7e7-12d2-4fd2-becb-f94859b77fd2)

Fill in all required information if default values are not satisfactory for you, and select Save:

![image](https://github.com/user-attachments/assets/ada39311-3a11-4b03-b3d2-27f77592d662)

Save the pipeline in a folder which you want:

![image](https://github.com/user-attachments/assets/e517638b-e63a-4d28-8dfa-892447dddfdd)

Go to Pipelines and find your new pipeline and try to run it. You need a valid project in that repository with a valid pom.xml and surefire plugin configured, so that the actual tests are triggered and the report is published to Octane.

![image](https://github.com/user-attachments/assets/8a44485c-f478-416f-8b25-1bb1591c7367)

![image](https://github.com/user-attachments/assets/8032cfeb-7789-4d9c-b60d-96cf21befa4e)

Observe the execution results:

![image](https://github.com/user-attachments/assets/f9f17b67-aa85-4c9b-b9ca-1b77daec451d)\

If you will go inside the pipeline, you can observe the following:

![image](https://github.com/user-attachments/assets/010e0f98-8bd9-4afb-8846-864fcd684777)

When you click on the run, you should see a view similar to the one below:

![image](https://github.com/user-attachments/assets/929aa689-4307-46e6-8dd0-5e40f7228387)

In “Agent job 1”, press on Maven pom.xml and scroll down. You can observe:

![image](https://github.com/user-attachments/assets/52d3c0ff-eca9-40dc-9bcf-8bef47c94291)

The next step is to add the ALM Octane tasks. Go back and press “Edit” in order to edit the pipeline and add the Octane tasks:

![image](https://github.com/user-attachments/assets/749d9830-58f7-4fe4-9ff3-235325095337)

In the newly displayed view, press the plus sign on the right of “Agent Job 1” in order to reveal all possible tasks to be added: 

![image](https://github.com/user-attachments/assets/25aa20e8-8645-446c-a832-9757198dce3f)

Add the start task:

![image](https://github.com/user-attachments/assets/c3c029dd-c773-40f6-9e40-53be241adfbf)

The task should be added to the end of the list, and now you should position it before all other tasks. Additionally, you need to configure it:

![image](https://github.com/user-attachments/assets/83eba98c-8b43-4cae-87ac-7959525dc5f0)

Click on the button on the right and configure the task:

![image](https://github.com/user-attachments/assets/3818e771-a770-4305-90ba-61fafa6d65b5)

Drag and drop the ALM Octane Job Start and position it first in the list:

![image](https://github.com/user-attachments/assets/af92226e-50c7-4059-b50c-5d30b56ab38c)

Do the same thing for the ALM Octane Job End, so that you end up with the following pipeline. Press “Save & queue”:

![image](https://github.com/user-attachments/assets/ee6ceadb-5c4d-41de-b89e-00511d2dca05)

Add a relevant comment to the save, and press the “Save and run” button:

![image](https://github.com/user-attachments/assets/9d8f5222-ffa4-4a3a-b5d2-3daa2c1382d8)

Wait for the pipeline to run. Then, open “Agent Job 1” and observe that you have two additional ALM Octane tasks that were executed:

![image](https://github.com/user-attachments/assets/1712e4c0-87cd-4526-959a-d78931ebbe1f)

Now you can go to Octane and verify that the pipeline was created and shows the results:

![image](https://github.com/user-attachments/assets/4f90cd3a-3528-4936-bde8-6f5c22d89f50)

### 5.3. Create a new pipeline with the Octane start and end tasks through YAML editing (explicit Azure jobs)

Previous chapters focused on the demonstration of how to create pipelines with Octane tasks inside them. This is ok if you do not need complex pipelines with multiple jobs inside them, or you are just testing how the extension might fit your needs. For more complex scenarios where multiple jobs are used and the pipelines already exist, tasks under existing jobs might not be a solution. Suppose you have the following YAML, which contains a simple task of building a maven project specified under an unnamed job (in theory you might have many jobs here, but for the sake of simplicity, we will work with only one):

```yaml
# Maven
# Build your Java project and run tests with Apache Maven.
# Add steps that analyze code, save build artifacts, deploy, and more:
# https://docs.microsoft.com/azure/devops/pipelines/languages/java

trigger:
- main

jobs:
- job:
  pool: 'Default'
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
```

If you want ALM Octane Start Task and End Task to be included as separate jobs, do the following:
1.	Give a name to your existing job (or jobs, if multiple).
2.	Add a new job at the same level as your existing job, and place your cursor on the next line after “steps:”:
   
![image](https://github.com/user-attachments/assets/99b1b984-6017-4ea0-9fbc-fd032a482014)

3.	Press on the ALM Octane Job Start to be added:

 ![image](https://github.com/user-attachments/assets/5cd4b407-66fd-4625-a9ef-14aa5f70cfd6)

4.	Fill in the required fields (refer to previous chapters for pre-requisites, explanation, and examples):

![image](https://github.com/user-attachments/assets/a9aef6df-7bda-4f6d-860d-ca28f8aadceb)

5.	You should end up with the following block of code:

![image](https://github.com/user-attachments/assets/626689e8-0cec-4719-8300-d714e2b1946c)

6.	Add the ALM Octane Job End in the same way as for start, with the difference that you need to have the “dependsOn” property set to the list of all existing jobs, including Octane Start Job. This is required because jobs might run in parallel, and to make sure that End job runs last, we need to set the dependencies on all other jobs:

![image](https://github.com/user-attachments/assets/dddca3c1-0230-46b8-9ef6-c7cf5029c0ce)

7.	As a last step, set “dependsOn” property of your jobs to depend on the AlmOctaneStartJob (or whatever name you’ve assigned to it), as follows:

![image](https://github.com/user-attachments/assets/4eddbd11-11d3-40f8-a3f9-e7dc038bc7c9)

8.	In the end, you should have the YAML file similar to the one below:

```yaml
# Maven
# Build your Java project and run tests with Apache Maven.
# Add steps that analyze code, save build artifacts, deploy, and more:
# https://docs.microsoft.com/azure/devops/pipelines/languages/java

trigger:
- main

jobs:
- job: MavenBuildJob
  pool: 'Default'
  dependsOn:
  - AlmOctaneStartJob
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
- job: AlmOctaneStartJob
  condition: always()
  pool: 'Default'
  steps:
  - task: octane-start-task@1
    inputs:
      OctaneServiceConnection: 'VMOctaneServiceConnection'
      WorkspaceList: '1002'
- job: AlmOctaneEndJob
  condition: always()
  pool: 'Default'
  dependsOn:
  - AlmOctaneStartJob
  - MavenBuildJob
  steps:
  - task: octane-end-task@1
    inputs:
      OctaneServiceConnection: 'VMOctaneServiceConnection'
      WorkspaceList: '1002'
```

9.	Save and run the pipeline, and you should see something similar to below:
 
![image](https://github.com/user-attachments/assets/fb26e6d8-7122-4b2e-877c-7fb1c01eefe4)

10.	Because we specified the dependencies between the jobs, AlmOctaneStartJob should run first, MavenBuildJob second, and AlmOctaneEndJob should be last:

![image](https://github.com/user-attachments/assets/c396b60c-02db-4a56-9d0c-b019c24a3d7e)

11.	Now you can create complex scenarios with different jobs. Make sure you understand the dependencies and current limitations of the Azure DevOps pipeline and the extension.

## 6. Displaying Cucumber Gherkin test results into Octane

### 6.1. Displaying Cucumber Gherkin test results into Octane using yml editor

1.	Create a pipeline job for running the tests.
2.	Make sure to configure the Maven task to use the OctaneGherkinFormatter when running the tests, and where to store the results as below. The formatter specifies the location and name of the generated xml file containing the report.

![image](https://github.com/user-attachments/assets/709481d5-1d4c-4107-9d90-c8b21d4e7f91)

3.	Fill in the Cucumber report destination path field when configuring the ALM Octane Job End task. This must point to the same directory as specified for the GherkinFormatter. Note that the path must be filled in starting with the source code repo root directory.

![image](https://github.com/user-attachments/assets/720ffed7-8471-4fd6-8308-ade492a03793)

4.	Run the pipeline and check if all steps have been completed successfully. The End Job task should display the fact that the test results have been found and processed as below:

![image](https://github.com/user-attachments/assets/dd49dd32-7577-4820-8b86-be7a68de448f)

5.	The results can be observed in Octane in the Pipelines section:

![image](https://github.com/user-attachments/assets/77263adc-7fd4-4901-a5fe-6fcc7d89f8c7)

![image](https://github.com/user-attachments/assets/3ae3f141-2fb5-4f07-88ae-777c098224db)

### 6.2. Displaying Cucumber Gherkin test results into Octane using classic editor

1.	Create a pipeline job for running the tests.
2.	Make sure to configure the Maven task to use the OctaneGherkinFormatter when running the tests, and where to store the results as below. The formatter specifies the location and name of the generated xml file containing the report.

![image](https://github.com/user-attachments/assets/20e3560b-b339-4ae0-b2b1-ef2b8a29dda9)

3.	Fill in the Cucumber report destination path field when configuring the ALM Octane Job End task. This must point to the same directory as specified for the GherkinFormatter. Note that the path must be filled in starting with the root directory of the project.

![image](https://github.com/user-attachments/assets/44f4f554-b565-4981-a427-1ae24635ea2e)

4.	Run the pipeline and check if all steps have been completed successfully. The End Job task should display the fact that the test results have been found and processed like below:

![image](https://github.com/user-attachments/assets/ab152edd-9007-4010-96d0-2ca43648feb2)

5.	The results can be observed in Octane in the Pipelines section:

![image](https://github.com/user-attachments/assets/2db8b5a4-7458-427d-927d-1feb038be6e3)

![image](https://github.com/user-attachments/assets/e28f6166-4c79-4def-b385-a17a85d4cdf3)

## 7. Configuring test runner pipeline

Besides pipeline runs, you can also configure test runners using this extension, by making use of the **octane-test-runner-start-task@1**. Naturally you will not be creating another pipeline in Octane, but rather a test runner that you can assign test suites to and run them from octane and see the results in both Azure DevOps and Octane. To do that you need to follow the next steps:

Firstly, as in the previous steps, you need to create a new pipeline:

![Screenshot 2025-05-15 152824](https://github.com/user-attachments/assets/fa2c6665-e7f9-48f5-ae88-536bea0be868)

Choose your desired source cod repository option, but keep in mind that there might be different steps to execute, depending on the repository type you selected.

![image](https://github.com/user-attachments/assets/e34ac479-f86f-41f8-922d-5a928a7106c1)

Select the actual repository:

![image](https://github.com/user-attachments/assets/4dd95a45-26a2-40cc-a00f-93abaf26844e)

Edit your yml file if you need to do so, and press the Save and Run:

![image](https://github.com/user-attachments/assets/7245ebf2-e54a-4078-8c62-fb5240f9a845)

![image](https://github.com/user-attachments/assets/7688eead-209c-4571-95d4-0a22dd660ffa)

Go to Pipelines, where you should see your new pipeline:

![image](https://github.com/user-attachments/assets/fb923c58-2d48-460e-a503-8377a78b5cdc)

Press on the pipeline and edit it:

![image](https://github.com/user-attachments/assets/b17e8093-81e9-4277-ada6-1acbd1327b85)

Here is where things are a bit different. Instead of selecting the usual octane-start-task, make sure to select the **ALM Octane Test Runner Job Start** task. Make sure you put your cursor in the right location before adding the task as it will generate a YAML task entry directly in the position where your cursor was before you click on the task.

![image](https://github.com/user-attachments/assets/bb3a7e2d-9677-4159-bdc5-0c44062371a5)

You will need to have an existing service connection, to know your workspace id and also select a framework convert type that best suits your needs:

![image](https://github.com/user-attachments/assets/6361a452-082a-49b3-b98b-d751b6393a38)

Normally you should end up with something like this. The end task remains the same

```yaml
- task: octane-test-runner-start-task@1
  inputs:
    OctaneServiceConnection: 'octaneConnection'
    WorkspaceList: '1002'
    Framework: 'junit'
```

Make sure to save the modifications and run the pipeline. After the run was completed, you should see a new test runner instance in Octane, in the Spaces tab, in your workspace in the DevOps tab:

![image](https://github.com/user-attachments/assets/6c769baf-a2c2-4b00-8180-e3658cbe3648)

From here the the possibilities depend on your needs. For example, you can assign multiple tests to a test suite and assign that test suite to the test runner. This way, you can run those tests from Octane via the test runner and see the results in Azure DevOps. For more details on how to do that, make sure to check the documentation on test suites and test runner: 

https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/UserGuide/how_create_test_suites.htm

## 8. Useful configurations

### 8.1 Running pipelines from octane

### 8.2. Running pipelines with variables

### 8.3. Activating debug messages 

A very useful feature is enabling debug messages, which not only gives you more insight into what happens behind the scenes, but it can also help you in figuring out what went wrong with a run. To enable this kind of messages, you need to go into an existing pipeline and press the "Edit" button. Then make sure to press the "Variables" which can be found in the top right corner: 

![image](https://github.com/user-attachments/assets/950fdb89-6830-43fd-8eaf-88a99399b2c5)

Then on the prompt that appears, press the "+" button in the top right corner(in case you already have configured other parameters) or the **"New variable"** button (in case you have **not** configured such a variable just yet), in order to create a new variable:

![image](https://github.com/user-attachments/assets/8e6c94d3-dbec-4593-a2e8-49a1a1406728)

Fill the empty slots with the following values and press "OK":

![image](https://github.com/user-attachments/assets/102df795-da91-4675-8d61-7c8306a43bf4)

Your variables tab should look like the following screenshot. Make sure to press "Save".

![image](https://github.com/user-attachments/assets/40c43390-3d70-4fff-ba89-69c2f4273b2e)

Now whenever you run any pipeline and check the logs, you will notice that there are additional log messaeges, compared to previous runs, distinguished by the color purple:

![image](https://github.com/user-attachments/assets/822e181a-ced5-44bb-93b7-11a22071e8c8)







