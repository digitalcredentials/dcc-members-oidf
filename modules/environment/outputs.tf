output "lambda_function_name" {
  description = "Name of the Lambda function"
  value = aws_lambda_function.issuer_registry.function_name
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table"
  value = aws_dynamodb_table.issuers.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  value = aws_dynamodb_table.issuers.arn
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value = aws_cloudfront_distribution.api_distribution.domain_name
} 