# AWS Console Private Access Validator MCP Server

An MCP (Model Context Protocol) server that validates CloudFormation templates for AWS Console Private Access requirements.

## Features

Validates CloudFormation templates for:
- Required VPC endpoints (Console, Signin, SSM, EC2Messages, SSMMessages, S3)
- Endpoint policies restricting access to specific accounts
- Route53 private hosted zones for console and signin
- Security group configuration for HTTPS access
- EC2 instance setup with IAM roles
- NAT Gateway for private subnet egress
- Network configuration and routing

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Running the MCP Server

```bash
npm start
```

The server will listen on stdin/stdout for MCP protocol messages.

## Testing

Test the validator against a CloudFormation template:

```bash
npm test -- /path/to/template.json
```

## Usage

### Tool: `validate-cloudformation`

Validates a CloudFormation template for AWS Console Private Access requirements.

**Input Parameters:**
- `template` (string, required): CloudFormation template as JSON string
- `region` (string, optional): AWS region (default: "us-east-1")

**Output:**
```json
{
  "valid": true/false,
  "checks": [
    {
      "name": "Check name",
      "status": "pass" | "fail" | "warning",
      "message": "Description of what was checked",
      "details": "Additional details if needed"
    }
  ],
  "summary": "Overall validation summary"
}
```

## Validation Checks

1. **VPC Endpoints** - Verifies all required interface and gateway endpoints exist
2. **Endpoint Policies** - Checks that policies are attached and properly configured
3. **Route53 Hosted Zones** - Validates private hosted zones for console and signin
4. **Security Groups** - Checks for HTTPS (port 443) access rules
5. **EC2 Instance** - Verifies instance exists with IAM role (optional)
6. **NAT Gateway** - Checks for NAT Gateway for private subnet egress
7. **Network Configuration** - Validates private subnets and route tables

## Example

```bash
# Generate CloudFormation template
npx cdk synth > template.json

# Validate the template
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"validate-cloudformation","arguments":{"template":"<template-json>"}}}' | npm start
```
