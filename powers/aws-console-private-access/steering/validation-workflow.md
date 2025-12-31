---
inclusion: manual
---

# Validation Workflow

Use this guide to validate your AWS Console Private Access configuration before and after deployment.

## Pre-Deployment Validation

Before deploying your infrastructure, validate the CloudFormation template:

```
Validate my CloudFormation template at cdk.out/ConsolePrivateAccessStack.json
```

The MCP validator checks:
- All required VPC endpoints are defined
- Endpoint policies allow Console and Signin access
- Private hosted zones are configured for DNS resolution
- Security groups allow HTTPS traffic to endpoints
- EC2 instance is configured for private subnet deployment
- NAT Gateway is configured for outbound access
- Network routing prevents internet exposure

**Expected output:**
```
✓ VPC Endpoints - All required endpoints configured
✓ Endpoint Policies - Policies allow Console access
✓ Route53 Zones - Private hosted zones configured
✓ Security Groups - HTTPS access allowed
✓ EC2 Instance - Instance configured for private subnet
✓ NAT Gateway - NAT Gateway configured
✓ Network Routing - Routes prevent internet exposure

Summary: 7/7 checks passed
```

## Post-Deployment Validation

After deployment, verify the infrastructure is working correctly:

### 1. Verify VPC Endpoints

```bash
aws ec2 describe-vpc-endpoints --region $AWS_REGION \
  --filters "Name=vpc-id,Values=vpc-xxxxx" \
  --query 'VpcEndpoints[].{ServiceName:ServiceName,State:State}'
```

All endpoints should show `State: available`

### 2. Verify Route53 Private Hosted Zones

```bash
aws route53 list-hosted-zones-by-vpc --region $AWS_REGION \
  --vpc-id vpc-xxxxx
```

Should show zones for:
- `console.aws.amazon.com`
- `signin.aws.amazon.com`

### 3. Test DNS Resolution

Connect to the EC2 instance via Session Manager and test:

```bash
nslookup console.aws.amazon.com
nslookup signin.aws.amazon.com
```

Both should resolve to private IPs (10.x.x.x or 172.x.x.x)

### 4. Test Console Access

From the EC2 instance:
1. Open a web browser
2. Navigate to `https://console.aws.amazon.com`
3. You should see the AWS Management Console

### 5. Verify Security Groups

```bash
aws ec2 describe-security-groups --region $AWS_REGION \
  --group-ids sg-xxxxx \
  --query 'SecurityGroups[0].IpPermissions'
```

Should show inbound rule allowing port 443 (HTTPS)

## Continuous Validation

### Enable VPC Flow Logs

Monitor traffic to VPC endpoints:

```bash
aws ec2 create-flow-logs --region $AWS_REGION \
  --resource-type VPC \
  --resource-ids vpc-xxxxx \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flowlogs
```

### Monitor Endpoint Health

```bash
aws cloudwatch get-metric-statistics --region $AWS_REGION \
  --namespace AWS/VPCEndpoint \
  --metric-name BytesProcessed \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Check for Errors

```bash
aws cloudwatch get-metric-statistics --region $AWS_REGION \
  --namespace AWS/VPCEndpoint \
  --metric-name ErrorCount \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Troubleshooting Failed Validation

### "VPC Endpoint for Console not found"

**Fix:** Ensure Console endpoint is created in CDK code:
```typescript
new ec2.InterfaceVpcEndpoint(this, 'ConsoleEndpoint', {
  service: ec2.InterfaceVpcEndpointAwsService.CONSOLE,
  vpc: vpc,
});
```

### "Route53 zone not associated with VPC"

**Fix:** Verify zone association:
```bash
aws route53 list-hosted-zones-by-vpc --region $AWS_REGION \
  --vpc-id vpc-xxxxx
```

If missing, associate the zone:
```typescript
zone.addVpc(vpc);
```

### "Security group doesn't allow port 443"

**Fix:** Add ingress rule:
```typescript
securityGroup.addIngressRule(
  ec2.Peer.ipv4(vpc.vpcCidrBlock),
  ec2.Port.tcp(443),
  'Allow HTTPS to VPC endpoints'
);
```

### "Instance in public subnet"

**Fix:** Ensure instance is in private subnet:
```typescript
const instance = new ec2.Instance(this, 'Instance', {
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  // ...
});
```

## Validation Checklist

- [ ] Pre-deployment validation passes (7/7 checks)
- [ ] All VPC endpoints show `State: available`
- [ ] Route53 zones are associated with VPC
- [ ] DNS resolution returns private IPs
- [ ] Console access works from EC2 instance
- [ ] Security groups allow HTTPS traffic
- [ ] VPC Flow Logs are enabled
- [ ] No errors in CloudWatch metrics
- [ ] EC2 instance is in private subnet
- [ ] NAT Gateway is configured (if needed)

## Next Steps

- Review [Data Exfiltration Prevention](./data-exfiltration-prevention.md) guide
- Set up monitoring and alerting
- Document your deployment
- Schedule regular validation reviews
