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

######################### CREATE SECRET IN SECRETS MANAGER ######################

/*
resource "aws_secretsmanager_secret" "test_secret" {
  name        = "test/test2"
  description = "Test secret for storing sensitive information"
}

resource "aws_secretsmanager_secret_version" "test_secret_value" {
  secret_id     = aws_secretsmanager_secret.test_secret.id
  secret_string = jsonencode({
    value = "abcdefg"
  })
}
*/

###################### CREATE S3 BUCKET ######################

resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "test-bucket-${random_string.suffix.result}" # Ensure unique bucket name
  force_destroy = true # Allows automatic deletion of the bucket on destroy
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

################################## LAMBDA #############################

data "archive_file" "zip-nodejs" {
  type        = "zip"
  source_dir = "lambda_function"
  output_path = "lambda_counter2.zip"
}

resource "aws_s3_object" "lambda-in-s3" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "lambda_counter2.zip"
  source = data.archive_file.zip-nodejs.output_path
  etag   = filemd5(data.archive_file.zip-nodejs.output_path)
}

resource "aws_lambda_function" "lambda-issuerregistry" {
  function_name = "issuer-registry"
  s3_bucket     = aws_s3_bucket.lambda_bucket.bucket
  s3_key        = aws_s3_object.lambda-in-s3.key

  runtime = "nodejs22.x"
  handler = "lambda_counter2.lambdaHandler"

  source_code_hash = data.archive_file.zip-nodejs.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      USE_DYNAMODB = "true"
    }
  }
}

resource "aws_cloudwatch_log_group" "lambda-issuerregistry" {
  name              = "/aws/lambda/${aws_lambda_function.lambda-issuerregistry.function_name}"
  retention_in_days = 30
}

resource "aws_iam_role" "lambda_exec" {
  name = "serverless_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Sid    = ""
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamoroles" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

resource "aws_iam_role_policy_attachment" "lambda_secretsmanager" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/SecretsManagerReadWrite"
}

###################### DYNAMODB #####################

resource "aws_dynamodb_table" "dynamo-issuers" {
  name         = "db-issuers"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "sub_name"

  attribute {
    name = "sub_name"
    type = "S"
  }
}

resource "aws_dynamodb_table" "dynamo-issuer_public_keys" {
  name         = "db-issuer_public_keys"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "sub_name"

  attribute {
    name = "sub_name"
    type = "S"
  }
}


resource "aws_dynamodb_table" "dynamo-registry_public_keys" {
  name         = "db-registry_public_keys"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "key_id"

  attribute {
    name = "key_id"
    type = "S"
  }
}


####################### HTTP API GATEWAY #####################

resource "aws_apigatewayv2_api" "api-lambda_counter2" {
  name          = "api-lambda_counter2"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.api-lambda_counter2.id
  name        = "dev"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "api-lambda" {
  api_id                 = aws_apigatewayv2_api.api-lambda_counter2.id
  integration_uri        = aws_lambda_function.lambda-issuerregistry.invoke_arn
  payload_format_version = "2.0"
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
}

resource "aws_apigatewayv2_route" "api-subordinate-listing" {
  api_id    = aws_apigatewayv2_api.api-lambda_counter2.id
  route_key = "GET /issuer-registry/subordinate_listing"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}

resource "aws_apigatewayv2_route" "api-issuer-registry" {
  api_id    = aws_apigatewayv2_api.api-lambda_counter2.id
  route_key = "GET /issuer-registry/.well-known/openid-federation"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}

resource "aws_apigatewayv2_route" "api-issuer-registry-fetch" {
  api_id    = aws_apigatewayv2_api.api-lambda_counter2.id
  route_key = "GET /issuer-registry/fetch"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}



resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda-issuerregistry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api-lambda_counter2.execution_arn}/*/*/*"
}
