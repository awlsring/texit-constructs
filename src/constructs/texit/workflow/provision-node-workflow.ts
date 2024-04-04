import { Duration } from 'aws-cdk-lib';
import {
  Choice,
  Condition,
  DefinitionBody,
  IChainable,
  JsonPath,
  Parallel,
  Pass,
  StateMachine,
  TaskInput,
  Wait,
  WaitTime,
} from 'aws-cdk-lib/aws-stepfunctions';
import { EvaluateExpression } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { ActivityInvoke } from './activity-invoke';
import { TexitWorkflow, TexitWorkflowProps } from './workflow';

export class ProvisionNodeWorkflow extends TexitWorkflow {
  readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: TexitWorkflowProps) {
    super(scope, id, props);

    const workflowDefinition = this.createActivityChain();

    this.stateMachine = new StateMachine(this, 'statemachine', {
      stateMachineName: 'ProvisionNodeWorkflow',
      definitionBody: DefinitionBody.fromChainable(workflowDefinition),
    });
  }

  protected createActivityChain(): IChainable {
    const formIdentifiers = new ActivityInvoke(this, 'FormIdentifiers', {
      handler: this.handler,
      activityName: 'formIdentifiers',
      input: TaskInput.fromObject({
        location: JsonPath.stringAt('$.location'),
      }),
      resultPath: '$.formedIdentifiers',
    });

    const createPreauthKey = new ActivityInvoke(this, 'CreatePreauthKey', {
      handler: this.handler,
      activityName: 'createPreauthKey',
      input: TaskInput.fromObject({
        tailnetName: JsonPath.stringAt('$.tailnetName'),
        ephemeral: JsonPath.stringAt('$.ephemeral'),
      }),
      resultPath: '$.preauthKey',
    });

    const createNodeRecord = new ActivityInvoke(this, 'CreateNodeRecord', {
      handler: this.handler,
      activityName: 'createNodeRecord',
      input: TaskInput.fromObject({
        nodeId: JsonPath.stringAt('$.formedIdentifiers.nodeId'),
        providerName: JsonPath.stringAt('$.providerName'),
        location: JsonPath.stringAt('$.location'),
        tailnetName: JsonPath.stringAt('$.tailnetName'),
        tailnetDeviceName: JsonPath.stringAt(
          '$.formedIdentifiers.tailnetDeviceName',
        ),
        size: JsonPath.stringAt('$.size'),
        ephemeral: JsonPath.stringAt('$.ephemeral'),
      }),
    });

    const createNode = new ActivityInvoke(this, 'CreateNode', {
      handler: this.handler,
      activityName: 'createNode',
      input: TaskInput.fromObject({
        providerName: JsonPath.stringAt('$.providerName'),
        location: JsonPath.stringAt('$.location'),
        nodeId: JsonPath.stringAt('$.formedIdentifiers.nodeId'),
        tailnetDeviceName: JsonPath.stringAt(
          '$.formedIdentifiers.tailnetDeviceName',
        ),
        tailnetControlServer: JsonPath.stringAt('$.tailnetControlServer'),
        preauthKey: JsonPath.stringAt('$.preauthKey'),
        size: JsonPath.stringAt('$.size'),
      }),
      resultPath: '$.platformId',
    });
    const getTailnetDeviceId = new ActivityInvoke(this, 'GetTailnetDeviceId', {
      handler: this.handler,
      activityName: 'getDeviceId',
      input: TaskInput.fromObject({
        tailnetName: JsonPath.stringAt('$.tailnetName'),
        tailnetDeviceName: JsonPath.stringAt(
          '$.formedIdentifiers.tailnetDeviceName',
        ),
      }),
      resultPath: '$.tailnetDeviceId',
    });
    const setRetryCounters = new Pass(this, 'SetRetryCounters', {
      parameters: {
        retryCount: 0,
      },
      resultPath: '$.GetDeviceId',
    });
    const incrementRetryCount = new EvaluateExpression(
      this,
      'IncrementRetryCount',
      {
        expression: '$.GetDeviceId.retryCount + 1',
        resultPath: '$.GetDeviceId.retryCount',
      },
    );
    const getDeviceChoice = new Choice(this, 'ShouldRetryGetTailnet');
    const getTailnetWait = new Wait(this, 'WaitForTailnet', {
      time: WaitTime.duration(Duration.seconds(10)),
    });
    const enableExitNode = new ActivityInvoke(this, 'EnableExitNode', {
      handler: this.handler,
      activityName: 'enableExitNode',
      input: TaskInput.fromObject({
        tailnetName: JsonPath.stringAt('$.tailnetName'),
        tailnetDeviceId: JsonPath.stringAt('$.tailnetDeviceId'),
      }),
    });
    const updateNodeRecord = new ActivityInvoke(this, 'CreateNodeRecord', {
      handler: this.handler,
      activityName: 'updateNodeRecord',
      input: TaskInput.fromObject({
        nodeId: JsonPath.stringAt('$.formedIdentifiers.nodeId'),
        platformId: JsonPath.stringAt('$.platformId'),
        providerName: JsonPath.stringAt('$.providerName'),
        location: JsonPath.stringAt('$.location'),
        preauthKey: JsonPath.stringAt('$.preauthKey'),
        tailnetName: JsonPath.stringAt('$.tailnetName'),
        tailnetDeviceId: JsonPath.stringAt('$.tailnetDeviceId'),
        tailnetDeviceName: JsonPath.stringAt(
          '$.formedIdentifiers.tailnetDeviceName',
        ),
        size: JsonPath.stringAt('$.size'),
        ephemeral: JsonPath.stringAt('$.ephemeral'),
      }),
    });
    const closeExecutionSuccess = new ActivityInvoke(
      this,
      'CloseExecutionSuccess',
      {
        handler: this.handler,
        activityName: 'closeExecution',
        input: TaskInput.fromObject({
          workflowName: 'provision-node',
          executionId: JsonPath.stringAt('$.executionId'),
          status: 'complete',
          results: TaskInput.fromObject({
            NodeId: JsonPath.stringAt('$.formedIdentifiers.nodeId'),
          }).value,
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
          workflowName: 'provision-node',
          executionId: JsonPath.stringAt('$.executionId'),
          status: 'failed',
          results: TaskInput.fromObject({
            error: JsonPath.stringAt('$.error.Cause'),
            failedStep: 'GetTailnetDeviceId',
          }).value,
        }),
      },
    );

    const chain = formIdentifiers
      .next(createNodeRecord)
      .next(createPreauthKey)
      .next(createNode)
      .next(setRetryCounters)
      .next(getTailnetWait)
      .next(getTailnetDeviceId)
      .next(enableExitNode)
      .next(updateNodeRecord);

    getTailnetDeviceId.addCatch(getDeviceChoice, {
      errors: ['DeviceNotFoundError'],
      resultPath: JsonPath.DISCARD,
    });

    const timeout = new Pass(this, 'Timeout', {
      result: TaskInput.fromObject({
        error: 'Timeout while waiting for node to join tailnet',
      }).value,
      resultPath: '$.error',
    });
    getDeviceChoice.when(
      Condition.numberGreaterThan('$.GetDeviceId.retryCount', 40),
      timeout,
    );
    getDeviceChoice.otherwise(incrementRetryCount);
    incrementRetryCount.next(getTailnetWait);

    const container = new Parallel(this, 'workflow', {
      outputPath: '$[0]',
    }).branch(chain);

    container.addCatch(closeExecutionFailure, {
      errors: ['States.ALL'],
      resultPath: '$.error',
    });

    const resultDetermination = new Choice(this, 'ResultDetermination');
    resultDetermination.when(
      Condition.isPresent('$.error'),
      closeExecutionFailure,
    );
    resultDetermination.otherwise(closeExecutionSuccess);

    container.next(resultDetermination);

    return container;
  }
}
