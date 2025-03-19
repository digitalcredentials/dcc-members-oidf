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