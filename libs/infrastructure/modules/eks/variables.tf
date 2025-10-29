variable "cluster_name" {
  description = "Name of the EKS cluster."
  type        = string
}

variable "cluster_version" {
  description = "Kubernetes version for the control plane."
  type        = string
  default     = "1.29"
}

variable "vpc_id" {
  description = "ID of the VPC hosting the cluster."
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for worker nodes."
  type        = list(string)
}

variable "public_subnet_ids" {
  description = "List of public subnet IDs for control plane reachability (optional)."
  type        = list(string)
  default     = []
}

variable "node_groups" {
  description = "Map of node group configurations."
  type = map(object({
    instance_types  = list(string)
    desired_size    = number
    min_size        = number
    max_size        = number
    disk_size       = optional(number, 50)
    capacity_type   = optional(string, "ON_DEMAND")
    labels          = optional(map(string), {})
    taints          = optional(list(object({
      key    = string
      value  = string
      effect = string
    })), [])
  }))
  default = {
    default = {
      instance_types = ["m6i.large"]
      desired_size   = 2
      min_size       = 1
      max_size       = 4
    }
  }
}

variable "enable_irsa" {
  description = "Whether to configure IAM OIDC provider for IRSA."
  type        = bool
  default     = true
}

variable "cluster_log_types" {
  description = "List of control plane log types to enable."
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

variable "tags" {
  description = "Common tags applied to cluster resources."
  type        = map(string)
  default     = {}
}
