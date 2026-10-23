import { App } from 'aws-cdk-lib'
import { ExpenseStack } from '../lib/expense-stack'

const app = new App()

new ExpenseStack(app, 'ExpenseTrackerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-2',
  },
})
