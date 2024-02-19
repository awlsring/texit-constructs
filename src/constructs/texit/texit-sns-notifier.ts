import { Topic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface TexitSnsNotifierProps {
  readonly topicName?: string;
  readonly displayName?: string;
}

export class TexitSnsNotifier extends Topic {
  constructor(scope: Construct, id: string, props?: TexitSnsNotifierProps) {
    super(scope, id, {
      topicName: props?.topicName ?? 'TexitNotifier',
      displayName: props?.displayName ?? 'Texit Notifier',
    });
  }
}