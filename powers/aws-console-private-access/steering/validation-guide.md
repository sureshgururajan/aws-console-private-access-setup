---
inclusion: manual
---

# CloudFormation Validation Guide

The MCP validator checks your CloudFormation template against all AWS Console Private Access requirements.

## Available Validation Checks

### VPC Endpoints

**What it checks:**
- All required VPC endpoints exist (Console, Signin, SSM, EC2Messages, SSMMessages, S3)
- Endpoints are configured in the correct subnets
- Endpoints have proper DNS names configured

**Why it matters:**
VPC endpoints are the core of private access. Without them, traffic routes through the public internet.

**Common issues:**
- Missing endpoints for specific services
- Endpoints in wrong subnets
- DNS resolution not configured

### Endpoint Policies

**What it checks:**
- Endpoint policies allow access to AWS Console APIs
- Policies follow the principle of least privilege
- No overly permissive wildcard policies

**Why it matters:**
Restrictive policies prevent unauthorized access to AWS services.

**Common issues:**
- Policies too restrictive (blocking legitimate Console access)
- Policies too permissive (allowing unnecessary services)
- Missing service principals

### Route53 Private Hosted Zones

**What it checks:**
- Private hosted zones exist for `console.aws.amazon.com` and `signin.aws.amazon.com`
- Zones are associated with your VPC
- DNS records point to correct VPC endpoints

**Why it matters:**
Private hosted zones ensure DNS queries resolve to VPC endpoints instead of public IPs.

**Common issues:**
- Zones not associated with VPC
- DNS records pointing to wrong endpoints
- Missing zones for signin service

### Security Groups

**What it checks:**
- Security groups allow HTTPS (port 443) to VPC endpoints
- Inbound rules are restrictive
- Outbound rules allow necessary traffic

**Why it matters:**
Security groups control network access to VPC endpoints.

**Common issues:**
- Port 443 not allowed
- Rules too restrictive (blocking all traffic)
- Missing rules for SSM endpoints

### EC2 Instance Configuration

**What it checks:**
- Instance is in a private subnet
- Instance has SSM IAM role attached
- Instance security group allows VPC endpoint access

**Why it matters:**
Instances in private subnets can only access AWS services through VPC endpoints.

**Common issues:**
- Instance in public subnet
- Missing SSM IAM role
- Security group doesn't allow endpoint access

### NAT Gateway

**What it checks:**
- NAT Gateway exists for outbound internet access
- NAT Gateway is in a public subnet
- Private subnets route to NAT Gateway

**Why it matters:**
NAT Gateway allows instances to reach external services while staying private.

**Common issues:**
- NAT Gateway in wrong subnet
- Private subnets not routing to NAT Gateway
- Multiple NAT Gateways not configured for HA

### Network Routing

**What it checks:**
- Private subnets have routes to VPC endpoints
- Private subnets have routes to NAT Gateway
- No direct internet gateway routes from private subnets

**Why it matters:**
Correct routing ensures traffic goes through VPC endpoints, not the public internet.

**Common issues:**
- Missing routes to VPC endpoints
- Routes to internet gateway from private subnets
- Incorrect route priorities

## Running Validation

### Basic Validation

Ask me to validate your CloudFormation template. I'll use the `validate-cloudformation` tool with your synthesized template:

```
Validate my CloudFormation template at cdk.out/ConsolePrivateAccessStack.json
```

### Validation Output

The validator returns a detailed report:

```
✓ VPC Endpoints - All required endpoints configured
✓ Endpoint Policies - Policies allow Console access
✓ Route53 Zones - Private hosted zones configured
✓ Security Groups - HTTPS access allowed
✓ EC2 Instance - Instance in private subnet with SSM role
✓ NAT Gateway - NAT Gateway configured for outbound access
✓ Network Routing - Routes configured correctly

Summary: 7/7 checks passed
```

### Interpreting Results

**Pass (✓):** Check passed, no action needed

**Warning (⚠):** Check passed but with caveats. Review the message for details.

**Fail (✗):** Check failed. Review the message and fix the issue before deployment.

## Common Validation Failures

### "VPC Endpoint for Console not found"

**Cause:** The Console VPC endpoint is missing from your template

**Fix:** Add the endpoint to your CDK code:
```typescript
new ec2.InterfaceVpcEndpoint(this, 'ConsoleEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.CONSOLE,
  vpc: vpc,
});
```

### "Route53 zone not associated with VPC"

**Cause:** The private hosted zone exists but isn't associated with your VPC

**Fix:** Ensure the zone is associated:
```typescript
zone.addVpc(vpc);
```

### "Security group doesn't allow port 443"

**Cause:** The security group blocks HTTPS traffic to VPC endpoints

**Fix:** Add an ingress rule:
```typescript
securityGroup.addIngressRule(
  ec2.Peer.ipv4(vpc.vpcCidrBlock),
  ec2.Port.tcp(443),
  'Allow HTTPS to VPC endpoints'
);
```

### "Instance in public subnet"

**Cause:** The EC2 instance is placed in a public subnet instead of private

**Fix:** Ensure the instance is in a private subnet:
```typescript
const instance = new ec2.Instance(this, 'Instance', {
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  // ...
});
```

## Validation Best Practices

1. **Validate early** - Run validation after synthesizing your template, before deployment
2. **Fix all failures** - Don't deploy with failing validation checks
3. **Review warnings** - Warnings indicate potential issues that should be reviewed
4. **Validate after changes** - If you modify your CDK code, validate again before redeploying
5. **Keep validation reports** - Save validation output for compliance and audit purposes

## Next Steps

- If validation passes, proceed to [deployment](./getting-started.md#step-5-deploy)
- If validation fails, check [troubleshooting](./troubleshooting.md)
- For production deployments, review [best practices](./best-practices.md)
