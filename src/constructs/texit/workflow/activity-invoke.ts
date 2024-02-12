import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { JsonPath, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';

// @internal
export interface ActivityInvokeProps {
  readonly handler: IFunction;
  readonly activityName: string;
  readonly input: TaskInput;
  readonly resultPath?: string;
}

// @internal
export class ActivityInvoke extends LambdaInvoke {
  constructor(scope: Construct, id: string, props: ActivityInvokeProps) {
    super(scope, id, {
      lambdaFunction: props.handler,
      payload: TaskInput.fromObject({
        activityName: props.activityName,
        input: props.input.value,
      }),
      payloadResponseOnly: true,
      resultPath: props.resultPath ?? JsonPath.DISCARD,
    });
  }
}
