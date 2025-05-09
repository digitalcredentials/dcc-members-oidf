output "certificate_domain_name" {
  description = "Domain name of the certificate"
  value = aws_acm_certificate.registry_cert.domain_name
}

output "certificate_validation_options" {
  description = "Certificate validation options"
  value = aws_acm_certificate.registry_cert.domain_validation_options
}

output "certificate_subject_alternative_names" {
  description = "Subject alternative names of the certificate"
  value = aws_acm_certificate.registry_cert.subject_alternative_names
} 