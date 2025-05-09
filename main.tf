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