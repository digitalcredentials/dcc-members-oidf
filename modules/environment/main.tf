variable "environment" {
  description = "Environment identifier (t for test, p for production)"
  type        = string
}

variable "suffix" {
  description = "Random suffix for resource names"
  type        = string
}

variable "lambda_zip_path" {
  description = "Path to the Lambda function zip file"
  type        = string
}

variable "lambda_zip_hash" {
  description = "Hash of the Lambda function zip file"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the environment"
  type        = string
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate"
  type        = string
}

locals {
  env_prefix = "dcc-oidf-${var.environment}"
}

# S3 Bucket
resource "aws_s3_bucket" "lambda_bucket" {
  bucket = "${local.env_prefix}-lambda-${var.suffix}"
  force_destroy = true
}

resource "aws_s3_object" "lambda_in_s3" {
  bucket = aws_s3_bucket.lambda_bucket.bucket
  key    = "issuer_registry.zip"
  source = var.lambda_zip_path
  etag   = filemd5(var.lambda_zip_path)
}

# Lambda Function
resource "aws_lambda_function" "issuer_registry" {
  function_name = "${local.env_prefix}-issuer-registry"
  s3_bucket     = aws_s3_bucket.lambda_bucket.bucket
  s3_key        = aws_s3_object.lambda_in_s3.key

  runtime = "nodejs22.x"
  handler = "issuer_registry.lambdaHandler"

  source_code_hash = var.lambda_zip_hash

  role = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      USE_DYNAMODB = "true"
      IS_TEST_OR_PROD = var.environment
    }
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.issuer_registry.function_name}"
  retention_in_days = 30
}

# IAM Role
resource "aws_iam_role" "lambda_exec" {
  name = "${local.env_prefix}-serverless-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
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

# DynamoDB Tables
resource "aws_dynamodb_table" "issuers" {
  name         = "${local.env_prefix}-db-issuers"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "sub_name"

  attribute {
    name = "sub_name"
    type = "S"
  }
}

resource "aws_dynamodb_table" "registry_public_keys" {
  name         = "${local.env_prefix}-db-registry-public-keys"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "key_id"

  attribute {
    name = "key_id"
    type = "S"
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "issuer_registry" {
  name          = "${local.env_prefix}-api-issuer-registry"
  protocol_type = "HTTP"
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/${aws_apigatewayv2_api.issuer_registry.name}"
  retention_in_days = 30
}

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.issuer_registry.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.issuer_registry.execution_arn}/*/*/*"
}

resource "aws_iam_role" "api_gateway" {
  name = "${local.env_prefix}-api-gateway-role"

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

resource "aws_iam_role_policy" "api_gateway_logs" {
  name = "${local.env_prefix}-api-gateway-logs"
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

resource "aws_apigatewayv2_stage" "api_gateway_stage" {
  api_id      = aws_apigatewayv2_api.issuer_registry.id
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

resource "aws_apigatewayv2_integration" "api_lambda" {
  api_id                 = aws_apigatewayv2_api.issuer_registry.id
  integration_uri        = aws_lambda_function.issuer_registry.invoke_arn
  payload_format_version = "2.0"
  integration_type       = "AWS_PROXY"
  integration_method     = "POST"
}

resource "aws_apigatewayv2_route" "subordinate_listing" {
  api_id    = aws_apigatewayv2_api.issuer_registry.id
  route_key = "GET /subordinate_listing"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

resource "aws_apigatewayv2_route" "issuer_registry" {
  api_id    = aws_apigatewayv2_api.issuer_registry.id
  route_key = "GET /.well-known/openid-federation"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

resource "aws_apigatewayv2_route" "issuer_registry_fetch" {
  api_id    = aws_apigatewayv2_api.issuer_registry.id
  route_key = "GET /fetch"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

# Default route for handling unmatched routes
resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.issuer_registry.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.api_lambda.id}"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "api_distribution" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "${local.env_prefix}-cloudfront-distribution"
  default_root_object = ""
  price_class         = "PriceClass_100"

  aliases = [var.domain_name]

  origin {
    domain_name = "${aws_apigatewayv2_api.issuer_registry.id}.execute-api.us-east-1.amazonaws.com"
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
    acm_certificate_arn = var.certificate_arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.api_distribution.domain_name
} 