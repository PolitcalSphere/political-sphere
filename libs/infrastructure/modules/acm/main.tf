resource "aws_acm_certificate" "this" {
  domain_name               = var.domain_name
  validation_method         = var.validation_method
  subject_alternative_names = var.subject_alternative_names

  tags = var.tags
}

data "aws_route53_zone" "validation" {
  count = var.validation_method == "DNS" && length(var.zone_id) == 0 ? 1 : 0
  name  = var.domain_name
}

locals {
  zone_id = length(var.zone_id) > 0 ? var.zone_id : try(data.aws_route53_zone.validation[0].zone_id, null)
}

resource "aws_route53_record" "validation" {
  for_each = var.validation_method == "DNS" ? { for dvo in aws_acm_certificate.this.domain_validation_options : dvo.domain_name => dvo } : {}

  name    = each.value.resource_record_name
  type    = each.value.resource_record_type
  records = [each.value.resource_record_value]
  ttl     = 60
  zone_id = local.zone_id
}

resource "aws_acm_certificate_validation" "this" {
  count = var.validation_method == "DNS" ? 1 : 0

  certificate_arn = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
