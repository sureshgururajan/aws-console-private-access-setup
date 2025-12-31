# AWS Console Private Access Setup

This CDK TypeScript project creates an AWS Management Console Private Access setup with VPC endpoints, Route53 hosted zones, and a Windows EC2 instance for testing.

## Architecture

The stack creates:
- **VPC**: 172.16.0.0/16 with 3 public and 3 private subnets across availability zones
- **VPC Endpoints**: Interface endpoints for Console, Signin, SSM, EC2Messages, and SSMMessages; Gateway endpoint for S3
- **Route53**: Private hosted zones for `console.aws.amazon.com` and `signin.aws.amazon.com` with DNS records
- **EC2**: Windows Server 2022 instance in a private subnet with SSM access
- **Security**: Security groups configured for VPC endpoint access

## Prerequisites

- AWS CDK CLI installed
- AWS credentials configured
- An existing EC2 keypair (if you want SSH/RDP access to the instance)

## Building

```bash
npm run build      # Compile TypeScript to JavaScript
npm run watch      # Watch for changes and compile
npm run test       # Run unit tests
```

## Synthesizing

Generate the CloudFormation template:

```bash
npx cdk synth
```

## Deploying

### Basic deployment (without EC2 keypair)

```bash
npx cdk deploy
```

### Deployment with EC2 keypair

Specify an existing EC2 keypair name via context:

```bash
npx cdk deploy -c ec2KeyPair=my-keypair-name
```

Or set it as an environment variable:

```bash
export EC2_KEY_PAIR=my-keypair-name
npx cdk deploy
```

## Stack Parameters

You can customize the stack by passing context values:

- `ec2KeyPair`: Name of an existing EC2 keypair for instance access (default: none)
- `vpcCidr`: CIDR block for the VPC (default: `172.16.0.0/16`)
- `instanceType`: EC2 instance type (default: `t3.medium`)

Example with custom parameters:

```bash
npx cdk deploy \
  -c ec2KeyPair=my-keypair \
  -c vpcCidr=10.0.0.0/16 \
  -c instanceType=t3.large
```

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk destroy` tear down the stack

## Notes

- The EC2 keypair must already exist in your AWS account
- The Windows instance is placed in a private subnet and accessed via AWS Systems Manager Session Manager
- Route53 records are private and only resolvable within the VPC
