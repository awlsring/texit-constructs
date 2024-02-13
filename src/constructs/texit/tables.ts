import { RemovalPolicy } from 'aws-cdk-lib';
import {
  AttributeType,
  BillingMode,
  ITable,
  Table,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface TableProps {
  readonly tableName?: string;
  readonly billingMode?: BillingMode;
  readonly removalPolicy?: RemovalPolicy;
}

export interface TexitDatabaseProps {
  readonly nodesTableOverrides?: TableProps;
  readonly executionsTableOverrides?: TableProps;
}

export class TexitDatabase extends Construct {
  readonly nodesTable: ITable;
  readonly executionsTable: ITable;

  constructor(scope: Construct, id: string, props?: TexitDatabaseProps) {
    super(scope, id);

    this.nodesTable = new Table(this, 'nodes-table', {
      tableName: props?.nodesTableOverrides?.tableName ?? 'TexitNodes',
      partitionKey: { name: 'identifier', type: AttributeType.STRING },
      billingMode:
        props?.nodesTableOverrides?.billingMode ?? BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        props?.executionsTableOverrides?.removalPolicy ?? RemovalPolicy.DESTROY,
    });

    this.executionsTable = new Table(this, 'executions-table', {
      tableName:
        props?.executionsTableOverrides?.tableName ?? 'TexitExecutions',
      partitionKey: { name: 'identifier', type: AttributeType.STRING },
      timeToLiveAttribute: 'ttl',
      billingMode:
        props?.executionsTableOverrides?.billingMode ??
        BillingMode.PAY_PER_REQUEST,
      removalPolicy:
        props?.executionsTableOverrides?.removalPolicy ?? RemovalPolicy.DESTROY,
    });
  }
}
