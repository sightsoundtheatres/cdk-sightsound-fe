import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as lambda from '@aws-cdk/aws-lambda'
import * as iam from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs'
import { Construct } from '@aws-cdk/core';


export interface FrontendConstructProps extends cdk.StackProps {
  /**
   * The domain name for the site to use
   */
  readonly domainname: string;
  /**
   * Location of FE code to deploy
   */
  readonly deploymentSource: string;
}

// some code taken from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
export class FrontendConstruct extends Construct {
  constructor(parent: Construct, id: string, props: FrontendConstructProps) {
    super(parent, id);

    // Content bucket
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // TLS certificate
    const certificateArn = new acm.Certificate(this, 'SiteCertificate', {
      domainName: props.domainname
    }).certificateArn;
    new cdk.CfnOutput(this, 'Certificate', { value: certificateArn });

    const noTtl = {
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.seconds(0)
    };

    //http headers function
    const cfHeadersLambdaRole = new iam.Role(this, 'cfHeadersLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromManagedPolicyArn(this, 'dynamodb', 'arn:aws:iam::aws:policy/CloudFrontFullAccess'),
        iam.ManagedPolicy.fromManagedPolicyArn(this, 'awslambdaexecute', 'arn:aws:iam::aws:policy/AWSLambdaExecute')
      ]
    });

    const lambdaCode = new lambda.AssetCode('./lambda/')
    const cfHeadersLambda = new lambda.Function(this, 'cfHeadersfn', {
      handler: 'handler',
      code: lambdaCode,
      runtime: lambda.Runtime.NODEJS_12_X,
      role: cfHeadersLambdaRole,
      logRetention:logs.RetentionDays.FIVE_DAYS
    });
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
      aliasConfiguration: {
        acmCertRef: certificateArn,
        names: [props.domainname],
        sslMethod: cloudfront.SSLMethod.SNI,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018
      },
      errorConfigurations: [{
        errorCode: 403,
        responseCode: 200,
        responsePagePath: '/index.html'
      }, {
        errorCode: 404,
        responseCode: 200,
        responsePagePath: '/index.html'
      }],
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: siteBucket,
          originAccessIdentity: new cloudfront.OriginAccessIdentity(this, 'SiteOriginAccessIdentity')
        },
        behaviors: [
          {
            isDefaultBehavior: true,
            lambdaFunctionAssociations: [{
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
              lambdaFunction: cfHeadersLambda.currentVersion
            }]
          },
          {
            pathPattern: 'index.html',
            ...noTtl,
            lambdaFunctionAssociations: [{
              eventType: cloudfront.LambdaEdgeEventType.ORIGIN_RESPONSE,
              lambdaFunction: cfHeadersLambda.currentVersion
            }]
          },
          {
            pathPattern: 'robots.txt',
            ...noTtl
          },
          {
            pathPattern: 'favicon.ico',
            ...noTtl
          },
        ],
      }]
    });

    new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    new cdk.CfnOutput(this, 'DistributionDomainname', { value: distribution.distributionDomainName });

    new s3deploy.BucketDeployment(this, 'Deployment', {
      sources: [s3deploy.Source.asset(props.deploymentSource)],
      destinationBucket: siteBucket,
      retainOnDelete: false,
      distribution
    });
  }
}

