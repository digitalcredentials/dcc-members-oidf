output "function_name" {
  description = "Name of the Lambda function."

  value = aws_lambda_function.lambda-issuerregistry.function_name
}

output "environment_table_name" {
  description = "Name of the environment DynamoDB table"
  value       = aws_dynamodb_table.dynamo-issuers.name
}

output "environment_table_arn" {
  description = "ARN of the environment DynamoDB table"
  value       = aws_dynamodb_table.dynamo-issuers.arn
}

output "api_gateway_invoke_url" {
  description = "Invoke URL for the API Gateway"
  value       = aws_apigatewayv2_stage.dev.invoke_url
}

output "api_gateway_endpoint" {
  description = "The API Gateway endpoint URL"
  value       = aws_apigatewayv2_domain_name.custom_domain.domain_name_configuration[0].target_domain_name
}

output "api_gateway_stage_url" {
  description = "The full URL for the API Gateway stage"
  value       = "https://${aws_apigatewayv2_domain_name.custom_domain.domain_name}/"
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

output "api_gateway_cname" {
  description = "[Add to your DNS records second] API Gateway CNAME record"
  value = {
    Host = aws_apigatewayv2_domain_name.custom_domain.domain_name
    Type = "CNAME"
    Value = aws_apigatewayv2_domain_name.custom_domain.domain_name_configuration[0].target_domain_name
  }
}