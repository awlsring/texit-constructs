import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { TexitDiscordBot } from '../constructs/discord-bot/discord-bot';

export interface TexitDiscordBotStackProps extends StackProps {
  /**
   * The path to the directory containing the Texit Discord binary.
   */
  readonly binaryPath: string;
  /**
   * The S3 bucket containing the Texit configuration file.
   */
  readonly configBucket: IBucket;
  /**
   * The object key of the Texit configuration file.
   *
   * @default config.yaml
   */
  readonly configObject?: string;
  /**
   * The endpoint of the Texit API. If not passed, the texit api will be determined by the config file
   */
  readonly texitEndpoint?: string;
}

/**
 * Stack that deploys the Texit Discord bot.
 */
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
