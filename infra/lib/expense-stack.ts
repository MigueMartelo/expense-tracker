import { Stack, StackProps, RemovalPolicy, Duration, CfnOutput } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecr from 'aws-cdk-lib/aws-ecr'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as sns from 'aws-cdk-lib/aws-sns'
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions'
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch'
import * as cwActions from 'aws-cdk-lib/aws-cloudwatch-actions'

const SSM_PATH = '/expense-tracker/prod/'
const IMAGE_TAG = process.env.IMAGE_TAG // set by script/deploy.sh

export class ExpenseStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    // Same value that is stored in SSM; passed in at deploy time.
    const originSecret = process.env.ORIGIN_VERIFY_SECRET
    if (!originSecret) {
      throw new Error('Set ORIGIN_VERIFY_SECRET before running cdk')
    }

    if(!IMAGE_TAG) {
      throw new Error('Set IMAGE_TAG before running cdk')
    }

    const alertEmail = process.env.ALERT_EMAIL
    if (!alertEmail) {
      throw new Error('Set ALERT_EMAIL before running cdk')
    }

    // ---------- Backend ----------
    const repo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: 'expense-tracker-api',
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      lifecycleRules: [{ maxImageCount: 3 }],
    })

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
      environment: { SSM_PATH, NODE_ENV: 'production' },
    })

    api.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParametersByPath', 'ssm:GetParameters'],
        resources: [
          `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter/expense-tracker/prod`,
          `arn:${this.partition}:ssm:${this.region}:${this.account}:parameter/expense-tracker/prod/*`,
        ],
      }),
    )

    const url = api.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    })

    // ---------- Frontend ----------
    // Private bucket: only CloudFront can read it (Origin Access Control).
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })

    // SPA routing: any path without a file extension serves index.html.
    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.uri.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}`),
    })

    // ---------- CloudFront: single entry point ----------
    const cdn = new cloudfront.Distribution(this, 'Cdn', {
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [
          { function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.FunctionUrlOrigin(url, {
            customHeaders: { 'x-origin-verify': originSecret },
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    })

        // ---------- Alerts ----------
    const alertTopic = new sns.Topic(this, 'AlertTopic')
    alertTopic.addSubscription(new subscriptions.EmailSubscription(alertEmail))
    const alarmAction = new cwActions.SnsAction(alertTopic)

    // 1) Lambda-level failures (crashes, timeouts)
    new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmDescription: 'The API Lambda reported errors',
      metric: api.metricErrors({ period: Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    // 2) Application-level errors written to the logs
    const appErrors = logGroup.addMetricFilter('AppErrorsFilter', {
      metricNamespace: 'ExpenseTracker',
      metricName: 'AppErrors',
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Task timed out'),
      metricValue: '1',
    })
    new cloudwatch.Alarm(this, 'AppErrorsAlarm', {
      alarmDescription: 'ERROR lines found in the API logs',
      metric: appErrors.metric({ statistic: 'Sum', period: Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(alarmAction)

    new CfnOutput(this, 'ApiUrl', { value: url.url })
    new CfnOutput(this, 'SiteUrl', { value: `https://${cdn.distributionDomainName}` })
    new CfnOutput(this, 'SiteBucketName', { value: siteBucket.bucketName })
    new CfnOutput(this, 'DistributionId', { value: cdn.distributionId })
  }
}
