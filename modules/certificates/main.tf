resource "aws_acm_certificate" "registry_cert" {
  domain_name       = "registry.dcconsortium.org"
  subject_alternative_names = ["test.registry.dcconsortium.org"]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "registry_cert_validation" {
  certificate_arn         = aws_acm_certificate.registry_cert.arn
  validation_record_fqdns = [for record in aws_acm_certificate.registry_cert.domain_validation_options : record.resource_record_name]
}

output "certificate_arn" {
  value = aws_acm_certificate_validation.registry_cert_validation.certificate_arn
} 