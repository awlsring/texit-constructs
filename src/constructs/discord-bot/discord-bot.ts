import { Duration } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  Architecture,
  Code,
  Function,
  IFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface DiscordHandlerProps {
  readonly functionName?: string;
  readonly environment?: Record<string, string>;
  readonly architecture?: Architecture;
  readonly logRetention?: RetentionDays;
  readonly timeout?: Duration;
}

export interface TexitDiscordBotProps {
  readonly binary: Code;
  readonly handler?: DiscordHandlerProps;
  readonly configBucket: IBucket;
  readonly configObject?: string;
  readonly texitEndpoint?: string;
}

export class TexitDiscordBot extends Construct {
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitDiscordBotProps) {
    super(scope, id);

    this.handler = new Function(this, 'api-handler', {
      functionName: props.handler?.functionName ?? 'TexitDiscordBotHandler',
      handler: 'main',
      code: props.binary,
      runtime: Runtime.PROVIDED_AL2023,
      architecture: props.handler?.architecture ?? Architecture.ARM_64,
      logRetention: props.handler?.logRetention ?? RetentionDays.ONE_WEEK,
      timeout: props.handler?.timeout ?? Duration.seconds(30),
      environment: {
        CONFIG_BUCKET: props.configBucket.bucketName,
        CONFIG_OBJECT: props.configObject ?? 'config.yaml',
        TEXIT_ENDPOINT: props.texitEndpoint ?? '',
      },
    });
    props.configBucket.grantRead(this.handler);

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
