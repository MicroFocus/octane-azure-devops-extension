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
    - [4.2. How to add an API Access Key in the product for Azure Service Connection ](#42-how-to-add-an-api-access-key-in-the-product-for-azure-service-connection)
    - [4.3. How to create a new service connection](#43-how-to-create-a-new-service-connection)
- [5. Pipeline interaction](#5-pipeline-interaction)
    - [5.1. Create a new pipeline with the Octane start and end tasks through YAML editing (implicit Azure job)](#51-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-yaml-editing-implicit-azure-job)
    - [5.2. Create a new pipeline with the Octane start and end tasks through classic editor (implicit Azure job)](#52-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-classic-editor-implicit-azure-job)
    - [5.3. Create a new pipeline with the Octane start and end tasks through YAML editing (explicit Azure jobs)](#53-create-a-new-pipeline-with-the-octane-start-and-end-tasks-through-yaml-editing-explicit-azure-jobs)
- [6. Displaying Cucumber Gherkin test results into the product](#6-displaying-cucumber-gherkin-test-results-into-the-product)
    - [6.1. Displaying Cucumber Gherkin test results into the product using yml editor](#61-displaying-cucumber-gherkin-test-results-into-the-product-using-yml-editor)
    - [6.2. Displaying Cucumber Gherkin test results into the product using classic editor](#62-displaying-cucumber-gherkin-test-results-into-the-product-using-classic-editor)
- [7. Configuring test runner pipeline](#7-configuring-test-runner-pipeline)
    - [7.1. Configure pipeline variables](#71-configure-pipeline-variables)
- [8. Configuring Auto Action flow](#8-configuring-auto-action-flow)
- [9. Useful Configurations](#9-useful-configurations)
    - [9.1. Running pipelines from the product](#91-running-pipelines-from-the-product)
    - [9.2. Running pipelines with variables or parameters](#92-running-pipelines-with-variables-or-parameters)
        - [9.2.1 Running pipelines with variables](#921-running-pipelines-with-variables)
        - [9.2.2 Running pipelines with parameters](#922-running-pipelines-with-parameters)
    - [9.3. Activating debug messages](#93-activating-debug-messages) 
- [10. Known issues and limitations](#10-known-issues-and-limitations)
- [11. Change logs](#11-change-logs)


## 3. Requirements

- At least one Azure Devops agent allocated for running the pipeline
- The Azure DevOps extension version should be **1.0.0.8** or **higher** (certain features require a newer version - see documentation)
- The product version should be **16.1.200** or **higher**
- API access to the product with **CI/CD Integration** or **DevOps Admin** roles

## 4. Extension configuration  

### 4.1. How to install the Azure DevOps ALM Octane extension from Marketplace

1. In Azure DevOps, click on "Manage extensions":

![image](https://github.com/user-attachments/assets/6bce2e6b-0abe-4df3-a387-0ed529ca9ac4)

2. Then click on click on "Browse marketplace":

![image](https://github.com/user-attachments/assets/616bc022-0b9a-4d21-a68d-4011b8c00ace)

3. Search for "Octane" and filter by "Azure Pipelines":

![image](https://github.com/user-attachments/assets/cd505af3-4520-4bbc-acb1-75969f4afb6c)

4. Click on "Get it free":

![image](https://github.com/user-attachments/assets/ca4fbdb5-cbe9-4cb3-82b8-8157705f2b32)

5. Choose the Azure DevOps organization you want to install this extension into and press "Install":

![image](https://github.com/user-attachments/assets/e50dfee9-25ee-4396-bb44-998b088a944e)

6. Go back to your organization by pressing the "Proceed to organization" button:

![image](https://github.com/user-attachments/assets/63b31041-ec89-4d55-b0a0-1e7d8972c961)

### 4.2. How to add an API Access Key in the product for Azure Service Connection

Before you can add a new service connection, please make sure you have a valid API ACCESS key and secret set in the product. You can follow the steps below to create one:

1. Firstly, go to the space and in the API Access tab press the "+ API access" button:

![image](https://github.com/user-attachments/assets/a4e1f334-f3fa-443f-88c4-ac25b0e485a2)

2. Fill in all required data, like name, and don’t forget to select the role for CI/CD Integration in the required workspace: 

![image](https://github.com/user-attachments/assets/b2249ae0-648c-4930-b805-3018877d342d)

3. In the displayed popup, press copy and save your newly created API Access, but be careful, after closing this prompt, you won't be able to visualise these variables again, so its highly recommended to save these values somewhere:

![image](https://github.com/user-attachments/assets/b6b64630-fb2a-475c-829a-bdd65f96e961)

### 4.3. How to create a new service connection

1. Firstly, go back in Azure DevOps, and go to "Project settings" in the bottom left corner:

![image](https://github.com/user-attachments/assets/6f3980ae-55af-4d3f-97a0-cf98e4b1835a)

2. Click on the "Service connections" available in the "Pipeleines" tab:

![image](https://github.com/user-attachments/assets/a208b355-ed6a-43e9-8612-26880f409b1a)\

3. Press the “Create service connection” button: 

![image](https://github.com/user-attachments/assets/0bbe0394-3288-45c6-9172-da17cc1bd7cc)

4. Select the ALM Octane connection type: 

![image](https://github.com/user-attachments/assets/0c1f9425-8d75-4125-a95b-2725d68e11c9)

5. Fill in all fields required in the form which appears, as follows:

![image](https://github.com/user-attachments/assets/5c719141-b5f1-4025-b403-ac617505d154)

**Server Url** - the URL of the Octane the service connection will point to. Make sure to include the sharedspace/workspace query parameter (p=1002/1002)

**Instance ID** - the name you expect to see in CI Servers grid in DEVOPS tab for a specific space, like in the example: 

![image](https://github.com/user-attachments/assets/5d886c5c-1f1c-4c7f-92eb-172c44e0b36d)

**Authentication** - The API Access key and secret which are created inside the shared space, the creation of which was presented earlier in the guide.

**Service connection name** - The name to be used anywhere inside Azure DevOps to reference this service connection.

**Grant access permission to all pipelines** - Selecting this checkbox will make this service connection available for all pipelines for usage.

## 5. Pipeline interaction

### 5.1. Create a new pipeline with the Octane start and end tasks through YAML editing (implicit Azure job)

1. Go to Pipelines and press Create Pipeline:

![image](https://github.com/user-attachments/assets/27b6b036-1bd0-48bf-a332-43f5f5a9692b)

2. Select the source code repository type you use, in this case we will use the local Azure Repos Git: 

![image](https://github.com/user-attachments/assets/66a12591-bbbb-437a-8eb8-f18d4cb297ca)

> [!NOTE]
> Note that depending on the repository type you select, there might be different steps to execute.

3. Select the actual repository: 

![image](https://github.com/user-attachments/assets/52d5cac5-8434-4750-a916-024ee83b1269)

4. Edit your YML if you require, and press Save and Run:

![image](https://github.com/user-attachments/assets/5ed608ed-0493-4507-8487-a07b79c3e085)

![image](https://github.com/user-attachments/assets/749a805e-55e2-4333-8854-eed974ec05ce)

5. Go to Pipelines, where you should see your new pipeline. It should be marked green, as the job succeeded:

![image](https://github.com/user-attachments/assets/61046daa-9470-4142-a13d-8fb7378e0407)

6. Press on the pipeline and edit it:

![image](https://github.com/user-attachments/assets/ad3a6d48-eb0a-42e5-bdc4-0e3d29221685)

7. Add the ALM Octane Job Start and ALM Octane Job End. You must make sure to add them together because otherwise the pipelines will not show properly in the product. Job start is required in order to create the CI Server and Pipeline in the product and mark it as running. Job end is required in order to let the product know that the pipeline ended. This should be the last task inside your Azure DevOps pipeline. Make sure you put your cursor in the right location before adding the task as it will generate a YAML task entry directly in the position where your cursor was before you click on the task.

![image](https://github.com/user-attachments/assets/e59a6b74-b2a3-41d7-93fb-47f9752391ef)

8. You need to know your workspace ID(s) within the product where you want your pipeline to be created and updated. You can find it in two ways:
    1. From the URL of the product instance you access, usually it is the second integer, as you can see from this example mock link: https://yourOctaneDomain.com/ui/?p=1001/1002
    2. If you have shared space admin rights, go to Spaces within the product and press the Edit Workspace button

![image](https://github.com/user-attachments/assets/7b90e3b3-6479-4340-ac77-9188a199d38b)

9. After finding the respective workspace id, make sure to paste it in the form that opens when you select either the start task or the end task.

![image](https://github.com/user-attachments/assets/28b7b773-4f5a-4a66-b9b0-599795b08379)

10. In the end you should have in your YAML file something like below:

![image](https://github.com/user-attachments/assets/398c519d-4e30-47e0-a9ab-ceebbff13c3b)

> [!CAUTION]
> Make sure to add the following condition inside both the start task and the end task: **condition:always()**. This will make sure that if you cancel a pipeline run, the respective run will still be replicated into the product and will appear with the status set to "Aborted". After adding this condition, the tasks should look like this:

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

11. Press the save button in the top right corner:

![image](https://github.com/user-attachments/assets/c3742d9e-626e-4a9c-95a0-104b4669d145)

12. Execute the pipeline by pressing Run: 

![image](https://github.com/user-attachments/assets/70be78d7-3893-4f8a-95e6-8d159141e0de)

13. You should observe that the job was successful, like below: 

![image](https://github.com/user-attachments/assets/8db2952b-add6-449e-b5dc-f9993a11e81b)

14. If you click on the job you can see all its tasks. If you press, for example, on octanestarttask, you can observe logs indicating that the connection to the product was successful:

![image](https://github.com/user-attachments/assets/7cc3a804-7aa8-4f82-a68f-2b2cf0df6dda)

15. Back in the product, you can check two things that were created successfully:
    - That the pipeline was actually created
    - If you have shared space admin role, see that you have a new entry in the CI Servers grid, with the Instance ID matching the one you have previously configured: 
      
![image](https://github.com/user-attachments/assets/58ad8272-ad73-433c-ac7f-a8d3b6debe90)

![image](https://github.com/user-attachments/assets/609fefea-d69e-4628-a3a3-d5b3fc53335d)

### 5.2. Create a new pipeline with the Octane start and end tasks through classic editor (implicit Azure job)

1. Go to the Pipelines and find the hyperlink as below:

![image](https://github.com/user-attachments/assets/518eab38-a38d-44df-bad9-c228e173ccf3)

2. In the next step, choose the right team project, repository and branch:

![image](https://github.com/user-attachments/assets/426f4365-089e-490c-b6f5-b6291878e8bf)

3. Choose the right template (suppose you want a Maven configuration to build Java code):

![image](https://github.com/user-attachments/assets/a862f7e7-12d2-4fd2-becb-f94859b77fd2)

4. Fill in all required information if default values are not satisfactory for you, and select Save:

![image](https://github.com/user-attachments/assets/ada39311-3a11-4b03-b3d2-27f77592d662)

5. Save the pipeline in a folder which you want:

![image](https://github.com/user-attachments/assets/e517638b-e63a-4d28-8dfa-892447dddfdd)

6. Go to Pipelines and find your new pipeline and try to run it. You need a valid project in that repository with a valid pom.xml and surefire plugin configured, so that the actual tests are triggered and the report is published to the product.

![image](https://github.com/user-attachments/assets/8a44485c-f478-416f-8b25-1bb1591c7367)

![image](https://github.com/user-attachments/assets/8032cfeb-7789-4d9c-b60d-96cf21befa4e)

7. Observe the execution results:

![image](https://github.com/user-attachments/assets/f9f17b67-aa85-4c9b-b9ca-1b77daec451d)\

8. If you will go inside the pipeline, you can observe the following:

![image](https://github.com/user-attachments/assets/010e0f98-8bd9-4afb-8846-864fcd684777)

9. When you click on the run, you should see a view similar to the one below:

![image](https://github.com/user-attachments/assets/929aa689-4307-46e6-8dd0-5e40f7228387)

10. In “Agent job 1”, press on Maven pom.xml and scroll down. You can observe:

![image](https://github.com/user-attachments/assets/52d3c0ff-eca9-40dc-9bcf-8bef47c94291)

11. The next step is to add the ALM Octane tasks. Go back and press “Edit” in order to edit the pipeline and add the Octane tasks:

![image](https://github.com/user-attachments/assets/749d9830-58f7-4fe4-9ff3-235325095337)

12. In the newly displayed view, press the plus sign on the right of “Agent Job 1” in order to reveal all possible tasks to be added: 

![image](https://github.com/user-attachments/assets/25aa20e8-8645-446c-a832-9757198dce3f)

13. Add the start task:

![image](https://github.com/user-attachments/assets/c3c029dd-c773-40f6-9e40-53be241adfbf)

14. The task should be added to the end of the list, and now you should position it before all other tasks. Additionally, you need to configure it:

![image](https://github.com/user-attachments/assets/83eba98c-8b43-4cae-87ac-7959525dc5f0)

15. Click on the button on the right and configure the task:

![image](https://github.com/user-attachments/assets/3818e771-a770-4305-90ba-61fafa6d65b5)

16. Drag and drop the ALM Octane Job Start and position it first in the list:

![image](https://github.com/user-attachments/assets/af92226e-50c7-4059-b50c-5d30b56ab38c)

17. Do the same thing for the ALM Octane Job End, so that you end up with the following pipeline. Press “Save & queue”:

![image](https://github.com/user-attachments/assets/ee6ceadb-5c4d-41de-b89e-00511d2dca05)

18. Add a relevant comment to the save, and press the “Save and run” button:

![image](https://github.com/user-attachments/assets/9d8f5222-ffa4-4a3a-b5d2-3daa2c1382d8)

19. Wait for the pipeline to run. Then, open “Agent Job 1” and observe that you have two additional ALM Octane tasks that were executed:

![image](https://github.com/user-attachments/assets/1712e4c0-87cd-4526-959a-d78931ebbe1f)

20. Now you can go to the product and verify that the pipeline was created and shows the results:

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

Now you can create complex scenarios with different jobs. Make sure you understand the dependencies and current limitations of the Azure DevOps pipeline and the extension.

## 6. Displaying Cucumber Gherkin test results into the product

### 6.1. Displaying Cucumber Gherkin test results into the product using yml editor

1.	Create a pipeline job for running the tests.
2.	Make sure to configure the Maven task to use the OctaneGherkinFormatter when running the tests, and where to store the results as below. The formatter specifies the location and name of the generated xml file containing the report.

![image](https://github.com/user-attachments/assets/709481d5-1d4c-4107-9d90-c8b21d4e7f91)

3.	Fill in the Cucumber report destination path field when configuring the ALM Octane Job End task. This must point to the same directory as specified for the GherkinFormatter. Note that the path must be filled in starting with the source code repo root directory.

![image](https://github.com/user-attachments/assets/720ffed7-8471-4fd6-8308-ade492a03793)

4.	Run the pipeline and check if all steps have been completed successfully. The End Job task should display the fact that the test results have been found and processed as below:

![image](https://github.com/user-attachments/assets/dd49dd32-7577-4820-8b86-be7a68de448f)

5.	The results can be observed in the product in the Pipelines section:

![image](https://github.com/user-attachments/assets/77263adc-7fd4-4901-a5fe-6fcc7d89f8c7)

![image](https://github.com/user-attachments/assets/3ae3f141-2fb5-4f07-88ae-777c098224db)

### 6.2. Displaying Cucumber Gherkin test results into the product using classic editor

1.	Create a pipeline job for running the tests.
2.	Make sure to configure the Maven task to use the OctaneGherkinFormatter when running the tests, and where to store the results as below. The formatter specifies the location and name of the generated xml file containing the report.

![image](https://github.com/user-attachments/assets/20e3560b-b339-4ae0-b2b1-ef2b8a29dda9)

3.	Fill in the Cucumber report destination path field when configuring the ALM Octane Job End task. This must point to the same directory as specified for the GherkinFormatter. Note that the path must be filled in starting with the root directory of the project.

![image](https://github.com/user-attachments/assets/44f4f554-b565-4981-a427-1ae24635ea2e)

4.	Run the pipeline and check if all steps have been completed successfully. The End Job task should display the fact that the test results have been found and processed like below:

![image](https://github.com/user-attachments/assets/ab152edd-9007-4010-96d0-2ca43648feb2)

5.	The results can be observed in the product in the Pipelines section:

![image](https://github.com/user-attachments/assets/2db8b5a4-7458-427d-927d-1feb038be6e3)

![image](https://github.com/user-attachments/assets/e28f6166-4c79-4def-b385-a17a85d4cdf3)

## 7. Configuring test runner pipeline

Besides pipeline runs, you can also configure test runners using this extension, by making use of the **octane-test-runner-start-task@1**. Naturally you will not be creating another pipeline in the product, but rather a test runner that you can assign test suites to and run them from the product and see the results in both Azure DevOps and the product. To do that you need to follow the next steps:

1. Firstly, as in the previous steps, you need to create a new pipeline:

![Screenshot 2025-05-15 152824](https://github.com/user-attachments/assets/fa2c6665-e7f9-48f5-ae88-536bea0be868)

2. Choose your desired source code repository option, but keep in mind that there might be different steps to execute, depending on the repository type you selected.

![image](https://github.com/user-attachments/assets/e34ac479-f86f-41f8-922d-5a928a7106c1)

3. Select the actual repository:

![image](https://github.com/user-attachments/assets/4dd95a45-26a2-40cc-a00f-93abaf26844e)

4. Edit your yml file if you need to do so, and press the Save and Run:

![image](https://github.com/user-attachments/assets/7245ebf2-e54a-4078-8c62-fb5240f9a845)

![image](https://github.com/user-attachments/assets/7688eead-209c-4571-95d4-0a22dd660ffa)

5. Go to Pipelines, where you should see your new pipeline:

![image](https://github.com/user-attachments/assets/fb923c58-2d48-460e-a503-8377a78b5cdc)

6. Press on the pipeline and edit it:

![image](https://github.com/user-attachments/assets/b17e8093-81e9-4277-ada6-1acbd1327b85)

7. Here is where things are a bit different. Instead of selecting the usual octane-start-task, make sure to select the **ALM Octane Test Runner Job Start** task. Make sure you put your cursor in the right location before adding the task as it will generate a YAML task entry directly in the position where your cursor was before you click on the task.

![image](https://github.com/user-attachments/assets/bb3a7e2d-9677-4159-bdc5-0c44062371a5)

8. You will need to have an existing service connection, to know your workspace id and also select a framework convert type that best suits your needs:

![image](https://github.com/user-attachments/assets/6361a452-082a-49b3-b98b-d751b6393a38)

Normally you should end up with something like this. The end task remains the same

```yaml
- task: octane-test-runner-start-task@1
  inputs:
    OctaneServiceConnection: 'octaneConnection'
    WorkspaceList: '1002'
    Framework: 'junit'
```

9. Make sure to save the modifications.

### 7.1 Configure Pipeline Variables

1. Ensure the following variables are defined in your Azure DevOps pipeline for automated test execution:

> [!NOTE]
> If you are having trouble configuring variables, please refer to [9.2.1 Running pipelines with variables](#921-running-pipelines-with-variables)

 - `testsToRun` (type: string)
 - `suiteId` (type: number)
 - `suiteRunId` (type: number)
 - `executionId` (type: number)
 - For numerical variables, it is recommended to set a default value of `0`.

2. Configure the `testsToRun` Conversion. To run the selected tests, configure a job or step to convert the testsToRun value into the format required by your test framework. This logic should be handled in your test automation setup. For reference: [@opentext/sdp-sdm-tests-to-run-conversion](https://github.com/MicroFocus/sdp-sdm-tests-to-run-conversion?tab=readme-ov-file#42-running-the-tool-with-github-actions)

3. Run the pipeline. After the run was completed, you should see a new test runner instance in the product, in the Spaces tab, in your workspace in the DevOps tab:

![image](https://github.com/user-attachments/assets/6c769baf-a2c2-4b00-8180-e3658cbe3648)

From here the the possibilities depend on your needs. For example, you can assign multiple tests to a test suite and assign that test suite to the test runner. This way, you can run those tests from the product via the test runner and see the results in Azure DevOps. For more details on how to do that, make sure to check the documentation on test suites and test runner: 

https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/UserGuide/how_create_test_suites.htm

> [!CAUTION]
If any of the previous steps failed and you aren't able to run the test runner pipeline in Azure Devops, make sure that in Azure project settings, in the **Settings** tab, set "Limit variables that can be set at queue time" to **OFF**.

![image](https://github.com/user-attachments/assets/dc3234a5-d722-4795-95e4-65b26a9e0d04)

## 8. Configuring Auto Action flow

In the product, you can add automatic actions to your release process that trigger common tasks, such as running your Azure DevOps pipeline from the product. For more details on how to configure such an auto action flow, please refer to https://admhelp.microfocus.com/valueedge/en/latest/Online/Content/UserGuide/release-process-autoactions.htm?

> [!CAUTION]
> In order to successfully schedule such an auto action, you will need to configure the following parameter in your Azure pipeline configuration file

```yaml
  - name: octane_auto_action_execution_id
    type: string
    displayName: "Octane auto action execution id"
    default: ''
```

This parameter is used in the background by the product for the pipeline results injection flow. You will notice that when configuring the auto action window, the parameter will not appear. This is intentional, because this parameter is not customizable or settable by the user, so it is hidden. In case the user will not configure this additional parameter, the following error message will appear:

![image](https://github.com/user-attachments/assets/cedbb44c-54ad-4cda-965f-ce17c00e7b0c)

## 9. Useful configurations

### 9.1 Running pipelines from the product

1. In order to start runs from the product, you need to do some additional configuration steps. First of all, in Azure DevOps you need to go to: User settings -> Personal access tokens:

![image](https://github.com/user-attachments/assets/8835b48e-3a10-411c-9fb4-309d11e9075b)

2. We will need to generate such a token, with the corresponding rights, in order to be able to run the pipeline from the product. Press on the "New Token" button

![image](https://github.com/user-attachments/assets/6e3349a8-d677-49ed-abaa-db4e37f66f4d)

3. Make sure to name this token and also in the **Scopes** tab, in the **Build** subsection, select the **Read & execute** rights, and then press Create

![image](https://github.com/user-attachments/assets/2feb97b0-8261-4221-873b-c871798a94d4)

4. Copy the generated value, and make sure you save it somewhere as we will need it in the next steps:

![image](https://github.com/user-attachments/assets/66ceb538-2da6-42dc-9621-0b88cdf01787)

5. Go back to the product, in the **Spaces** tab, select the workspace you associtated your pipeline with, then select the **Credentials** tab:

![image](https://github.com/user-attachments/assets/60b0d985-3931-48d6-bd8b-cbb2b810f1f9)

6. Go ahead and press the **+ Credentials** button and then paste the value generated by the Personal access token from Azure DevOps into the password field. You can name this credentials instance as you see fit:

> [!NOTE]
The **User Name** field does not have any correlation with any usernames that you use to login to either Azure DevOps, or the product. It doesnt have any impact on how the credentials get stored, so you can name it however you see fit.

![image](https://github.com/user-attachments/assets/2bf9bb41-a50c-4683-9a08-927ad236becb)

7. Then go to the **DevOps** section where your CI Server instance should be visible. The next step would be to set the recently created Credentials to your CI Server, in order to be able to run your pipelines from the product. By default, the **Credential** column is not visible so you need to make it so:

![image](https://github.com/user-attachments/assets/7b6addab-e798-461f-89ee-691f59d1af51)

8. You should now see an additional empty column. Make sure to double click on that empty value, and a dropdown should open. Select your recently created credential:

![image](https://github.com/user-attachments/assets/924170c9-2b48-4b25-9919-6212071e5712)

9. Now you can go back in the **Pipelines** in the product, select the **3 points icon** from the pipeline you want to run and then press **Run**. You should then be able to see your run in Azure DevOps.

### 9.2. Running pipelines with variables or parameters

Azure DevOps pipelines support both parameters and variables to make your workflows more dynamic, reusable, and configurable: 

- Parameters are defined at the top of a YAML template or pipeline and are evaluated at compile-time. They are strongly typed (string, boolean), can have default values, and must be supplied before the pipeline runs. Parameters are used to drive structural decisions like including or excluding stages, looping over lists, or selecting between complex configuration objects.
- Variables are evaluated at runtime and can be defined or overridden at multiple scopes—pipeline, stage, job, or step. They’re ideal for values that may change between runs (connection strings, feature flags, credentials passed in securely, etc.) and for passing information from one task to another.

This section walks through how to:

1. Declare parameters and variables (with examples of typed inputs and defaults).
2. Reference them in script steps, task inputs, and conditional expressions.
3. Override their values when queuing a pipeline.

> [!CAUTION]
> When running a pipeline, you can define both variables and parameters. However, only one set will be sent to the product, depending on the value of the `USE_AZURE_DEVOPS_PARAMETERS` parameter value from the product. The value of this parameter can be changed only from the product. If the value is set to `true` the integration will send only the parameters, else it will send only the variables.

#### 9.2.1 Running pipelines with variables

> [!NOTE]
> You must set the value of the `USE_AZURE_DEVOPS_PARAMETERS` to `false` in the product in order to see the variables reflected in it.

1. Firstly you need to navigate to a pipeline and press the **Edit** button. Then near the **Run** button you will see the **Variables** button, which will open this interface. Press **New variable**

![image](https://github.com/user-attachments/assets/8be155ac-d2a2-4297-a25c-9a7666b5c1e8)

2. Then set a name and optionally a default value for your variable and select whether you want this variable to be secret or not.

> [!NOTE]
> Secret variables will not be sent to the product and henceforth, will not be visible when checking details about the pipeline runs or the pipeline itself in the product.

> [!CAUTION]
> Make sure to check the box for the **Let users override this value when running this pipeline** option. This will enable you to set a value for this variable when running the pipeline from the product.

![image](https://github.com/user-attachments/assets/7f1407ee-822e-4014-9345-2dfd0cd37189)

3. Press **OK** and then you will see your variable.

4. Now if you want to run your pipeline from the product you will be met with this prompt. Give a value to that variable and the press **Run**

![image](https://github.com/user-attachments/assets/7676332a-60bf-442a-80d6-4b154b6a36a3)

#### 9.2.2 Running pipelines with parameters

> [!NOTE]
> You must set the value of the `USE_AZURE_DEVOPS_PARAMETERS` to `true` in the product in order to see the parameters reflected in it.

1. When using parameters, you must define them at the top level of the pipeline or template, by following this convention:

```yaml
parameters:
  - name: parameterName
    type: string
    default: clean test
    displayName: "Display name of the parameter"
    values:
      - clean test
      - other variable
```
For more information on parameters, Azure DevOps provides thorough documentation on parameter usage : https://learn.microsoft.com/en-us/azure/devops/pipelines/process/template-parameters?view=azure-devops

2. When running the pipeline with parameters from the UI, if configured correctly, you will have to select one the predefined values you declared for your parameters(if no such values are provided a textbox will appear, where you will be able to input the value you want for your parameter)

![image](https://github.com/user-attachments/assets/8d3af4cd-0ba1-4a2d-b4cb-86a67beb64bd)

3. Press **Run**
4. Now if you want to run your pipleine from the product you will be met with this prompt. Give a value to that parameter and then press **Run**. If you configured predefined values for your parameter, make sure the value you enter in the product is one of those predefined ones.

![image](https://github.com/user-attachments/assets/351ef920-c3a1-443e-bd97-9d096846979a)

> [!CAUTION]
> If at any point after the first run of the pipeline, you modify the parameter configuration(either by adding another one, or modifying an existing one) and you want to run the pipeline from the product, make sure you first press the **Sync with CI** button from the product. This will ensure that the parameter modifications are up to date in the product as well and you will be able to run the pipeline without any problems.

![image](https://github.com/user-attachments/assets/3d1a4911-2296-4e59-8bac-a9e67ea942a3)

### 9.3. Activating debug messages 

A very useful feature is enabling debug messages, which not only gives you more insight into what happens behind the scenes, but it can also help you in figuring out what went wrong with a run. To enable this kind of messages, you need to create pipeline variable with the following values: 
- `name = ALMOctaneLogLevel`
- `value = DEBUG`

If you're not sure how to create such varibales please refer to [9.2.1 Running pipelines with variables](#921-running-pipelines-with-variables)

![image](https://github.com/user-attachments/assets/40c43390-3d70-4fff-ba89-69c2f4273b2e)

Now whenever you run any pipeline and check the logs, you will notice that there are additional log messaeges, compared to previous runs, distinguished by the color purple:

![image](https://github.com/user-attachments/assets/822e181a-ced5-44bb-93b7-11a22071e8c8)

## 10. Known issues and limitations

1.	ALM Octane Connection Verifier is non-functional. This will be removed in a future version.
2.	When creating the pipeline with YAML and adding the ALM Octane tasks, the label is not displayed properly (octanestarttask)
3.	The ALM Octane tasks might show as GREEN even if these have errors, like: 
    1.	If you specify a wrong URL, for example, like in the case http://192.168.1.129:9090/?p=1001/1002, meaning skipping /ui/ part.
    2.	If Octane Server is down, you might see in the Octane start task log: “[ERROR]{"code":"ECONNREFUSED","errno":"ECONNREFUSED","syscall":"connect","address":"192.168.1.129","port":9090}”
    3.	If you specified wrong credentials or the API key was revoked in Octane.
4.	All tests which are running with surefire plugin, for example, regardless of their nature, will be published to Octane as Automated runs. 
5.	In comparison with Jenkins, for example, currently the extension does not support injecting events of jobs/sub-jobs that are running in Azure. This means that you will have only one job injected in Octane which will be the Octane Start task, and which will show as completed with the related status when the pipeline ends with the Octane End Task. This behavior is limited because of the way Azure DevOps Pipelines currently work.
6.	YAML is based on TABs, and as such, if you miss a TAB you might end up with a wrongly formatted YAML file and as such the pipeline will not work.
7.	After the Azure pipeline is created in ALM Octane, follow the next steps to be able to run the pipeline from the ALM Octane side, as described here: https://admhelp.microfocus.com/octane/en/25.1/Online/Content/AdminGuide/how_config_CI_plugin.htm#mt-item-5

8. If you cancel a pipeline run, before the initialization job takes place, you will not see that particular run in the product with the status "Aborted". This behaviour is expected since neither the start task or the end task have time to execute, given the quick cancelation of the run.

## 11. Change logs
## 25.4.1 version Release notes
* Added Node 20 support for task runners with fallback to Node 16; removes EOL warning on modern agents.
## 25.4.0 version Release notes 
* Added support for running pipelines with parameters from the product
* Added support for aborted pipeline runs
* Secret variables set in Azure DevOps will not be shown in the product
## 1.0.0.8 version Release notes
* Added project name into pipeline name
## 1.0.0.7 version Release notes
* Upgraded ALM Octane Js SDK Version
## 1.0.0.6 version Release notes
* Fix defects
## 1.0.0.5 version Release notes
* Add option to define pipeline name create on ALM Octane or use it's full folder path.
* Fix issue that not all test result was sent to ALM Octane.
* Fix issue that test result was sent without escape characters.
## 1.0.0.4 version Release notes
* Added support to Testing Framework for running test using test runners starting from version 23.4 of ALM Octane.
* Added possibility to skip creation of ALM Octane pipelines starting from version 23.4 of ALM Octane.
* Rebranding to Open Text
## 1.0.0.2 version Release notes
* Fix defects
* Fix Documentation
## 1.0.0.1 version Release notes
* Fix defects
## 1.0.0.0 version Release notes
* Updated to major version. The integration (previously tech preview) is now fully supported.
## 0.2.7.6 version Release notes
* Fix test run report path that send to Octane, supported from version 16.1.100 of Octane
## 0.2.7.3 version Release notes
* Fix defects
* Added support for multi-branch pipelines:  
  ALM Octane automatically creates a corresponding child pipeline whenever a new branch is built for the first time.   
  Existing pipelines are upgraded to be multi-branch.
## 0.2.7.0 version Release notes
* Send parameters structure to Octane, from version 16.1.18.
* Send parameters values executed to Octane, from version 16.1.18.
* Fix defects
## 0.2.6.0 version Release notes
* Update Octane CI Server plugin version.
* Ability to run Azure DevOps pipelines from within ALM Octane, from version 16.0.400.
## 0.2.5.7 version Release notes
* Report to Octane duration of the pipeline run
## 0.2.5.6 version Release notes
* handle multi changes per commit
* report to Octane max number of commits the Azure devops API return
## 0.2.5.5 version Release notes
* Fix issue with unknown change type on commits, and added logs

## 0.2.5.4 version Release notes
* Added support for Gherkin injection
* Various other improvements, including bug fixes and logs

## 0.2.3.1 version Release notes
* Fixed 401 error in tasks not showing as failed
* Homogenized public and private extensions. Currently, besides Azure DevOps required manifests and versions there will not be any difference between the private and the public extension.
* Other non functional improvements



