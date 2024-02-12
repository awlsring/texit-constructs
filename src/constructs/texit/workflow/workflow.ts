import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { IChainable, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { Construct } from 'constructs';

export interface TexitWorkflowProps {
  readonly handler: IFunction;
}

// @internal
export abstract class TexitWorkflow extends Construct {
  protected handler: IFunction;
  abstract readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, props: TexitWorkflowProps) {
    super(scope, id);

    this.handler = props.handler;
  }

  protected abstract createActivityChain(): IChainable;
}
