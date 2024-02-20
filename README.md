# Texit Constructs

This package exposes constructs to deploy texit as a serverless application to AWS.

## Usage

Two types of resources are exposed here, stacks and constructs. A typicaly installation can just import the stacks as default and deploy them. If you want a custom installation, all the resources have constructs exposed and you can use them to build your own stacks. To see an example deployment, see the [serverless example](https://github.com/awlsring/texit/blob/main/docs/serverless/serverless.md) in the main texit repo.

You need to supply a path to the binaries of the applications you are deploying due to limitations with CDK. Its is recommended to just grab them from a release and when creating a resource, just point to the path you downloaded them to.

Configs to run the binaries are expected to be in an S3 bucket. The bucket name and the path to the config file are expected to be passed as parameters to the resources.
