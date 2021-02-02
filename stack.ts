import * as cdk from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3deploy from '@aws-cdk/aws-s3-deployment';
import * as cloudfront from '@aws-cdk/aws-cloudfront';
import * as acm from '@aws-cdk/aws-certificatemanager';
import * as lambda from '@aws-cdk/aws-lambda';
import * as logs from '@aws-cdk/aws-logs';
import * as path from 'path';

export interface FrontendConstructProps extends cdk.StackProps {
  /**
   * The domain name for the site to use
   */
  readonly domainNames?: string[];
  /**
   * Location of FE code to deploy
   */
  readonly deploymentSource: string;
 }

// some code taken from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
export class FrontendConstruct extends cdk.Construct {
  private readonly certificate: acm.Certificate;

  constructor(parent: cdk.Construct, id: string, props: FrontendConstructProps) {
    super(parent, id);

    // Content bucket
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    if (props.domainNames) {
      // TLS certificate
      this.certificate = new acm.Certificate(this, 'SiteCertificate', {
        domainName: props.domainNames[0],
        subjectAlternativeNames: props.domainNames.slice(1)
      });
      new cdk.CfnOutput(this, 'Certificate', { value: this.certificate.certificateArn });
    }

    const noTtl = {
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.seconds(0),
      defaultTtl: cdk.Duration.seconds(0)
    };

    const lambdaCode = new lambda.AssetCode(path.join(__dirname, 'lambda'));

    const cfHeadersLambda = new lambda.Function(this, 'cfHeadersfn', {
      handler: 'index.handler',
      code: lambdaCode,
      runtime: lambda.Runtime.NODEJS_12_X,
      logRetention: logs.RetentionDays.FIVE_DAYS
    });

    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
            //update to https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-cloudfront.ViewerCertificate.html in future
      aliasConfiguration: props.domainNames ? {
        acmCertRef: this.certificate.certificateArn,
        names: props.domainNames,
        sslMethod: cloudfront.SSLMethod.SNI,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2018
      } : undefined,
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

