import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IFunction, Code } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { TexitApi } from '../constructs/texit/texit-api';
import { TexitSnsNotifier } from '../constructs/texit/texit-sns-notifier';

export interface TexitApiStackProps extends StackProps {
  /**
   * The code asset to deploy
   */
  readonly binary: Code;
  /**
   * The S3 bucket containing the Texit configuration file.
   */
  readonly configBucket: IBucket;
  /**
   * The Node DDB Table.
   */
  readonly nodeTable: ITable;
  /**
   * The Execution DDB Table.
   */
  readonly executionTable: ITable;
  /**
   * The provision node workflow.
   */
  readonly provisionNodeWorkflow: IStateMachine;
  /**
   * The deploy node workflow.
   */
  readonly deployNodeWorkflow: IStateMachine;
  /**
   * The object key of the Texit configuration file.
   *
   * @default config.yaml
   */
  readonly configObject?: string;
  /**
   * If the sns notifier should be made.
   */
  readonly disableNotifier?: boolean;
}

/**
 * Stack that deploys the Texit API.
 */
export class TexitApiStack extends Stack {
  readonly notifierTopic?: ITopic;
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitApiStackProps) {
    super(scope, id, props);

    if (!props.disableNotifier) {
      this.notifierTopic = new TexitSnsNotifier(this, 'notifier');
    }

    const texit = new TexitApi(this, 'api', {
      binary: props.binary,
      configBucket: props.configBucket,
      configObject: props.configObject,
      nodeTable: props.nodeTable,
      executionTable: props.executionTable,
      provisionNodeWorkflow: props.provisionNodeWorkflow,
      deployNodeWorkflow: props.deployNodeWorkflow,
      snsNotifier: this.notifierTopic,
    });
    this.handler = texit.handler;
    this.api = texit.api;

    new CfnOutput(this, 'api-url', {
      exportName: 'api-url',
      value: this.api.url!,
    });
  }
}
