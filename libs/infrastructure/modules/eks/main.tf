locals {
  cluster_tags = merge(var.tags, {
    Name = var.cluster_name
  })
}

resource "aws_iam_role" "cluster" {
  name = "${var.cluster_name}-cluster"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.cluster_tags
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKS_VPCResourceController" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.cluster.name
}

resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster"
  description = "Cluster communication with worker nodes"
  vpc_id      = var.vpc_id

  tags = merge(local.cluster_tags, {
    Name = "${var.cluster_name}-sg"
  })
}

resource "aws_security_group_rule" "cluster_allow_worker" {
  description              = "Allow worker nodes to communicate with control plane"
  from_port                = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cluster.id
  source_security_group_id = aws_security_group.worker.id
  to_port                  = 443
  type                     = "ingress"
}

resource "aws_security_group" "worker" {
  name        = "${var.cluster_name}-workers"
  description = "Security group for worker nodes"
  vpc_id      = var.vpc_id

  tags = merge(local.cluster_tags, {
    Name = "${var.cluster_name}-workers"
  })
}

resource "aws_security_group_rule" "worker_allow_cluster" {
  description              = "Allow worker nodes to receive communication from control plane"
  from_port                = 1024
  protocol                 = "tcp"
  security_group_id        = aws_security_group.worker.id
  source_security_group_id = aws_security_group.cluster.id
  to_port                  = 65535
  type                     = "ingress"
}

resource "aws_security_group_rule" "worker_allow_all_outbound" {
  description       = "Allow all egress from worker nodes"
  from_port         = 0
  protocol          = "-1"
  security_group_id = aws_security_group.worker.id
  to_port           = 0
  type              = "egress"
}

resource "aws_eks_cluster" "this" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster.arn
  version  = var.cluster_version

  vpc_config {
    security_group_ids      = [aws_security_group.cluster.id]
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    # Disable public control-plane endpoint to ensure API server is reachable
    # only from within the VPC (private subnets). This reduces exposure.
    endpoint_public_access  = false
    public_access_cidrs     = []
  }

  enabled_cluster_log_types = var.cluster_log_types

  tags = local.cluster_tags

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
    aws_iam_role_policy_attachment.cluster_AmazonEKS_VPCResourceController
  ]
}

data "tls_certificate" "this" {
  count = var.enable_irsa ? 1 : 0
  url   = aws_eks_cluster.this.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "this" {
  count = var.enable_irsa ? 1 : 0

  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.this[0].certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.this.identity[0].oidc[0].issuer

  tags = local.cluster_tags
}

resource "aws_iam_role" "node" {
  for_each = var.node_groups

  name = "${var.cluster_name}-${each.key}-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = local.cluster_tags
}

resource "aws_iam_role_policy_attachment" "node_worker" {
  for_each   = var.node_groups
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node[each.key].name
}

resource "aws_iam_role_policy_attachment" "node_cni" {
  for_each   = var.node_groups
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node[each.key].name
}

resource "aws_iam_role_policy_attachment" "node_registry" {
  for_each   = var.node_groups
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node[each.key].name
}

resource "aws_eks_node_group" "this" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.this.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node[each.key].arn
  subnet_ids      = var.private_subnet_ids
  capacity_type   = lookup(each.value, "capacity_type", "ON_DEMAND")
  disk_size       = lookup(each.value, "disk_size", 50)

  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  instance_types = each.value.instance_types
  labels         = lookup(each.value, "labels", {})

  dynamic "taint" {
    for_each = lookup(each.value, "taints", [])
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }

  update_config {
    max_unavailable = 1
  }

  tags = merge(local.cluster_tags, {
    NodeGroup = each.key
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_worker,
    aws_iam_role_policy_attachment.node_cni,
    aws_iam_role_policy_attachment.node_registry
  ]
}
