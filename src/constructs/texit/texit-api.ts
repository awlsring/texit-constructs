import { Duration } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import {
  Architecture,
  Code,
  Function,
  IFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export interface TexitHandlerProps {
  readonly functionName?: string;
  readonly environment?: Record<string, string>;
  readonly architecture?: Architecture;
  readonly logRetention?: RetentionDays;
  readonly timeout?: Duration;
}

export interface TexitApiProps {
  readonly binary: Code;
  readonly configBucket: IBucket;
  readonly nodeTable: ITable;
  readonly executionTable: ITable;
  readonly provisionNodeWorkflow: IStateMachine;
  readonly deployNodeWorkflow: IStateMachine;
  readonly configObject?: string;
  readonly handler?: TexitHandlerProps;
  readonly snsNotifier?: ITopic;
}

export class TexitApi extends Construct {
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitApiProps) {
    super(scope, id);

    this.handler = new Function(this, 'api-handler', {
      functionName: props.handler?.functionName ?? 'TexitApiHandler',
      handler: 'main',
      code: props.binary,
      runtime: Runtime.PROVIDED_AL2023,
      architecture: props.handler?.architecture ?? Architecture.ARM_64,
      logRetention: props.handler?.logRetention ?? RetentionDays.ONE_WEEK,
      timeout: props.handler?.timeout ?? Duration.seconds(30),
      environment: {
        CONFIG_BUCKET: props.configBucket.bucketName,
        CONFIG_OBJECT: props.configObject ?? 'config.yaml',
        PROVISION_NODE_WORKFLOW_ARN:
          props.provisionNodeWorkflow.stateMachineArn,
        DEPROVISION_NODE_WORKFLOW_ARN: props.deployNodeWorkflow.stateMachineArn,
        ...props.handler?.environment,
        SNS_NOTIFIER_ARN: props.snsNotifier?.topicArn ?? '',
      },
    });
    props.configBucket.grantRead(this.handler);
    props.nodeTable.grantReadWriteData(this.handler);
    props.executionTable.grantReadWriteData(this.handler);
    props.provisionNodeWorkflow.grantStartExecution(this.handler);
    props.deployNodeWorkflow.grantStartExecution(this.handler);
    props.snsNotifier?.grantPublish(this.handler);

    const integration = new HttpLambdaIntegration(
      'api-integration',
      this.handler,
    );
    this.api = new HttpApi(this, 'api', {
      apiName: 'TexitApi',
      defaultIntegration: integration,
    });
  }
}
