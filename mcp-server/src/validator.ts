import { ValidationCheck, ValidationResult, CloudFormationTemplate } from './types';

export class ConsolePrivateAccessValidator {
  private template: CloudFormationTemplate;
  private region: string;
  private checks: ValidationCheck[] = [];

  constructor(template: CloudFormationTemplate, region: string = 'us-east-1') {
    this.template = template;
    this.region = region;
  }

  validate(): ValidationResult {
    this.checks = [];

    this.checkVpcEndpoints();
    this.checkEndpointPolicies();
    this.checkRoute53HostedZones();
    this.checkSecurityGroups();
    this.checkEc2Instance();
    this.checkNatGateway();
    this.checkNetworkConfiguration();

    const failCount = this.checks.filter(c => c.status === 'fail').length;
    const valid = failCount === 0;

    return {
      valid,
      checks: this.checks,
      summary: this.generateSummary(valid, failCount),
    };
  }

  private getServiceName(serviceName: any): string | null {
    if (typeof serviceName === 'string') {
      return serviceName;
    }
    if (serviceName?.['Fn::Join']) {
      const parts = serviceName['Fn::Join'][1];
      if (Array.isArray(parts)) {
        // Handle Ref to AWS::Region by replacing with actual region
        return parts
          .map((part: any) => {
            if (typeof part === 'string') {
              return part;
            }
            if (part?.Ref === 'AWS::Region') {
              return this.region;
            }
            return '';
          })
          .join('');
      }
    }
    return null;
  }

  private checkVpcEndpoints(): void {
    const requiredEndpoints = [
      { name: 'console', service: `com.amazonaws.${this.region}.console` },
      { name: 'signin', service: `com.amazonaws.${this.region}.signin` },
      { name: 'ssm', service: `com.amazonaws.${this.region}.ssm` },
      { name: 'ec2messages', service: `com.amazonaws.${this.region}.ec2messages` },
      { name: 'ssmmessages', service: `com.amazonaws.${this.region}.ssmmessages` },
    ];

    const resources = this.template.Resources || {};
    const interfaceEndpoints = Object.values(resources).filter(
      (r: any) => r.Type === 'AWS::EC2::VPCEndpoint' && r.Properties?.VpcEndpointType === 'Interface'
    );

    for (const endpoint of requiredEndpoints) {
      const found = interfaceEndpoints.some((e: any) => {
        const serviceName = this.getServiceName(e.Properties?.ServiceName);
        return serviceName && serviceName.includes(endpoint.service);
      });

      this.checks.push({
        name: `VPC Endpoint: ${endpoint.name}`,
        status: found ? 'pass' : 'fail',
        message: found
          ? `Interface VPC endpoint for ${endpoint.name} found`
          : `Missing interface VPC endpoint for ${endpoint.name}`,
      });
    }

    // Check for S3 Gateway endpoint
    const s3Gateway = Object.values(resources).some(
      (r: any) => {
        const serviceName = this.getServiceName(r.Properties?.ServiceName);
        return (
          r.Type === 'AWS::EC2::VPCEndpoint' &&
          r.Properties?.VpcEndpointType === 'Gateway' &&
          serviceName &&
          serviceName.includes('s3')
        );
      }
    );

    this.checks.push({
      name: 'VPC Endpoint: S3 Gateway',
      status: s3Gateway ? 'pass' : 'fail',
      message: s3Gateway ? 'S3 Gateway VPC endpoint found' : 'Missing S3 Gateway VPC endpoint',
    });
  }

  private checkEndpointPolicies(): void {
    const resources = this.template.Resources || {};
    const interfaceEndpoints = Object.entries(resources).filter(
      ([_, r]: [string, any]) => r.Type === 'AWS::EC2::VPCEndpoint' && r.Properties?.VpcEndpointType === 'Interface'
    );

    for (const [name, resource] of interfaceEndpoints) {
      const serviceName = this.getServiceName((resource as any).Properties?.ServiceName);
      const hasPolicy = (resource as any).Properties?.PolicyDocument;
      const privateDnsEnabled = (resource as any).Properties?.PrivateDnsEnabled;

      // Check for policy
      this.checks.push({
        name: `Endpoint Policy: ${serviceName || name}`,
        status: hasPolicy ? 'pass' : 'fail',
        message: hasPolicy
          ? `${serviceName || name} endpoint has a policy attached`
          : `${serviceName || name} endpoint is missing a policy`,
        details: hasPolicy
          ? this.validatePolicyContent((resource as any).Properties.PolicyDocument)
          : undefined,
      });

      // Check for private DNS enabled
      this.checks.push({
        name: `Private DNS: ${serviceName || name}`,
        status: privateDnsEnabled ? 'pass' : 'fail',
        message: privateDnsEnabled
          ? `${serviceName || name} endpoint has private DNS enabled`
          : `${serviceName || name} endpoint does not have private DNS enabled`,
      });
    }
  }

  private validatePolicyContent(policy: any): string {
    if (!policy.Statement || policy.Statement.length === 0) {
      return 'Policy has no statements';
    }

    const statement = policy.Statement[0];
    const hasAccountCondition = statement.Condition?.StringEquals?.['aws:PrincipalAccount'];

    if (hasAccountCondition) {
      return 'Policy restricts access to specific account(s)';
    }

    return 'Policy does not restrict access by account';
  }

  private checkRoute53HostedZones(): void {
    const resources = this.template.Resources || {};
    const hostedZones = Object.values(resources).filter(
      (r: any) => r.Type === 'AWS::Route53::HostedZone'
    );

    const requiredZones = ['console.aws.amazon.com', 'signin.aws.amazon.com'];

    for (const zone of requiredZones) {
      const found = hostedZones.some((hz: any) => {
        const zoneName = hz.Properties?.Name;
        // Route53 zone names may have a trailing dot
        return zoneName === zone || zoneName === `${zone}.`;
      });

      this.checks.push({
        name: `Route53 Hosted Zone: ${zone}`,
        status: found ? 'pass' : 'fail',
        message: found
          ? `Private hosted zone for ${zone} found`
          : `Missing private hosted zone for ${zone}`,
      });
    }

    // Check for Route53 records
    const recordSets = Object.values(resources).filter(
      (r: any) => r.Type === 'AWS::Route53::RecordSet'
    );

    this.checks.push({
      name: 'Route53 Records',
      status: recordSets.length > 0 ? 'pass' : 'warning',
      message:
        recordSets.length > 0
          ? `Found ${recordSets.length} Route53 records`
          : 'No Route53 records found',
    });
  }

  private checkSecurityGroups(): void {
    const resources = this.template.Resources || {};
    const securityGroups = Object.values(resources).filter(
      (r: any) => r.Type === 'AWS::EC2::SecurityGroup'
    );

    const hasHttpsIngress = securityGroups.some((sg: any) => {
      const ingress = sg.Properties?.SecurityGroupIngress || [];
      return ingress.some(
        (rule: any) =>
          (rule.FromPort === 443 || rule.IpProtocol === 'tcp') &&
          (rule.ToPort === 443 || rule.IpProtocol === 'tcp')
      );
    });

    this.checks.push({
      name: 'Security Group: HTTPS Access',
      status: hasHttpsIngress ? 'pass' : 'warning',
      message: hasHttpsIngress
        ? 'Security group allows HTTPS (port 443) traffic'
        : 'No security group rule found for HTTPS (port 443)',
    });
  }

  private checkEc2Instance(): void {
    const resources = this.template.Resources || {};
    const instance = Object.values(resources).find((r: any) => r.Type === 'AWS::EC2::Instance');

    this.checks.push({
      name: 'EC2 Instance',
      status: instance ? 'pass' : 'warning',
      message: instance ? 'EC2 instance found' : 'No EC2 instance found (optional)',
    });

    if (instance) {
      const hasIamRole = (instance as any).Properties?.IamInstanceProfile;
      this.checks.push({
        name: 'EC2 IAM Role',
        status: hasIamRole ? 'pass' : 'warning',
        message: hasIamRole
          ? 'EC2 instance has IAM instance profile'
          : 'EC2 instance missing IAM instance profile',
      });
    }
  }

  private checkNatGateway(): void {
    const resources = this.template.Resources || {};
    const natGateway = Object.values(resources).find((r: any) => r.Type === 'AWS::EC2::NatGateway');

    this.checks.push({
      name: 'NAT Gateway',
      status: natGateway ? 'pass' : 'warning',
      message: natGateway
        ? 'NAT Gateway found for private subnet egress'
        : 'No NAT Gateway found (required for private subnet internet access)',
    });
  }

  private checkNetworkConfiguration(): void {
    const resources = this.template.Resources || {};

    // Check for private subnets
    const privateSubnets = Object.values(resources).filter(
      (r: any) =>
        r.Type === 'AWS::EC2::Subnet' &&
        !r.Properties?.MapPublicIpOnLaunch
    );

    this.checks.push({
      name: 'Private Subnets',
      status: privateSubnets.length > 0 ? 'pass' : 'fail',
      message:
        privateSubnets.length > 0
          ? `Found ${privateSubnets.length} private subnet(s)`
          : 'No private subnets found',
    });

    // Check for route tables
    const routeTables = Object.values(resources).filter(
      (r: any) => r.Type === 'AWS::EC2::RouteTable'
    );

    this.checks.push({
      name: 'Route Tables',
      status: routeTables.length > 0 ? 'pass' : 'warning',
      message:
        routeTables.length > 0
          ? `Found ${routeTables.length} route table(s)`
          : 'No route tables found',
    });
  }

  private generateSummary(valid: boolean, failCount: number): string {
    const passCount = this.checks.filter(c => c.status === 'pass').length;
    const warningCount = this.checks.filter(c => c.status === 'warning').length;

    if (valid) {
      return `✓ Validation passed. All required checks passed (${passCount} passed, ${warningCount} warnings).`;
    }

    return `✗ Validation failed. ${failCount} check(s) failed, ${passCount} passed, ${warningCount} warnings.`;
  }
}
