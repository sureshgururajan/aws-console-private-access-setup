import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { InterfaceVpcEndpointTarget } from 'aws-cdk-lib/aws-route53-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface AwsConsolePrivateAccessSetupStackProps extends cdk.StackProps {
  vpcCidr?: string;
  ec2KeyPair?: string;
  instanceType?: string;
}

export class AwsConsolePrivateAccessSetupStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: AwsConsolePrivateAccessSetupStackProps) {
    super(scope, id, props);

    const vpcCidr = props?.vpcCidr || '172.16.0.0/16';
    const ec2KeyPair = props?.ec2KeyPair || '';
    const instanceType = props?.instanceType || 't3.medium';

    // ======================== VPC AND SUBNETS ========================
    const vpc = new ec2.Vpc(this, 'AppVPC', {
      cidr: vpcCidr,
      natGateways: 1,
      maxAzs: 3,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // ======================== SECURITY GROUPS ========================
    const vpcEndpointSG = new ec2.SecurityGroup(this, 'VPCEndpointSecurityGroup', {
      vpc,
      description: 'Allow TLS for VPC Endpoint',
      allowAllOutbound: false,
    });

    vpcEndpointSG.addIngressRule(
      ec2.Peer.ipv4(vpcCidr),
      ec2.Port.tcp(443),
      'Allow HTTPS from VPC'
    );

    const ec2SG = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc,
      description: 'Default EC2 Instance SG',
      allowAllOutbound: true,
    });

    // ======================== VPC ENDPOINTS ========================
    // S3 Gateway Endpoint
    vpc.addGatewayEndpoint('S3Endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // SSM Interface Endpoint
    const ssmEndpoint = vpc.addInterfaceEndpoint('SSMEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vpcEndpointSG],
    });

    ssmEndpoint.addToPolicy(
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

    // EC2Messages Interface Endpoint
    const ec2MessagesEndpoint = vpc.addInterfaceEndpoint('EC2MessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vpcEndpointSG],
    });

    ec2MessagesEndpoint.addToPolicy(
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

    // SSM Messages Interface Endpoint
    const ssmMessagesEndpoint = vpc.addInterfaceEndpoint('SSMMessagesEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vpcEndpointSG],
    });

    ssmMessagesEndpoint.addToPolicy(
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

    // Signin Interface Endpoint with policy restricting to owning account
    const signinEndpoint = vpc.addInterfaceEndpoint('SigninEndpoint', {
      service: new ec2.InterfaceVpcEndpointService('com.amazonaws.' + this.region + '.signin'),
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vpcEndpointSG],
    });

    signinEndpoint.addToPolicy(
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

    // Console Interface Endpoint with policy restricting to owning account
    const consoleEndpoint = vpc.addInterfaceEndpoint('ConsoleEndpoint', {
      service: new ec2.InterfaceVpcEndpointService('com.amazonaws.' + this.region + '.console'),
      privateDnsEnabled: true,
      subnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [vpcEndpointSG],
    });

    consoleEndpoint.addToPolicy(
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

    // ======================== ROUTE53 HOSTED ZONES ========================
    // Console Hosted Zone
    const consoleHostedZone = new route53.PrivateHostedZone(this, 'ConsoleHostedZone', {
      vpc,
      zoneName: 'console.aws.amazon.com',
    });

    // Console records - use alias records to VPC endpoint
    new route53.ARecord(this, 'ConsoleRecordGlobal', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: 'console.aws.amazon.com',
    });

    new route53.ARecord(this, 'GlobalConsoleRecord', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: 'global.console.aws.amazon.com',
    });

    new route53.ARecord(this, 'ConsoleS3ProxyRecord', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: 's3.console.aws.amazon.com',
    });

    new route53.ARecord(this, 'ConsoleSupportProxyRecord', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: 'support.console.aws.amazon.com',
    });

    new route53.ARecord(this, 'ExplorerProxyRecord', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: 'resource-explorer.console.aws.amazon.com',
    });

    new route53.ARecord(this, 'WidgetProxyRecord', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: '*.widget.console.aws.amazon.com',
    });

    new route53.ARecord(this, 'ConsoleRecordRegional', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: `${this.region}.console.aws.amazon.com`,
    });

    new route53.ARecord(this, 'ConsoleRecordRegionalMultiSession', {
      zone: consoleHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(consoleEndpoint)
      ),
      recordName: `*.${this.region}.console.aws.amazon.com`,
    });

    // Signin Hosted Zone
    const signinHostedZone = new route53.PrivateHostedZone(this, 'SigninHostedZone', {
      vpc,
      zoneName: 'signin.aws.amazon.com',
    });

    new route53.ARecord(this, 'SigninRecordGlobal', {
      zone: signinHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(signinEndpoint)
      ),
      recordName: 'signin.aws.amazon.com',
    });

    new route53.ARecord(this, 'SigninRecordRegional', {
      zone: signinHostedZone,
      target: route53.RecordTarget.fromAlias(
        new InterfaceVpcEndpointTarget(signinEndpoint)
      ),
      recordName: `${this.region}.signin.aws.amazon.com`,
    });

    // ======================== EC2 INSTANCE ========================
    // IAM Role for EC2
    const ec2Role = new iam.Role(this, 'Ec2InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ],
    });

    // Get latest Windows Server 2022 AMI
    const ami = ec2.MachineImage.latestWindows(
      ec2.WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE
    );

    // EC2 Instance
    const instance = new ec2.Instance(this, 'EC2WinInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ami,
      role: ec2Role,
      securityGroup: ec2SG,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: ec2.BlockDeviceVolume.ebs(50),
        },
      ],
      keyPair: ec2KeyPair ? ec2.KeyPair.fromKeyPairName(this, 'KeyPair', ec2KeyPair) : undefined,
    });

    instance.node.addMetadata('aws:cdk:enable-path-metadata', true);

    // Add tags
    cdk.Tags.of(instance).add('Name', 'Console VPCE test instance');

    // ======================== OUTPUTS ========================
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'ConsoleHostedZoneId', {
      value: consoleHostedZone.hostedZoneId,
      description: 'Console Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'SigninHostedZoneId', {
      value: signinHostedZone.hostedZoneId,
      description: 'Signin Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'EC2InstanceId', {
      value: instance.instanceId,
      description: 'EC2 Instance ID',
    });
  }
}
