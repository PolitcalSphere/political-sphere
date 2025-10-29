locals {
  tags = merge(var.tags, {
    Name = var.zone_name
  })
}

resource "aws_route53_zone" "this" {
  name = var.zone_name

  comment = var.comment

  dynamic "vpc" {
    for_each = length(var.vpc_id) > 0 ? [1] : []
    content {
      vpc_id     = var.vpc_id
      vpc_region = var.vpc_region
    }
  }

  tags = local.tags
}

resource "aws_route53_record" "this" {
  for_each = var.records

  zone_id = aws_route53_zone.this.zone_id
  name    = each.key
  type    = each.value.type
  ttl     = each.value.alias == null ? lookup(each.value, "ttl", 300) : null
  records = each.value.alias == null ? lookup(each.value, "records", []) : null

  dynamic "alias" {
    for_each = each.value.alias == null ? [] : [each.value.alias]
    content {
      name                   = alias.value.name
      zone_id                = alias.value.zone_id
      evaluate_target_health = lookup(alias.value, "evaluate_target_health", false)
    }
  }
}
