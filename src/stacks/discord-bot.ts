import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { TexitDiscordBot } from '../constructs/discord-bot/discord-bot';

export interface TexitDiscordBotStackProps extends StackProps {
  readonly binaryPath: string;
  readonly configBucket: IBucket;
  readonly configObject?: string;
  readonly texitEndpoint: string;
}

export class TexitDiscordBotStack extends Stack {
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitDiscordBotStackProps) {
    super(scope, id, props);

    const texit = new TexitDiscordBot(this, 'api', {
      binaryPath: props.binaryPath,
      configBucket: props.configBucket,
      configObject: props.configObject,
      texitEndpoint: props.texitEndpoint,
    });
    this.handler = texit.handler;
    this.api = texit.api;

    new CfnOutput(this, 'discord-api-url', {
      exportName: 'discord-api-url',
      value: this.api.url!,
    });
  }
}
