import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as iam from 'aws-cdk-lib/aws-iam'

const SSM_PATH = '/expense-tracker/prod/'
const IMAGE_TAG = 'v1' // bump this when you push a new image

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

    // Logs expire after 30 days so they never become a cost.
    const logGroup = new logs.LogGroup(this, 'ApiLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const api = new lambda.Function(this, 'ApiFunction', {
      runtime: lambda.Runtime.FROM_IMAGE,
      handler: lambda.Handler.FROM_IMAGE,
      code: lambda.Code.fromEcrImage(repo, { tagOrDigest: IMAGE_TAG }),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: Duration.seconds(29),
      logGroup,
      environment: {
        SSM_PATH,
        NODE_ENV: 'production',
      },
    })

    // The function reads its secrets from SSM at cold start.
    api.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath', 'ssm:GetParameters'],
        resources: [
          `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter/expense-tracker/prod`,
          `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter/expense-tracker/prod/*`,
        ],
      }),
    )

    // Public URL, but the app rejects any request without the secret header
    // that only CloudFront will add (x-origin-verify).
    const url = api.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    new CfnOutput(this, 'ApiUrl', { value: url.url })
  }
}
