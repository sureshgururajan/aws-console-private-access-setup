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

## Overview

AWS Console Private Access enables you to access the AWS Management Console and Signin services through VPC endpoints, keeping Console and Signin traffic within your AWS network without routing through the public internet. This is essential for organizations with strict security and compliance requirements.

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

Before getting started, you must have the following tools installed and configured:

### Required Tools

- **Node.js 18+** - JavaScript runtime
- **npm** - Node package manager (comes with Node.js)
- **AWS CDK CLI** - Infrastructure as code tool
- **AWS CLI** - Command-line interface for AWS
- **AWS Account** - With appropriate permissions to create VPC endpoints and EC2 instances
- **EC2 Keypair** - For accessing the Windows instance (see below)

### EC2 Keypair Setup

The deployment creates a Windows EC2 instance in a private subnet. You must have an EC2 keypair to access it via RDP.

**Create or identify an EC2 keypair:**

```bash
# List existing keypairs in your region
aws ec2 describe-key-pairs --region $AWS_REGION --query 'KeyPairs[].KeyName' --output text

# Create a new keypair if needed
aws ec2 create-key-pair --region $AWS_REGION --key-name my-keypair --query 'KeyMaterial' --output text > my-keypair.pem
chmod 400 my-keypair.pem
```

Save the keypair name - you'll need to provide it during deployment. You'll use this keypair to connect to the Windows instance via RDP.

### Verify Prerequisites

Run these commands to verify everything is installed:

```bash
# Check Node.js version (need 18+)
node --version

# Check npm version
npm --version

# Check AWS CDK version
cdk --version

# Check AWS CLI is configured
aws sts get-caller-identity
```

If any command fails, follow the installation steps below.

### Install Missing Prerequisites

If any of the above commands fail, install the missing tools:

```bash
# Install Node.js 18+ (if needed)
# On macOS with Homebrew:
brew install node

# Install AWS CDK CLI globally (if needed)
npm install -g aws-cdk

# Configure AWS credentials (if needed)
aws configure
```

When running `aws configure`, you'll be prompted for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json is recommended)

## Quick Start

### 1. Clone the Repository

To deploy the AWS Console Private Access infrastructure, clone the repository:

```bash
git clone https://github.com/sureshgururajan/aws-console-private-access-setup.git
cd aws-console-private-access-setup
npm install
```

### 2. Choose Your AWS Region

Decide which AWS region you want to deploy to:

```bash
# Set your preferred region (replace with your choice)
export AWS_REGION=us-east-1

# Verify the region is set
echo "Using AWS region: $AWS_REGION"
```

Common regions:
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon) 
- `eu-west-1` (Ireland)
- `ap-southeast-1` (Singapore)

### 3. Specify Your EC2 Keypair

If you want RDP access to the Windows instance, identify an existing EC2 keypair in your AWS account:

```bash
# List available keypairs in your chosen region
aws ec2 describe-key-pairs --region $AWS_REGION --query 'KeyPairs[].KeyName' --output text
```

Note the keypair name - you'll use it in the next steps.

### 4. Synthesize the CloudFormation Template

Generate the CloudFormation template from the CDK code:

```bash
# Without keypair (instance only accessible via Systems Manager)
npx cdk synth --region $AWS_REGION

# With keypair (for RDP access)
npx cdk synth --region $AWS_REGION -c ec2KeyPair=your-keypair-name
```

This creates a `cdk.out/` directory with the synthesized template.

### 5. Validate Your Configuration

Before deploying, validate that your configuration meets all private access requirements. Ask me to validate your synthesized template:

```
Validate my CloudFormation template at cdk.out/ConsolePrivateAccessStack.json
```

The validator will check that all VPC endpoints, security groups, Route53 zones, and network routing are properly configured.

### 6. Deploy the Infrastructure

Once validation passes, deploy the stack to your AWS account:

```bash
# Without keypair (instance only accessible via Systems Manager)
npx cdk deploy --region $AWS_REGION

# With keypair (for RDP access)
npx cdk deploy --region $AWS_REGION -c ec2KeyPair=your-keypair-name
```

This creates all the necessary VPC endpoints, Route53 zones, security groups, and EC2 instance for private console access.

## Validation (Optional)

If you want to validate your CloudFormation template before or after deployment, this power includes an MCP server with a `validate-cloudformation` tool. This is optional—you don't need to use it to deploy successfully.

### What the Validator Checks

- **VPC Endpoints** - Verifies all required endpoints exist (Console, Signin, SSM, EC2Messages, SSMMessages, S3)
- **Endpoint Policies** - Ensures all interface endpoints have policies restricting access to your AWS account
- **Private DNS** - Confirms all interface endpoints have private DNS enabled
- **Route53 Private Hosted Zones** - Checks for DNS zones for console.aws.amazon.com and signin.aws.amazon.com
- **Security Groups** - Validates HTTPS (port 443) access to VPC endpoints
- **EC2 Instance** - Confirms instance is in a private subnet with SSM IAM role
- **NAT Gateway** - Verifies NAT Gateway exists for outbound access
- **Network Routing** - Checks that private subnets route to VPC endpoints and NAT Gateway

### Using the Validator

To validate your configuration, ask me to validate your CloudFormation template. I can check either:
- Your synthesized template before deployment: `cdk.out/ConsolePrivateAccessStack.json`
- Your deployed stack after deployment

The validator will return a detailed report with pass/fail/warning status and actionable messages for any issues.

## Next Steps After Validation

Once validation passes, you have several options:

### Option 1: Deploy to AWS

Ready to deploy? Run:

```bash
# Without keypair
npx cdk deploy --region $AWS_REGION

# With keypair
npx cdk deploy --region $AWS_REGION -c ec2KeyPair=your-keypair-name
```

### Option 2: Customize Your Configuration

Want to adjust parameters before deploying? You can customize:

```bash
npx cdk deploy --region $AWS_REGION \
  -c ec2KeyPair=your-keypair-name \
  -c vpcCidr=10.0.0.0/16 \
  -c instanceType=t3.large
```

**Available Parameters:**
- `ec2KeyPair` - Name of existing EC2 keypair (default: none)
- `vpcCidr` - CIDR block for the VPC (default: 172.16.0.0/16)
- `instanceType` - EC2 instance type (default: t3.medium)

### Option 3: Review the Architecture

Want to understand what you're deploying? Check the [Architecture Details](#architecture-details) section below.

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
- Console and Signin traffic stays within your AWS network
- Service-specific traffic (e.g., S3 operations through the console) may be proxied through the Console web server

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
1. Verify the keypair exists: `aws ec2 describe-key-pairs --region $AWS_REGION --key-names my-keypair`
2. Ensure you're deploying to the same region where the keypair exists
3. Create a new keypair if needed: `aws ec2 create-key-pair --region $AWS_REGION --key-name my-keypair`

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
npx cdk destroy --region $AWS_REGION
```

This removes all resources created by the stack, including the VPC, VPC endpoints, Route53 zones, and EC2 instance.

## Adding VPC Endpoints for Additional Services

The base configuration includes endpoints for Console, Signin, and Systems Manager. You can easily add endpoints for other AWS services like Lambda, API Gateway, DynamoDB, and more.

### How to Add Endpoints

Simply ask me to add endpoints for the services you need:

```
Add VPC endpoints for Lambda and API Gateway
```

I will:
1. Look up the exact VPC endpoint service names via AWS documentation
2. Generate endpoint code following the same pattern as existing endpoints
3. Enable private DNS for automatic DNS resolution
4. Apply restrictive endpoint policies (limited to your AWS account)
5. Update your CDK stack and validate the configuration

### Supported Services

Many AWS services support VPC endpoints, including:
- Lambda, API Gateway, DynamoDB, SQS, SNS
- Secrets Manager, Parameter Store, CloudWatch Logs
- ECR, CloudFormation, and many more

See the [Add VPC Endpoints Guide](steering/add-vpc-endpoints.md) for more details and examples.

## Cleanup

## Useful Commands

```bash
npm run build       # Compile TypeScript to JavaScript
npm run watch       # Watch for changes and compile
npm run test        # Run unit tests
npx cdk synth --region $AWS_REGION       # Emit the synthesized CloudFormation template
npx cdk deploy --region $AWS_REGION      # Deploy this stack to your AWS account
npx cdk diff --region $AWS_REGION        # Compare deployed stack with current state
npx cdk destroy --region $AWS_REGION     # Tear down the stack
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
