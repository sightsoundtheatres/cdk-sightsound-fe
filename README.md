This is the frontend construct to be used in AWS CDK applications

install with 

npm i @sightsoundtheatres/cdk-sightsound-fe

currently it uses cdk version 1.74.0

The construct builds:

S3 bucket with complied angular code in it
Cloudfront distribution with lambda @edge for HTTP headers
ACM certificate
