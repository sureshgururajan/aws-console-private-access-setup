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

## Workflow: Adding New Endpoints

When you request new endpoints, I will follow this workflow:

### Step 1: Look Up Service Details Using AWS Documentation MCP

**IMPORTANT:** I must use the aws-documentation MCP tool to look up each service. For each service requested:

1. Search AWS documentation for "VPC endpoint service name [SERVICE_NAME]"
   - Example: "VPC endpoint service name Lambda"
   - Example: "VPC endpoint service name DynamoDB"

2. Extract from the documentation:
   - The exact service name format (e.g., `com.amazonaws.{region}.lambda`)
   - Whether it's an Interface or Gateway endpoint
   - Any service-specific requirements

3. Document the findings before proceeding to code generation

### Step 2: Generate Endpoint Code

Once I have the service names from AWS documentation, I will generate endpoint code following the established pattern:

```typescript
const serviceEndpoint = vpc.addInterfaceEndpoint('ServiceEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.SERVICE_NAME,
  privateDnsEnabled: true,  // Always enabled
  subnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  securityGroups: [vpcEndpointSG],
});

serviceEndpoint.addToPolicy(
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

### Step 3: Insert Code into CDK Stack

- Find the `// ======================== VPC ENDPOINTS ========================` section
- Insert new endpoints before the `// ======================== ROUTE53 HOSTED ZONES ========================` section
- Preserve all existing endpoints

### Step 4: Validate Configuration

- Synthesize the template: `npx cdk synth`
- Run the validator to ensure all endpoints have policies and private DNS enabled
- Confirm validation passed

### Step 5: Summary

- Show what was added
- Display validation results

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

## Example: Adding Lambda and DynamoDB

When you ask to add Lambda and DynamoDB endpoints:

1. **I search AWS documentation for each service:**
   - Search: "VPC endpoint service name Lambda"
   - Result: `com.amazonaws.{region}.lambda` (Interface endpoint)
   - Search: "VPC endpoint service name DynamoDB"
   - Result: `com.amazonaws.{region}.dynamodb` (Gateway endpoint)

2. **I generate the appropriate code:**
   - Lambda uses InterfaceVpcEndpoint with policy and private DNS
   - DynamoDB uses GatewayVpcEndpoint (no policy needed)

3. **I add the code to your CDK stack**

4. **I validate the configuration**

5. **I show you the results**

## Next Steps

Ready to add endpoints? Just ask me which services you need!

For example:
- "Add VPC endpoints for Lambda"
- "I need endpoints for DynamoDB and SQS"
- "Add API Gateway, Secrets Manager, and CloudWatch Logs endpoints"
