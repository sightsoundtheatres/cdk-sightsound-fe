import { Construct } from 'constructs';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy
} from 'aws-cdk-lib';
import * as path from 'path';

export interface FrontendConstructProps extends StackProps {
  /**
   * The domain name for the site to use
   */
  readonly domainNames?: string[];
  /**
   * Location of FE code to deploy
   */
  readonly deploymentSource: string;
  /**
   * Optional custom sources for CloudFront to proxy to
   */
  readonly customSources?: cloudfront.SourceConfiguration[];
}

// some code taken from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
export class FrontendConstruct extends Construct {
  private readonly certificate: acm.Certificate;
  public readonly distribution: cloudfront.CloudFrontWebDistribution;

  constructor(parent: Construct, id: string, props: FrontendConstructProps) {
    super(parent, id);

    // Content bucket
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      websiteIndexDocument: 'index.html',
      removalPolicy: RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED
    });

    if (props.domainNames) {
      // TLS certificate
      this.certificate = new acm.Certificate(this, 'SiteCertificate', {
        domainName: props.domainNames[0],
        subjectAlternativeNames: props.domainNames.slice(1)
      });
      new CfnOutput(this, 'Certificate', { value: this.certificate.certificateArn });
    }

    const noTtl = {
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(0),
      defaultTtl: Duration.seconds(0)
    };

    const lambdaCode = new lambda.AssetCode(path.join(__dirname, 'lambda'));

    const cfHeadersLambda = new lambda.Function(this, 'cfHeadersfn', {
      handler: 'index.handler',
      description: '1.2.1',
      code: lambdaCode,
      runtime: lambda.Runtime.NODEJS_12_X,
      logRetention: logs.RetentionDays.FIVE_DAYS
    });

    this.distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
      viewerCertificate: props.domainNames ? cloudfront.ViewerCertificate.fromAcmCertificate(this.certificate, {
        aliases: props.domainNames,
        sslMethod: cloudfront.SSLMethod.SNI,
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      }) : undefined,
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
          }
        ],
      }, ...(props.customSources ?? [])],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    new CfnOutput(this, 'DistributionId', { value: this.distribution.distributionId });
    new CfnOutput(this, 'DistributionDomainname', { value: this.distribution.distributionDomainName });

    new s3deploy.BucketDeployment(this, 'S3Deployment', {
      sources: [s3deploy.Source.asset(props.deploymentSource)],
      destinationBucket: siteBucket,
      retainOnDelete: true,
      distribution: this.distribution,
      memoryLimit: 1769 // one full vCPU
    });
  }
}

