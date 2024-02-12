import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { TexitDatabase } from '../constructs/texit/tables';

export interface StatefulResourcesStackProps extends StackProps {
  readonly configsPath: string;
}

export class StatefulResourcesStack extends Stack {
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
