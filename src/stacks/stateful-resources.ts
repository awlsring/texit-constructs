import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { TexitDatabase } from '../constructs/texit/tables';

export interface StatefulResourcesStackProps extends StackProps {
  /**
   * The path to the directory containing the Texit configuration files.
   */
  readonly configsPath: string;
}

/**
 * Stack that deploys stateful texit resources.
 *
 * This includes the Node DDB Table, Execution DDB Table, and the Config S3 Bucket.
 *
 * The config bucket is used to deploy the config files passed in the `configsPath` parameter.
 */
export class TexitStatefulResourcesStack extends Stack {
  readonly nodesTable: ITable;
  readonly executionsTable: ITable;
  readonly configBucket: Bucket;
  constructor(
    scope: Construct,
    id: string,
    props: StatefulResourcesStackProps,
  ) {
    super(scope, id, props);

    const database = new TexitDatabase(this, 'database');
    this.nodesTable = database.nodesTable;
    this.executionsTable = database.executionsTable;

    this.configBucket = new Bucket(this, 'config-bucket', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new BucketDeployment(this, 'config', {
      sources: [Source.asset(props.configsPath)],
      destinationBucket: this.configBucket,
    });
  }
}
