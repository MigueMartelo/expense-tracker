import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'

export class ExpenseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Where the Lambda container image lives.
    // Keeping only the last 3 images keeps storage (the main cost) near zero.
    const repo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'expense-tracker-api',
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [{ maxImageCount: 3 }],
    })
  }
}
