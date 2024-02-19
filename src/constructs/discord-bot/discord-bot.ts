import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AttributeType, BillingMode, ITable, Table } from 'aws-cdk-lib/aws-dynamodb';
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
import { Construct } from 'constructs';

export interface DiscordHandlerProps {
  readonly functionName?: string;
  readonly environment?: Record<string, string>;
  readonly architecture?: Architecture;
  readonly logRetention?: RetentionDays;
  readonly timeout?: Duration;
}

export interface TexitDiscordBotProps {
  readonly botBinary: Code;
  readonly callbackBinary: Code;
  readonly handler?: DiscordHandlerProps;
  readonly callbackTopic: ITopic;
  readonly configBucket: IBucket;
  readonly configObject?: string;
  readonly texitEndpoint?: string;
}

export class TexitDiscordBot extends Construct {
  readonly trackedExecution: ITable;
  readonly callbackHandler: IFunction;
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitDiscordBotProps) {
    super(scope, id);

    this.trackedExecution = new Table(this, 'tracked-execution', {
      tableName: 'TrackedExecutions',
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.handler = new Function(this, 'api-handler', {
      functionName: props.handler?.functionName ?? 'TexitDiscordBotHandler',
      handler: 'main',
      code: props.botBinary,
      runtime: Runtime.PROVIDED_AL2023,
      architecture: props.handler?.architecture ?? Architecture.ARM_64,
      logRetention: props.handler?.logRetention ?? RetentionDays.ONE_WEEK,
      timeout: props.handler?.timeout ?? Duration.seconds(30),
      environment: {
        CONFIG_BUCKET: props.configBucket.bucketName,
        CONFIG_OBJECT: props.configObject ?? 'config.yaml',
        TEXIT_ENDPOINT: props.texitEndpoint ?? '',
        TRACKED_EXECUTION_TABLE: this.trackedExecution.tableName,
      },
    });
    props.configBucket.grantRead(this.handler);

    this.callbackHandler = new Function(this, 'callback-handler', {
      functionName: 'TexitDiscordCallbackHandler',
      handler: 'main',
      code: props.callbackBinary,
      runtime: Runtime.PROVIDED_AL2023,
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(30),
      environment: {
        CONFIG_BUCKET: props.configBucket.bucketName,
        CONFIG_OBJECT: props.configObject ?? 'config.yaml',
        TEXIT_ENDPOINT: props.texitEndpoint ?? '',
        TRACKED_EXECUTION_TABLE: this.trackedExecution.tableName,
      },
    });

    const integration = new HttpLambdaIntegration(
      'api-integration',
      this.handler,
    );
    this.api = new HttpApi(this, 'api', {
      apiName: 'TexitDiscordBot',
      defaultIntegration: integration,
    });
  }
}
