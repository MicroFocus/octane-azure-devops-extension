# ALM Octane Integration with Microsoft Azure Devops Services
## Tech Design

### Research findings

##### How other CI plugins communicate with ALM Octane 
* ALM Octane plugins utilize the long-polling technique in order to fetch tasks from the ALM Octane server (the CI plugin periodically sends HTTP requests to the ALM Octane server).
* When the task result is ready - the CI plugin sends another HTTP request in order to notify ALM Octane with the result.
* In addition, the CI plugin sends build-time life-cycle events.
  * Pipeline start/end events.
  * Pipeline node start/end.
  * SCM events.
* Requests are never directly sent from ALM Octane to the CI plugin.

##### "Azure DevOps Services" is different
* No continuously running processes can be added by Azure DevOps extensions
* The only allowed custom code execution is running custom build tasks contributed by extensions.
* Conclusion: the long-polling technique is not applicable to Azure DevOps.

##### Azure DevOps extensions - relevant contribution types(extensibility points)
* <a href="https://docs.microsoft.com/en-us/azure/devops/extend/develop/service-endpoints?view=azure-devops"><b>Service Endpoint types.</b></a> Every service endpoint is:
  * Filled out through auto-generated UI forms.
  * Persisted at the project level.
  * Can be passed as a parameter to any build task (builtin and custom).
  * Can be queried for data in the task code.
* <a href="https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-build-task?toc=%2Fazure%2Fdevops%2Fextend%2Ftoc.json&bc=%2Fazure%2Fdevops%2Fextend%2Fbreadcrumb%2Ftoc.json&view=azure-devops"><b>Custom Task types.</b></a> Every custom task:
  * Contains an executable code.
  * Can be added to a build job.
  * Can receive parameters.
* <a href="https://docs.microsoft.com/en-us/azure/devops/extend/develop/add-pipeline-decorator?toc=%2Fazure%2Fdevops%2Fextend%2Ftoc.json&bc=%2Fazure%2Fdevops%2Fextend%2Fbreadcrumb%2Ftoc.json&view=azure-devops"><b>Pipeline Decorators.</b></a> Every decorator adds a YML fragment that can:
  * Contain any pipeline-related definitions.
  * Be automatically added to the beginning of every job.
  * Be automatically added to the end of every job.
  * Depend on a condition.

### Feature Design

##### ALM Octane side
In the current scope the following capabilities should be either **disabled or reimplemented** for the Azure DevOps CI Server type:
* Get list of CI servers available for connection (disabled by definition).
* Get list of pipelines for a particular CI server (disabled by definition).
* Get details of a particular pipeline (internal action - should be reimplemented).
* Start a particular pipeline (should be disabled).
  ###### Re-implementation
  Currently, actions triggered by Octane have the default implementation of queueing the appropriate tasks to be collected by the CI server plugins. Since this default implementation doesn't meet our needs, we suggest to develop "per CI server type" implementations where the fallback implementation is the default one.
  Every implementation will be instantiated by a factory class based on the CI server type name. For example (pseudo-code):
  ```
    TaskProcessor processor = TaskProcessorFactory.getTaskProcessor(ciServerType);
    if(processor != null) {
      processor.processTask(task);  
    } else {
      TaskProcessorFactory.getDefaultProcessor().processTask(task);
    }
  ```
  In our case, the default task processor should keep queueing the tasks to wait for being collected by a CI server plugin while the Azure DevOps task processor should apply its own logic (fortunately for the upcoming release we don't need to invoke the Azure DevOps API).  
##### Azure DevOps side
###### General highlights:
<ul>
  <li>The integration flow is driven by custom tasks auto-injected in runtime into every pipeline (utilizing the pipeline decorator capabilities).</li>
  <li>The tasks are written in TypeScript and compiled to JavaScript, following Microsoft's guidelines.</li>
  <li><b>@microfocus/alm-octane-js-rest-sdk</b> node.js REST-client library is used in order to communicate with the ALM Octane server from the tasks' code.</li>
  <li><b>microsoft/azure-devops-node-api</b> node.js REST-client library is used in order to communicate with the Azure DevOps server from the tasks' code.</li>
</ul>

###### Design time flow:
* The user creates a new service endpoint of type "ALM Octane Server Connection" in the project settings. He provides the following attributes:
  * Name
  * Octane Server URL
  * API Client ID
  * API Client Secret
  * CI Server Instance ID (optional)
* The user starts a build
###### Runtime flow:
* The build starts
* Two tasks, PipelineStartTask and PipelineEndTask, are auto-injected by the pipeline decorator to the beginning and the end of the pipeline accordingly.
* The first task executed by the build is the **PipelineStartTask** task. It takes care of:
  * Creating the CI Server and Pipeline entities in ALM Octane if they don't exist.
  * Sending pipeline start event to ALM Octane.
* The last task executed by the build is the **PipelineEndTask** task. It takes case of:
  * Collecting test results from the build.
  * Injecting test results.
  * Sending pipeline end event to ALM Octane.
  
#### Summary of the actions grouped by task 
###### PipelineStartTask:
<table>
  <tbody>
    <tr>
      <th>Action</th>
      <th>Implementation</th>
    </tr>
    <tr>
      <td>Check whether a CI Server already exists in Octane</td>
      <td>Call Octane REST API</td>
    </tr>
    <tr>
      <td>Create a CI Server in Octane</td>
      <td>Call Octane REST API</td>
    </tr>
    <tr>
      <td>Check whether a pipeline already exists in Octane</td>
      <td>Call Octane REST API</td>
    </tr>
    <tr>
      <td>Create a pipeline in Octane</td>
      <td>Call Octane REST API</td>
    </tr>
    <tr>
      <td>Send <b>pipeline start</b> event</td>
      <td>Call Octane Internal API</td>
    </tr>
  </tbody>
</table>

###### PipelineEndTask:
<table>
  <tbody>
    <tr>
      <th>Action</th>
      <th>Implementation</th>
    </tr>
    <tr>
      <td>Collect test results</td>
      <td>Call Azure Devops REST API</td>
    </tr>
    <tr>
      <td>Inject test results</td>
      <td>Call Octane Internal API</td>
    </tr>
    <tr>
      <td>Send <b>pipeline end</b> event</td>
      <td>Call Octane Internal API</td>
    </tr>
  </tbody>
</table>

#### Open issues
We need to find how to let a fragments injected by the pipeline decorator determine if it's the first task, the last task or an internal one.  


