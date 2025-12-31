---
name: aws-console-private-access
displayName: AWS Console Private Access
description: Set up secure AWS Management Console access through VPC endpoints without routing through the public internet. Includes CloudFormation validation to ensure your configuration meets private access requirements.
version: 1.0.0
author: Suresh Gururajan
keywords:
  - aws
  - console
  - private-access
  - vpc-endpoints
  - cloudformation
  - validation
  - cdk
---

# AWS Console Private Access

## ⚠️ Important: Setup Required

After installing this power, you **must** run these commands in the power's directory to build the MCP server:

```bash
npm install
npm run install:mcp
npm run build:mcp
```

Without running these commands, the MCP server will not start and you'll see connection errors.

## Setup Instructions

After installing this power, run the following commands to complete setup:

```bash
npm install
npm run install:mcp
npm run build:mcp
```

This installs dependencies and builds the MCP server. The MCP server will then be available for use.

## Overview

AWS Console Private Access enables you to access the AWS Management Console and Signin services through VPC endpoints, keeping all traffic within your AWS network without routing through the public internet. This is essential for organizations with strict security and compliance requirements.

This power provides a complete AWS CDK TypeScript project that sets up a private access environment with:
- VPC with public and private subnets across multiple availability zones
- Interface VPC endpoints for Console, Signin, SSM, EC2Messages, and SSMMessages
- Gateway VPC endpoint for S3
- Route53 private hosted zones for DNS resolution
- Windows EC2 instance in a private subnet for testing console access
- Security groups configured for VPC endpoint access
- NAT Gateway for outbound internet access from private subnets

The power also includes an MCP (Model Context Protocol) server that validates your CloudFormation templates to ensure they meet all private access requirements before deployment.

## Prerequisites

Before getting started, ensure you have:

- **AWS CDK CLI** installed (`npm install -g aws-cdk`)
- **Node.js 18+** and npm
- **AWS credentials** configured with appropriate permissions to create VPCs, EC2 instances, and VPC endpoints
- **An existing EC2 keypair** in your AWS account (optional, for RDP access to the Windows instance)
- **AWS account** with sufficient service limits for VPC resources

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sureshgururajan/aws-console-private-access-setup.git
cd aws-console-private-access-setup
```

### 2. Install Dependencies and Build

Install both the CDK project and MCP server dependencies, then build the MCP server:

```bash
npm install
npm run install:mcp
npm run build:mcp
```

The build step compiles the TypeScript MCP server to JavaScript in the `mcp-server/dist/` directory.

### 3. Specify Your EC2 Keypair (Optional)

If you want RDP access to the Windows instance, identify an existing EC2 keypair in your AWS account:

```bash
# List available keypairs in your account
aws ec2 describe-key-pairs --query 'KeyPairs[].KeyName' --output text
```

Note the keypair name - you'll use it in the next steps.

### 4. Synthesize the CloudFormation Template

Generate the CloudFormation template from the CDK code:

```bash
# Without keypair (instance only accessible via Systems Manager)
npx cdk synth

# With keypair (for RDP access)
npx cdk synth -c ec2KeyPair=your-keypair-name
```

This creates a `cdk.out/` directory with the synthesized template.

### 4. Validate the Configuration

Before deploying, validate that your configuration meets all private access requirements using the MCP validator:

```bash
npm run build:mcp
npm run start:mcp
```

The MCP server will start and listen for validation requests. You can then use the `validate-cloudformation` tool to check your template.

## Validation

The included MCP server validates your CloudFormation template against these requirements:

### Validation Checks

- **VPC Endpoints** - Verifies all required endpoints exist (Console, Signin, SSM, EC2Messages, SSMMessages, S3)
- **Endpoint Policies** - Ensures policies allow access to AWS Console APIs
- **Route53 Private Hosted Zones** - Checks for DNS zones for console.aws.amazon.com and signin.aws.amazon.com
- **Security Groups** - Validates HTTPS (port 443) access to VPC endpoints
- **EC2 Instance** - Confirms instance is in a private subnet with SSM IAM role
- **NAT Gateway** - Verifies NAT Gateway exists for outbound access
- **Network Routing** - Checks that private subnets route to VPC endpoints and NAT Gateway

### Running Validation

Once the MCP server is running, use the `validate-cloudformation` tool with your synthesized template:

```bash
# The validator will check your cdk.out/ConsolePrivateAccessStack.json template
```

The validator returns a detailed report of all checks with pass/fail/warning status and actionable messages for any issues.

## Deployment

### Basic Deployment (Without EC2 Keypair)

Deploy the stack without an EC2 keypair. The instance will only be accessible via AWS Systems Manager Session Manager:

```bash
npx cdk deploy
```

### Deployment with EC2 Keypair

If you want RDP access to the Windows instance, deploy with your keypair name:

```bash
npx cdk deploy -c ec2KeyPair=your-keypair-name
```

Replace `your-keypair-name` with the actual keypair name from your AWS account.

### Custom Parameters

Customize the deployment with additional context values:

```bash
npx cdk deploy \
  -c ec2KeyPair=your-keypair-name \
  -c vpcCidr=10.0.0.0/16 \
  -c instanceType=t3.large
```

**Available Parameters:**
- `ec2KeyPair` - Name of existing EC2 keypair (default: none)
- `vpcCidr` - CIDR block for the VPC (default: 172.16.0.0/16)
- `instanceType` - EC2 instance type (default: t3.medium)

## Testing Console Access

### Connect to the EC2 Instance

The Windows instance is placed in a private subnet and accessed via AWS Systems Manager Session Manager:

1. Go to the AWS Systems Manager console
2. Select "Session Manager" from the left menu
3. Click "Start session"
4. Select the Windows instance created by the stack
5. Click "Start session"

### Test Console Access

Once connected to the instance:

1. Open a web browser (e.g., Edge)
2. Navigate to `https://console.aws.amazon.com`
3. You should be able to access the AWS Management Console without any internet gateway or NAT Gateway routing

The console access works because:
- The instance resolves `console.aws.amazon.com` to the VPC endpoint via Route53 private hosted zone
- The VPC endpoint routes the request to the AWS Console service
- All traffic stays within your AWS network

## Architecture Details

### VPC Structure

- **VPC CIDR:** 172.16.0.0/16 (customizable)
- **Public Subnets:** 3 subnets (one per AZ) for NAT Gateways
- **Private Subnets:** 3 subnets (one per AZ) for EC2 instances and VPC endpoints

### VPC Endpoints

All endpoints are configured with restrictive endpoint policies that limit access to specific AWS services:

- **Console** - `com.amazonaws.{region}.console`
- **Signin** - `com.amazonaws.{region}.signin`
- **SSM** - `com.amazonaws.{region}.ssm`
- **EC2Messages** - `com.amazonaws.{region}.ec2messages`
- **SSMMessages** - `com.amazonaws.{region}.ssmmessages`
- **S3** - Gateway endpoint for S3 bucket access

### Route53 Private Hosted Zones

Two private hosted zones are created:
- `console.aws.amazon.com` - Points to Console VPC endpoint
- `signin.aws.amazon.com` - Points to Signin VPC endpoint

These zones are only resolvable within the VPC, ensuring DNS queries stay private.

### Security Groups

Security groups are configured to:
- Allow HTTPS (port 443) traffic from private subnets to VPC endpoints
- Allow SSM traffic for Systems Manager Session Manager access
- Restrict all other inbound traffic

## Troubleshooting

### Console Access Not Working

**Problem:** Browser shows "Connection refused" or "Cannot reach server"

**Causes:**
- VPC endpoint not created or misconfigured
- Route53 private hosted zone not resolving correctly
- Security group not allowing HTTPS traffic

**Solutions:**
1. Verify VPC endpoints exist in the AWS Console (VPC > Endpoints)
2. Check Route53 private hosted zones are created and associated with the VPC
3. Verify security group allows port 443 from private subnets
4. Run the MCP validator to check configuration

### EC2 Instance Not Accessible via Session Manager

**Problem:** Cannot start a session to the Windows instance

**Causes:**
- Instance doesn't have SSM IAM role
- SSM endpoint not created
- Instance not in private subnet

**Solutions:**
1. Verify the instance has the SSM IAM role attached
2. Check that SSM, EC2Messages, and SSMMessages endpoints exist
3. Confirm instance is in a private subnet
4. Check security group allows traffic to SSM endpoints

### Deployment Fails with "Cannot find EC2 keypair"

**Problem:** Deployment fails when specifying an EC2 keypair

**Causes:**
- Keypair doesn't exist in your AWS account
- Keypair is in a different region

**Solutions:**
1. Verify the keypair exists: `aws ec2 describe-key-pairs --key-names my-keypair`
2. Ensure you're deploying to the same region where the keypair exists
3. Create a new keypair if needed: `aws ec2 create-key-pair --key-name my-keypair`

### CloudFormation Validation Fails

**Problem:** MCP validator reports failures

**Solutions:**
1. Review the validation report for specific failures
2. Check that all required VPC endpoints are defined in the CDK code
3. Verify endpoint policies allow Console and Signin access
4. Ensure Route53 zones are configured correctly
5. Confirm security groups allow HTTPS traffic

## Best Practices

- **Endpoint Policies** - Use restrictive endpoint policies that only allow necessary AWS services. The default policies in this project follow the principle of least privilege.

- **Network Isolation** - Keep private subnets completely isolated from the internet. Use VPC endpoints for all AWS service access.

- **Monitoring** - Enable VPC Flow Logs to monitor traffic to VPC endpoints. This helps identify any unexpected access patterns.

- **Cost Optimization** - VPC endpoints incur hourly charges. Consider consolidating endpoints if you have multiple VPCs with similar requirements.

- **High Availability** - The stack creates endpoints in multiple availability zones for redundancy. Ensure your applications are also distributed across AZs.

- **Security Groups** - Regularly audit security group rules to ensure they follow the principle of least privilege.

- **IAM Roles** - The EC2 instance uses an IAM role for SSM access. Ensure the role has only necessary permissions.

## Cleanup

When you're done testing, destroy the stack to avoid ongoing charges:

```bash
npx cdk destroy
```

This removes all resources created by the stack, including the VPC, VPC endpoints, Route53 zones, and EC2 instance.

## Useful Commands

```bash
npm run build       # Compile TypeScript to JavaScript
npm run watch       # Watch for changes and compile
npm run test        # Run unit tests
npx cdk synth       # Emit the synthesized CloudFormation template
npx cdk deploy      # Deploy this stack to your AWS account
npx cdk diff        # Compare deployed stack with current state
npx cdk destroy     # Tear down the stack
npm run build:mcp   # Build the MCP validator server
npm run start:mcp   # Start the MCP validator server
```

## Additional Resources

- [AWS Console Private Access Documentation](https://docs.aws.amazon.com/console/latest/userguide/console-private-access.html)
- [VPC Endpoints Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
- [GitHub Repository](https://github.com/sureshgururajan/aws-console-private-access-setup)

## Support

For issues, questions, or contributions, visit the [GitHub repository](https://github.com/sureshgururajan/aws-console-private-access-setup).

---

**MCP Server:** `aws-console-private-access-validator`
**Repository:** https://github.com/sureshgururajan/aws-console-private-access-setup
