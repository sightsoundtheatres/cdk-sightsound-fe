This is the frontend construct to be used in AWS CDK applications

Install with `npm i @sightsoundtheatres/cdk-sightsound-fe`

The construct builds:

- S3 bucket with complied code in it
- Cloudfront distribution with security headers and caching
- ACM certificate

Set `noIndex: true` to add an `X-Robots-Tag: noindex, nofollow` header to every response (for internal apps). The app's `robots.txt` must allow crawling, or search engines never see the header.
