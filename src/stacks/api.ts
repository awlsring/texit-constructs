import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { HttpApi } from "aws-cdk-lib/aws-apigatewayv2";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { IStateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { TexitApi } from "../constructs/texit/texit-api";

export interface TexitApiStackProps extends StackProps {
  /**
   * The path to the directory containing the Texit binary.
   */
  readonly binaryPath: string;
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
}

/**
 * Stack that deploys the Texit API.
 */
export class TexitApiStack extends Stack {
  readonly handler: IFunction;
  readonly api: HttpApi;

  constructor(scope: Construct, id: string, props: TexitApiStackProps) {
    super(scope, id, props);

    const texit = new TexitApi(this, "api", {
      binaryPath: props.binaryPath,
      configBucket: props.configBucket,
      configObject: props.configObject,
      nodeTable: props.nodeTable,
      executionTable: props.executionTable,
      provisionNodeWorkflow: props.provisionNodeWorkflow,
      deployNodeWorkflow: props.deployNodeWorkflow,
    });
    this.handler = texit.handler;
    this.api = texit.api;

    new CfnOutput(this, "api-url", {
      exportName: "api-url",
      value: this.api.url!,
    });
  }
}
