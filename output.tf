output "function_name" {
  description = "Name of the Lambda function."
  value = module.test.lambda_function_name
}

output "cloudfront_gateway_cname_test" {
  value = module.test.cloudfront_domain_name
  description = "The CloudFront distribution domain name"
}

output "cloudfront_gateway_cname_prod" {
  value = module.production.cloudfront_domain_name
  description = "The production CloudFront distribution domain name"
}

output "certificate_validation_cname" {
  description = "[Add to your DNS records first] Certificate validation CNAME record for registry.dcconsortium.org"
  value = {
    Domain = module.certificates.certificate_domain_name
    Type = "CNAME"
    "CNAME name" = [for option in toset(module.certificates.certificate_validation_options) : option.resource_record_name if option.domain_name == module.certificates.certificate_domain_name][0]
    "CNAME value" = [for option in toset(module.certificates.certificate_validation_options) : option.resource_record_value if option.domain_name == module.certificates.certificate_domain_name][0]
  }
}

output "subdomain_validation_cname" {
  description = "[Add to your DNS records first] Certificate validation CNAME record for test.registry.dcconsortium.org"
  value = {
    Domain = [for name in toset(module.certificates.certificate_subject_alternative_names) : name if name != module.certificates.certificate_domain_name][0]
    Type = "CNAME"
    "CNAME name" = [for option in toset(module.certificates.certificate_validation_options) : option.resource_record_name if option.domain_name != module.certificates.certificate_domain_name][0]
    "CNAME value" = [for option in toset(module.certificates.certificate_validation_options) : option.resource_record_value if option.domain_name != module.certificates.certificate_domain_name][0]
  }
}
