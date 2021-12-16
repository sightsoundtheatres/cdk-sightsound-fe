import { Construct } from 'constructs';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  StackProps,
  aws_certificatemanager as acm,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfrontOrigins,
  aws_s3 as s3,
  aws_s3_deployment as s3deploy
} from 'aws-cdk-lib';

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
  readonly customBehaviors?: Record<string, cloudfront.BehaviorOptions>;
}

// some code taken from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
export class FrontendConstruct extends Construct {
  private readonly certificate: acm.Certificate;
  public readonly distribution: cloudfront.Distribution;

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

    const origin = new cloudfrontOrigins.S3Origin(siteBucket, {});

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'CloudFrontResponseHeaders', {
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365 * 2),
          includeSubdomains: true,
          preload: true,
          override: true
        },
        contentTypeOptions: {
          override: true
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.SAMEORIGIN,
          override: true
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN,
          override: true
        }
      }
    });

    const defaultBehavior: cloudfront.BehaviorOptions = {
      origin,
      compress: true,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      responseHeadersPolicy
    };

    const noCacheBehavior: cloudfront.BehaviorOptions = {
      ...defaultBehavior,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED
    };

    this.distribution = new cloudfront.Distribution(this, 'SiteCloudFrontDistribution', {
      domainNames: props.domainNames ? props.domainNames : undefined,
      certificate: props.domainNames ? this.certificate : undefined,
      errorResponses: [{
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html'
      }, {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html'
      }],
      defaultRootObject: 'index.html',
      defaultBehavior,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enableIpv6: true,
      httpVersion: cloudfront.HttpVersion.HTTP2,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      additionalBehaviors: {
        'index.html': noCacheBehavior,
        'robots.txt': noCacheBehavior,
        'favicon.ico': noCacheBehavior,
        ...(props.customBehaviors ? props.customBehaviors : {})
      }
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

