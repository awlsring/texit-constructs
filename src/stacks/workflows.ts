import { Stack, StackProps } from 'aws-cdk-lib';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IStateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';
import { DeprovisionNodeWorkflow } from '../constructs/texit/workflow/deprovision-node-workflow';
import { ProvisionNodeWorkflow } from '../constructs/texit/workflow/provision-node-workflow';
import { WorkflowHandler } from '../constructs/texit/workflow/workflow-handler';

export interface TexitWorkflowsStackProps extends StackProps {
  /**
   * The path to the directory containing the Texit SFN Activity binary.
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
   * The object key of the Texit configuration file.
   *
   * @default config.yaml
   */
  readonly configObject?: string;
}

/**
 * Stack that deploys the Texit workflows.
 */
export class TexitWorkflowsStack extends Stack {
  readonly provisionNodeWorkflow: IStateMachine;
  readonly deprovisionNodeWorkflow: IStateMachine;

  constructor(scope: Construct, id: string, props: TexitWorkflowsStackProps) {
    super(scope, id, props);

    const handler = new WorkflowHandler(this, 'workflow-handler', {
      binaryPath: props.binaryPath,
      configBucket: props.configBucket,
      configObject: props.configObject,
    });
    props.configBucket.grantRead(handler);
    props.nodeTable.grantReadWriteData(handler);
    props.executionTable.grantReadWriteData(handler);

    const provisionNode = new ProvisionNodeWorkflow(
      this,
      'provision-node-workflow',
      {
        handler,
      },
    );
    this.provisionNodeWorkflow = provisionNode.stateMachine;

    const deprovisionNode = new DeprovisionNodeWorkflow(
      this,
      'deprovision-node-workflow',
      {
        handler,
      },
    );
    this.deprovisionNodeWorkflow = deprovisionNode.stateMachine;
  }
}
