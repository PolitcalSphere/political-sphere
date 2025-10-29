variable "name" {
  description = "Name prefix for VPC resources."
  type        = string
}

variable "cidr_block" {
  description = "CIDR block for the VPC."
  type        = string
}

variable "azs" {
  description = "List of availability zones to spread subnets across."
  type        = list(string)
}

variable "public_subnets" {
  description = "CIDR blocks for public subnets."
  type        = list(string)
}

variable "private_subnets" {
  description = "CIDR blocks for private subnets."
  type        = list(string)
}

variable "enable_nat_gateway" {
  description = "Whether to provision NAT gateways."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to VPC resources."
  type        = map(string)
  default     = {}
}
