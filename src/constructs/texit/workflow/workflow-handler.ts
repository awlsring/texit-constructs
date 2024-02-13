import { Duration } from 'aws-cdk-lib';
import { Architecture, Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface WorkflowHandlerProps {
  readonly configBucket: IBucket;
  readonly binary: Code;
  readonly configObject?: string;
  readonly functionName?: string;
  readonly environment?: Record<string, string>;
  readonly architecture?: Architecture;
  readonly logRetention?: RetentionDays;
  readonly timeout?: Duration;
}

export class WorkflowHandler extends Function {
  constructor(scope: Construct, id: string, props: WorkflowHandlerProps) {
    super(scope, id, {
      runtime: Runtime.PROVIDED_AL2023,
      functionName: props.functionName ?? 'TexitActivityHandler',
      handler: 'main',
      code: props.binary,
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.ONE_WEEK,
      timeout: Duration.seconds(30),
      environment: {
        CONFIG_BUCKET: props.configBucket.bucketName,
        CONFIG_OBJECT: props.configObject ?? 'config.yaml',
        ...props.environment,
      },
    });
  }
}
