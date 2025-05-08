terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Ensures compatibility with AWS provider version 5.x
    }
  }
}

provider "aws" {
  region = "us-east-1" # AWS region where resources will be deployed
}

# Random string for unique resource names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Lambda function source code
data "archive_file" "zip-nodejs" {
  type        = "zip"
  source_dir = "lambda_function"
  output_path = "issuer_registry.zip"
}

# Certificate Module
module "certificates" {
  source = "./modules/certificates"
}

# Test Environment Module
module "test" {
  source = "./modules/environment"
  
  environment = "t"
  suffix = random_string.suffix.result
  lambda_zip_path = data.archive_file.zip-nodejs.output_path
  lambda_zip_hash = data.archive_file.zip-nodejs.output_base64sha256
  domain_name = "test.registry.dcconsortium.org"
  certificate_arn = module.certificates.certificate_arn
}

# Production Environment Module
module "production" {
  source = "./modules/environment"
  
  environment = "p"
  suffix = random_string.suffix.result
  lambda_zip_path = data.archive_file.zip-nodejs.output_path
  lambda_zip_hash = data.archive_file.zip-nodejs.output_base64sha256
  domain_name = "registry.dcconsortium.org"
  certificate_arn = module.certificates.certificate_arn
}

# Move resources to their new modular locations
moved {
  from = aws_acm_certificate.registry_cert
  to   = module.certificates.aws_acm_certificate.registry_cert
}

moved {
  from = aws_acm_certificate_validation.registry_cert_validation
  to   = module.certificates.aws_acm_certificate_validation.registry_cert_validation
}

# Test environment moves
moved {
  from = aws_dynamodb_table.dynamo-issuers
  to   = module.test.aws_dynamodb_table.issuers
}

moved {
  from = aws_dynamodb_table.dynamo-registry-public-keys
  to   = module.test.aws_dynamodb_table.registry_public_keys
}

moved {
  from = aws_lambda_function.dcc-oidf-t-lambda-issuerregistry
  to   = module.test.aws_lambda_function.issuer_registry
}

moved {
  from = aws_apigatewayv2_api.dcc-oidf-t-api-issuer-registry
  to   = module.test.aws_apigatewayv2_api.issuer_registry
}

moved {
  from = aws_cloudfront_distribution.dcc-oidf-t-api-distribution
  to   = module.test.aws_cloudfront_distribution.api_distribution
}

# Production environment moves
moved {
  from = aws_dynamodb_table.dcc-oidf-p-dynamo-issuers
  to   = module.production.aws_dynamodb_table.issuers
}

moved {
  from = aws_dynamodb_table.dcc-oidf-p-dynamo-registry-public-keys
  to   = module.production.aws_dynamodb_table.registry_public_keys
}

moved {
  from = aws_lambda_function.dcc-oidf-p-lambda-issuerregistry
  to   = module.production.aws_lambda_function.issuer_registry
}

moved {
  from = aws_apigatewayv2_api.dcc-oidf-p-api-issuer-registry
  to   = module.production.aws_apigatewayv2_api.issuer_registry
}

moved {
  from = aws_cloudfront_distribution.dcc-oidf-p-api-distribution
  to   = module.production.aws_cloudfront_distribution.api_distribution
} 