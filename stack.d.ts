import * as cdk from '@aws-cdk/core';
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
export declare class FrontendConstruct extends cdk.Construct {
    constructor(parent: cdk.Construct, id: string, props: FrontendConstructProps);
}
