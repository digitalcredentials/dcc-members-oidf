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
  output_path = "issuer_registry.zip"
}

resource "aws_s3_object" "lambda-in-s3" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "issuer_registry.zip"
  source = data.archive_file.zip-nodejs.output_path
  etag   = filemd5(data.archive_file.zip-nodejs.output_path)
}

resource "aws_lambda_function" "lambda-issuerregistry" {
  function_name = "issuer-registry"
  s3_bucket     = aws_s3_bucket.lambda_bucket.bucket
  s3_key        = aws_s3_object.lambda-in-s3.key

  runtime = "nodejs22.x"
  handler = "issuer_registry.lambdaHandler"

  source_code_hash = data.archive_file.zip-nodejs.output_base64sha256

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      USE_DYNAMODB = "true"
      IS_TEST_OR_PROD = "t"
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
  name         = "dcc-oidf-t-db-issuers"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "sub_name"

  attribute {
    name = "sub_name"
    type = "S"
  }
}

resource "aws_dynamodb_table" "dynamo-registry-public-keys" {
  name         = "dcc-oidf-t-db-registry-public-keys"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "key_id"

  attribute {
    name = "key_id"
    type = "S"
  }
}

####################### HTTP API GATEWAY #####################

resource "aws_apigatewayv2_api" "api-issuer_registry" {
  name          = "api-issuer_registry"
  protocol_type = "HTTP"
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_apigatewayv2_api.api-issuer_registry.name}"
  retention_in_days = 30
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda-issuerregistry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api-issuer_registry.execution_arn}/*/*/*"
}

# Create IAM role for API Gateway
resource "aws_iam_role" "api_gateway" {
  name = "api_gateway_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

# Add IAM policy for API Gateway to write logs
resource "aws_iam_role_policy" "api_gateway_logs" {
  name = "api_gateway_logs"
  role = aws_iam_role.api_gateway.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.api-issuer_registry.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip            = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod    = "$context.httpMethod"
      routeKey      = "$context.routeKey"
      status        = "$context.status"
      protocol      = "$context.protocol"
      responseLength = "$context.responseLength"
      integrationError = "$context.integration.error"
    })
  }
}

resource "aws_apigatewayv2_integration" "api-lambda" {
  api_id                 = aws_apigatewayv2_api.api-issuer_registry.id
  integration_uri        = aws_lambda_function.lambda-issuerregistry.invoke_arn
  payload_format_version = "2.0"
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
}

resource "aws_apigatewayv2_route" "api-subordinate-listing" {
  api_id    = aws_apigatewayv2_api.api-issuer_registry.id
  route_key = "GET /subordinate_listing"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}

resource "aws_apigatewayv2_route" "api-issuer-registry" {
  api_id    = aws_apigatewayv2_api.api-issuer_registry.id
  route_key = "GET /.well-known/openid-federation"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}

resource "aws_apigatewayv2_route" "api-issuer-registry-fetch" {
  api_id    = aws_apigatewayv2_api.api-issuer_registry.id
  route_key = "GET /fetch"
  target    = "integrations/${aws_apigatewayv2_integration.api-lambda.id}"
}

###################### ACM CERTIFICATE ######################

resource "aws_acm_certificate" "registry_cert" {
  domain_name       = "registry.dcconsortium.org"
  subject_alternative_names = ["test.registry.dcconsortium.org"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Will not fully finish deploying until the CNAME records are put in at the subdomain
resource "aws_acm_certificate_validation" "registry_cert_validation" {
  certificate_arn         = aws_acm_certificate.registry_cert.arn
  validation_record_fqdns = [for record in aws_acm_certificate.registry_cert.domain_validation_options : record.resource_record_name]
}

###################### CLOUDFRONT DISTRIBUTION ######################

resource "aws_cloudfront_distribution" "api_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for API Gateway"
  default_root_object = ""
  price_class         = "PriceClass_100"  # US, Canada, Europe

  aliases = ["test.registry.dcconsortium.org"]  # Add your custom domain here

  origin {
    domain_name = "${aws_apigatewayv2_api.api-issuer_registry.id}.execute-api.us-east-1.amazonaws.com"
    origin_id   = "api-gateway"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "api-gateway"

    forwarded_values {
      query_string = true
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate_validation.registry_cert_validation.certificate_arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
