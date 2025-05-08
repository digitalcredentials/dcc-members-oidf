output "function_name" {
  description = "Name of the Lambda function."

  value = aws_lambda_function.dcc-oidf-t-lambda-issuerregistry.function_name
}

output "environment_table_name" {
  description = "Name of the environment DynamoDB table"
  value       = aws_dynamodb_table.dynamo-issuers.name
}

output "environment_table_arn" {
  description = "ARN of the environment DynamoDB table"
  value       = aws_dynamodb_table.dynamo-issuers.arn
}

output "cloudfront_gateway_cname_test" {
  value = aws_cloudfront_distribution.dcc-oidf-t-api-distribution.domain_name
  description = "The CloudFront distribution domain name"
}

output "cloudfront_gateway_cname_prod" {
  value = aws_cloudfront_distribution.dcc-oidf-p-api-distribution.domain_name
  description = "The production CloudFront distribution domain name"
}

output "certificate_validation_cname" {
  description = "[Add to your DNS records first] Certificate validation CNAME record for registry.dcconsortium.org"
  value = {
    Domain = aws_acm_certificate.registry_cert.domain_name
    Type = "CNAME"
    "CNAME name" = [for option in toset(aws_acm_certificate.registry_cert.domain_validation_options) : option.resource_record_name if option.domain_name == aws_acm_certificate.registry_cert.domain_name][0]
    "CNAME value" = [for option in toset(aws_acm_certificate.registry_cert.domain_validation_options) : option.resource_record_value if option.domain_name == aws_acm_certificate.registry_cert.domain_name][0]
  }
}

output "subdomain_validation_cname" {
  description = "[Add to your DNS records first] Certificate validation CNAME record for test.registry.dcconsortium.org"
  value = {
    Domain = [for name in toset(aws_acm_certificate.registry_cert.subject_alternative_names) : name if name != aws_acm_certificate.registry_cert.domain_name][0]
    Type = "CNAME"
    "CNAME name" = [for option in toset(aws_acm_certificate.registry_cert.domain_validation_options) : option.resource_record_name if option.domain_name != aws_acm_certificate.registry_cert.domain_name][0]
    "CNAME value" = [for option in toset(aws_acm_certificate.registry_cert.domain_validation_options) : option.resource_record_value if option.domain_name != aws_acm_certificate.registry_cert.domain_name][0]
  }
}
