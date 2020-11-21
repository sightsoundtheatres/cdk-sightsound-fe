"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendConstruct = void 0;
const cdk = require("@aws-cdk/core");
const s3 = require("@aws-cdk/aws-s3");
const s3deploy = require("@aws-cdk/aws-s3-deployment");
const cloudfront = require("@aws-cdk/aws-cloudfront");
const acm = require("@aws-cdk/aws-certificatemanager");
const lambda = require("@aws-cdk/aws-lambda");
const iam = require("@aws-cdk/aws-iam");
const logs = require("@aws-cdk/aws-logs");
// some code taken from https://github.com/aws-samples/aws-cdk-examples/blob/master/typescript/static-site/static-site.ts
class FrontendConstruct extends cdk.Construct {
    constructor(parent, id, props) {
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
        const lambdaCode = new lambda.AssetCode('./lambda/');
        const cfHeadersLambda = new lambda.Function(this, 'cfHeadersfn', {
            handler: 'handler',
            code: lambdaCode,
            runtime: lambda.Runtime.NODEJS_12_X,
            role: cfHeadersLambdaRole,
            logRetention: logs.RetentionDays.FIVE_DAYS
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
exports.FrontendConstruct = FrontendConstruct;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsc0NBQXNDO0FBQ3RDLHVEQUF1RDtBQUN2RCxzREFBc0Q7QUFDdEQsdURBQXVEO0FBQ3ZELDhDQUE2QztBQUM3Qyx3Q0FBd0M7QUFDeEMsMENBQXlDO0FBYXpDLHlIQUF5SDtBQUN6SCxNQUFhLGlCQUFrQixTQUFRLEdBQUcsQ0FBQyxTQUFTO0lBQ2xELFlBQVksTUFBcUIsRUFBRSxFQUFVLEVBQUUsS0FBNkI7UUFDMUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVsQixpQkFBaUI7UUFDakIsTUFBTSxVQUFVLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDbkQsb0JBQW9CLEVBQUUsWUFBWTtZQUNsQyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ2xFLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVTtTQUM3QixDQUFDLENBQUMsY0FBYyxDQUFDO1FBQ2xCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFFbEUsTUFBTSxLQUFLLEdBQUc7WUFDWixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDL0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNwQyxDQUFDO1FBRUYsdUJBQXVCO1FBQ3ZCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNwRSxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUM7WUFDM0QsZUFBZSxFQUFFO2dCQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSw4Q0FBOEMsQ0FBQztnQkFDeEcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsMENBQTBDLENBQUM7YUFDN0c7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDcEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDL0QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsSUFBSSxFQUFFLFVBQVU7WUFDaEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxJQUFJLEVBQUUsbUJBQW1CO1lBQ3pCLFlBQVksRUFBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVM7U0FDMUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxZQUFZLEdBQUcsSUFBSSxVQUFVLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3RGLGtCQUFrQixFQUFFO2dCQUNsQixVQUFVLEVBQUUsY0FBYztnQkFDMUIsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztnQkFDekIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsR0FBRztnQkFDbkMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhO2FBQ2hFO1lBQ0QsbUJBQW1CLEVBQUUsQ0FBQztvQkFDcEIsU0FBUyxFQUFFLEdBQUc7b0JBQ2QsWUFBWSxFQUFFLEdBQUc7b0JBQ2pCLGdCQUFnQixFQUFFLGFBQWE7aUJBQ2hDLEVBQUU7b0JBQ0QsU0FBUyxFQUFFLEdBQUc7b0JBQ2QsWUFBWSxFQUFFLEdBQUc7b0JBQ2pCLGdCQUFnQixFQUFFLGFBQWE7aUJBQ2hDLENBQUM7WUFDRixhQUFhLEVBQUUsQ0FBQztvQkFDZCxjQUFjLEVBQUU7d0JBQ2QsY0FBYyxFQUFFLFVBQVU7d0JBQzFCLG9CQUFvQixFQUFFLElBQUksVUFBVSxDQUFDLG9CQUFvQixDQUFDLElBQUksRUFBRSwwQkFBMEIsQ0FBQztxQkFDNUY7b0JBQ0QsU0FBUyxFQUFFO3dCQUNUOzRCQUNFLGlCQUFpQixFQUFFLElBQUk7NEJBQ3ZCLDBCQUEwQixFQUFFLENBQUM7b0NBQzNCLFNBQVMsRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsZUFBZTtvQ0FDekQsY0FBYyxFQUFFLGVBQWUsQ0FBQyxjQUFjO2lDQUMvQyxDQUFDO3lCQUNIO3dCQUNEOzRCQUNFLFdBQVcsRUFBRSxZQUFZOzRCQUN6QixHQUFHLEtBQUs7NEJBQ1IsMEJBQTBCLEVBQUUsQ0FBQztvQ0FDM0IsU0FBUyxFQUFFLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlO29DQUN6RCxjQUFjLEVBQUUsZUFBZSxDQUFDLGNBQWM7aUNBQy9DLENBQUM7eUJBQ0g7d0JBQ0Q7NEJBQ0UsV0FBVyxFQUFFLFlBQVk7NEJBQ3pCLEdBQUcsS0FBSzt5QkFDVDt3QkFDRDs0QkFDRSxXQUFXLEVBQUUsYUFBYTs0QkFDMUIsR0FBRyxLQUFLO3lCQUNUO3FCQUNGO2lCQUNGLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUUsRUFBRSxLQUFLLEVBQUUsWUFBWSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUVsRyxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2hELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3hELGlCQUFpQixFQUFFLFVBQVU7WUFDN0IsY0FBYyxFQUFFLEtBQUs7WUFDckIsWUFBWTtTQUNiLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWxHRCw4Q0FrR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ0Bhd3MtY2RrL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ0Bhd3MtY2RrL2F3cy1zMy1kZXBsb3ltZW50JztcclxuaW1wb3J0ICogYXMgY2xvdWRmcm9udCBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWRmcm9udCc7XHJcbmltcG9ydCAqIGFzIGFjbSBmcm9tICdAYXdzLWNkay9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ0Bhd3MtY2RrL2F3cy1sYW1iZGEnXHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdAYXdzLWNkay9hd3MtbG9ncydcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRnJvbnRlbmRDb25zdHJ1Y3RQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICAvKipcclxuICAgKiBUaGUgZG9tYWluIG5hbWUgZm9yIHRoZSBzaXRlIHRvIHVzZVxyXG4gICAqL1xyXG4gIHJlYWRvbmx5IGRvbWFpbm5hbWU6IHN0cmluZztcclxuICAvKipcclxuICAgKiBMb2NhdGlvbiBvZiBGRSBjb2RlIHRvIGRlcGxveVxyXG4gICAqL1xyXG4gIHJlYWRvbmx5IGRlcGxveW1lbnRTb3VyY2U6IHN0cmluZztcclxufVxyXG5cclxuLy8gc29tZSBjb2RlIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2F3cy1zYW1wbGVzL2F3cy1jZGstZXhhbXBsZXMvYmxvYi9tYXN0ZXIvdHlwZXNjcmlwdC9zdGF0aWMtc2l0ZS9zdGF0aWMtc2l0ZS50c1xyXG5leHBvcnQgY2xhc3MgRnJvbnRlbmRDb25zdHJ1Y3QgZXh0ZW5kcyBjZGsuQ29uc3RydWN0IHtcclxuICBjb25zdHJ1Y3RvcihwYXJlbnQ6IGNkay5Db25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBGcm9udGVuZENvbnN0cnVjdFByb3BzKSB7XHJcbiAgICBzdXBlcihwYXJlbnQsIGlkKTtcclxuXHJcbiAgICAvLyBDb250ZW50IGJ1Y2tldFxyXG4gICAgY29uc3Qgc2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ1NpdGVCdWNrZXQnLCB7XHJcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1lcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRMUyBjZXJ0aWZpY2F0ZVxyXG4gICAgY29uc3QgY2VydGlmaWNhdGVBcm4gPSBuZXcgYWNtLkNlcnRpZmljYXRlKHRoaXMsICdTaXRlQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmRvbWFpbm5hbWVcclxuICAgIH0pLmNlcnRpZmljYXRlQXJuO1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NlcnRpZmljYXRlJywgeyB2YWx1ZTogY2VydGlmaWNhdGVBcm4gfSk7XHJcblxyXG4gICAgY29uc3Qgbm9UdGwgPSB7XHJcbiAgICAgIG1pblR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXHJcbiAgICAgIG1heFR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXHJcbiAgICAgIGRlZmF1bHRUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApXHJcbiAgICB9O1xyXG5cclxuICAgIC8vaHR0cCBoZWFkZXJzIGZ1bmN0aW9uXHJcbiAgICBjb25zdCBjZkhlYWRlcnNMYW1iZGFSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdjZkhlYWRlcnNMYW1iZGFSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbU1hbmFnZWRQb2xpY3lBcm4odGhpcywgJ2R5bmFtb2RiJywgJ2Fybjphd3M6aWFtOjphd3M6cG9saWN5L0Nsb3VkRnJvbnRGdWxsQWNjZXNzJyksXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbU1hbmFnZWRQb2xpY3lBcm4odGhpcywgJ2F3c2xhbWJkYWV4ZWN1dGUnLCAnYXJuOmF3czppYW06OmF3czpwb2xpY3kvQVdTTGFtYmRhRXhlY3V0ZScpXHJcbiAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGxhbWJkYUNvZGUgPSBuZXcgbGFtYmRhLkFzc2V0Q29kZSgnLi9sYW1iZGEvJylcclxuICAgIGNvbnN0IGNmSGVhZGVyc0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ2NmSGVhZGVyc2ZuJywge1xyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYUNvZGUsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xMl9YLFxyXG4gICAgICByb2xlOiBjZkhlYWRlcnNMYW1iZGFSb2xlLFxyXG4gICAgICBsb2dSZXRlbnRpb246bG9ncy5SZXRlbnRpb25EYXlzLkZJVkVfREFZU1xyXG4gICAgfSk7XHJcbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBuZXcgY2xvdWRmcm9udC5DbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uKHRoaXMsICdTaXRlRGlzdHJpYnV0aW9uJywge1xyXG4gICAgICBhbGlhc0NvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICBhY21DZXJ0UmVmOiBjZXJ0aWZpY2F0ZUFybixcclxuICAgICAgICBuYW1lczogW3Byb3BzLmRvbWFpbm5hbWVdLFxyXG4gICAgICAgIHNzbE1ldGhvZDogY2xvdWRmcm9udC5TU0xNZXRob2QuU05JLFxyXG4gICAgICAgIHNlY3VyaXR5UG9saWN5OiBjbG91ZGZyb250LlNlY3VyaXR5UG9saWN5UHJvdG9jb2wuVExTX1YxXzJfMjAxOFxyXG4gICAgICB9LFxyXG4gICAgICBlcnJvckNvbmZpZ3VyYXRpb25zOiBbe1xyXG4gICAgICAgIGVycm9yQ29kZTogNDAzLFxyXG4gICAgICAgIHJlc3BvbnNlQ29kZTogMjAwLFxyXG4gICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCdcclxuICAgICAgfSwge1xyXG4gICAgICAgIGVycm9yQ29kZTogNDA0LFxyXG4gICAgICAgIHJlc3BvbnNlQ29kZTogMjAwLFxyXG4gICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCdcclxuICAgICAgfV0sXHJcbiAgICAgIG9yaWdpbkNvbmZpZ3M6IFt7XHJcbiAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcclxuICAgICAgICAgIHMzQnVja2V0U291cmNlOiBzaXRlQnVja2V0LFxyXG4gICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHk6IG5ldyBjbG91ZGZyb250Lk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsICdTaXRlT3JpZ2luQWNjZXNzSWRlbnRpdHknKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYmVoYXZpb3JzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGlzRGVmYXVsdEJlaGF2aW9yOiB0cnVlLFxyXG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbkFzc29jaWF0aW9uczogW3tcclxuICAgICAgICAgICAgICBldmVudFR5cGU6IGNsb3VkZnJvbnQuTGFtYmRhRWRnZUV2ZW50VHlwZS5PUklHSU5fUkVTUE9OU0UsXHJcbiAgICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IGNmSGVhZGVyc0xhbWJkYS5jdXJyZW50VmVyc2lvblxyXG4gICAgICAgICAgICB9XVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgcGF0aFBhdHRlcm46ICdpbmRleC5odG1sJyxcclxuICAgICAgICAgICAgLi4ubm9UdGwsXHJcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uQXNzb2NpYXRpb25zOiBbe1xyXG4gICAgICAgICAgICAgIGV2ZW50VHlwZTogY2xvdWRmcm9udC5MYW1iZGFFZGdlRXZlbnRUeXBlLk9SSUdJTl9SRVNQT05TRSxcclxuICAgICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogY2ZIZWFkZXJzTGFtYmRhLmN1cnJlbnRWZXJzaW9uXHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBwYXRoUGF0dGVybjogJ3JvYm90cy50eHQnLFxyXG4gICAgICAgICAgICAuLi5ub1R0bFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgcGF0aFBhdHRlcm46ICdmYXZpY29uLmljbycsXHJcbiAgICAgICAgICAgIC4uLm5vVHRsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH1dXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7IHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQgfSk7XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uRG9tYWlubmFtZScsIHsgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lIH0pO1xyXG5cclxuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdEZXBsb3ltZW50Jywge1xyXG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHByb3BzLmRlcGxveW1lbnRTb3VyY2UpXSxcclxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHNpdGVCdWNrZXQsXHJcbiAgICAgIHJldGFpbk9uRGVsZXRlOiBmYWxzZSxcclxuICAgICAgZGlzdHJpYnV0aW9uXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbiJdfQ==