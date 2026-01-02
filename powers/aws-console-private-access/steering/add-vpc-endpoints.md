---
inclusion: manual
---

# Adding VPC Endpoints for Additional AWS Services

This guide explains how to add VPC endpoints for additional AWS services to your Console Private Access setup.

## Overview

The base configuration includes VPC endpoints for:
- **Console** - AWS Management Console
- **Signin** - AWS Signin service
- **SSM** - AWS Systems Manager (for EC2 access)
- **EC2Messages** - EC2 Systems Manager messages
- **SSMMessages** - Systems Manager messages
- **S3** - Amazon S3 (Gateway endpoint)

You can add endpoints for other AWS services like Lambda, API Gateway, DynamoDB, and more.

## How to Request New Endpoints

Simply ask me to add endpoints for the services you need. For example:

```
Add VPC endpoints for Lambda and API Gateway
```

Or:

```
I need to add endpoints for DynamoDB, SQS, and SNS
```

## What Happens When You Request New Endpoints

When you request new endpoints, I will:

1. **Look up service details** via AWS documentation to find:
   - The exact VPC endpoint service name for each service
   - Whether the service uses Interface or Gateway endpoints
   - Any service-specific configuration requirements

2. **Generate endpoint code** that:
   - Follows the same pattern as existing endpoints
   - Enables private DNS for automatic DNS resolution
   - Applies restrictive endpoint policies (limited to your AWS account)
   - Uses the same security group configuration

3. **Update your CDK stack** by:
   - Adding new endpoint definitions to `lib/aws-console-private-access-setup-stack.ts`
   - Preserving all existing endpoints and configurations
   - Maintaining code consistency and formatting

4. **Validate the configuration** to ensure:
   - All endpoints have policies configured
   - All endpoints have private DNS enabled
   - No conflicts with existing endpoints

## Common Services with VPC Endpoints

Here are some commonly requested services that support VPC endpoints:

| Service | Type | Use Case |
|---------|------|----------|
| **Lambda** | Interface | Invoke Lambda functions from private subnets |
| **API Gateway** | Interface | Call API Gateway endpoints privately |
| **DynamoDB** | Gateway | Access DynamoDB tables without internet |
| **SQS** | Interface | Send/receive messages from private subnets |
| **SNS** | Interface | Publish/subscribe to topics privately |
| **Secrets Manager** | Interface | Retrieve secrets from private subnets |
| **Parameter Store** | Interface | Access SSM parameters privately |
| **CloudWatch Logs** | Interface | Send logs from private subnets |
| **ECR** | Interface | Pull container images privately |
| **S3** | Gateway | Already included in base config |

## Private DNS

All endpoints created through this workflow have **private DNS enabled**. This means:

- DNS queries for the service automatically resolve to the VPC endpoint
- Applications don't need to know about the endpoint - they just use the standard AWS service hostname
- For example, `lambda.us-east-1.amazonaws.com` automatically resolves to the Lambda VPC endpoint

## Endpoint Policies

All endpoints use the same restrictive policy pattern:

```
Allow: All actions (*) on all resources (*)
Condition: Only for requests from your AWS account
```

This ensures:
- Services can only be accessed from within your VPC
- Access is restricted to your AWS account
- No cross-account access is possible

## Limitations

Some AWS services don't have VPC endpoints available. If you request an endpoint for a service that doesn't support it, I'll let you know and suggest alternatives.

## Example: Adding Lambda and API Gateway

When you ask to add Lambda and API Gateway endpoints:

1. I'll search AWS documentation for the exact service names
2. I'll generate code like:

```typescript
// Lambda Interface Endpoint
const lambdaEndpoint = vpc.addInterfaceEndpoint('LambdaEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
  privateDnsEnabled: true,
  subnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [vpcEndpointSG],
});

lambdaEndpoint.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
    actions: ['*'],
    resources: ['*'],
    conditions: {
      StringEquals: {
        'aws:PrincipalAccount': this.account,
      },
    },
  })
);

// API Gateway Interface Endpoint
const apigatewayEndpoint = vpc.addInterfaceEndpoint('APIGatewayEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
  privateDnsEnabled: true,
  subnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [vpcEndpointSG],
});

apigatewayEndpoint.addToPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],
    actions: ['*'],
    resources: ['*'],
    conditions: {
      StringEquals: {
        'aws:PrincipalAccount': this.account,
      },
    },
  })
);
```

3. I'll add this code to your CDK stack
4. I'll validate that everything is configured correctly
5. I'll show you the changes and confirm validation passed

## Next Steps

Ready to add endpoints? Just ask me which services you need!

For example:
- "Add VPC endpoints for Lambda"
- "I need endpoints for DynamoDB and SQS"
- "Add API Gateway, Secrets Manager, and CloudWatch Logs endpoints"
