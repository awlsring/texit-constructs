import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { Code, IFunction } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { TexitDiscordBot } from '../constructs/discord-bot/discord-bot';

export interface TexitDiscordBotStackProps extends StackProps {
  /**
   * The code asset to deploy for the bot
   */
  readonly botBinary: Code;
  /**
   * The code asset to deploy for the callback handler
   */
  readonly callbackBinary: Code;
  /**
   * The S3 bucket containing the Texit configuration file.
   */
  readonly configBucket: IBucket;
  /**
   * The Texit SNS Topic that notifies execution completion.
   */
  readonly callbackTopic: ITopic;
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
      botBinary: props.botBinary,
      callbackBinary: props.callbackBinary,
      configBucket: props.configBucket,
      configObject: props.configObject,
      texitEndpoint: props.texitEndpoint,
      callbackTopic: props.callbackTopic,
    });
    this.handler = texit.handler;
    this.api = texit.api;

    new CfnOutput(this, 'discord-api-url', {
      exportName: 'discord-api-url',
      value: this.api.url!,
    });
  }
}
