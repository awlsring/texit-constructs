import {
  DefinitionBody,
  IChainable,
  JsonPath,
  Parallel,
  StateMachine,
  TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { ActivityInvoke } from './activity-invoke';
import { TexitWorkflow, TexitWorkflowProps } from './workflow';

export class DeprovisionNodeWorkflow extends TexitWorkflow {
  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: TexitWorkflowProps) {
    super(scope, id, props);

    const workflowDefinition = this.createActivityChain();

    this.stateMachine = new StateMachine(this, 'statemachine', {
      stateMachineName: 'DeprovisionNodeWorkflow',
      definitionBody: DefinitionBody.fromChainable(workflowDefinition),
    });
  }

  protected createActivityChain(): IChainable {
    const deleteNode = new ActivityInvoke(this, 'DeleteNode', {
      handler: this.handler,
      activityName: 'deleteNode',
      input: TaskInput.fromObject({
        nodeId: JsonPath.stringAt('$.nodeId'),
      }),
    });

    const removeTailnetDevice = new ActivityInvoke(
      this,
      'RemoveTailnetDevice',
      {
        handler: this.handler,
        activityName: 'removeTailnetDevice',
        input: TaskInput.fromObject({
          tailnetName: JsonPath.stringAt('$.tailnetName'),
          tailnetDeviceId: JsonPath.stringAt('$.tailnetDeviceId'),
        }),
      },
    );

    const deleteNodeRecord = new ActivityInvoke(this, 'DeleteNodeRecord', {
      handler: this.handler,
      activityName: 'deleteNodeRecord',
      input: TaskInput.fromObject({
        nodeId: JsonPath.stringAt('$.nodeId'),
      }),
    });

    const closeExecutionSuccess = new ActivityInvoke(
      this,
      'CloseExecutionSuccess',
      {
        handler: this.handler,
        activityName: 'closeExecution',
        input: TaskInput.fromObject({
          workflowName: 'deprovision-node',
          executionId: JsonPath.stringAt('$.executionId'),
          status: 'complete',
        }),
      },
    );
    const closeExecutionFailure = new ActivityInvoke(
      this,
      'CloseExecutionFailure',
      {
        handler: this.handler,
        activityName: 'closeExecution',
        input: TaskInput.fromObject({
          workflowName: 'deprovision-node',
          executionId: JsonPath.stringAt('$.executionId'),
          status: 'failed',
          results: TaskInput.fromObject({
            error: JsonPath.stringAt('$.error.Cause'),
          }).value,
        }),
      },
    );

    const chain = deleteNode.next(removeTailnetDevice).next(deleteNodeRecord);

    const container = new Parallel(this, 'workflow', {
      outputPath: '$[0]',
    }).branch(chain);

    container.addCatch(closeExecutionFailure, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    container.next(closeExecutionSuccess);

    return container;
  }
}
