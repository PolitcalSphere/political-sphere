# VPC Module - Public IP Assignment Policy

## Security Change (2025-11-08)

**Issue**: `map_public_ip_on_launch = true` automatically assigned public IP addresses to all EC2 instances launched in public subnets, exposing resources unnecessarily to the internet.

**Fix**: Changed `map_public_ip_on_launch = false` in public subnets.

**Impact**: Resources launched in public subnets will NO LONGER receive public IPs automatically.

---

## How to Assign Public IPs When Needed

### Option 1: Elastic IP (Recommended for Persistent Resources)

For resources that need a static public IP (e.g., bastion hosts, NAT instances):

```hcl
resource "aws_eip" "bastion" {
  vpc = true
  tags = {
    Name = "bastion-eip"
  }
}

resource "aws_instance" "bastion" {
  ami           = "ami-xxxxx"
  instance_type = "t3.micro"
  subnet_id     = module.vpc.public_subnet_ids[0]

  # Do NOT use associate_public_ip_address
  # Instead, attach Elastic IP separately

  tags = {
    Name = "bastion-host"
  }
}

resource "aws_eip_association" "bastion" {
  instance_id   = aws_instance.bastion.id
  allocation_id = aws_eip.bastion.id
}
```

### Option 2: Instance-Level Assignment (Not Recommended)

Only use this for temporary or ephemeral resources:

```hcl
resource "aws_instance" "temp_instance" {
  ami                         = "ami-xxxxx"
  instance_type               = "t3.micro"
  subnet_id                   = module.vpc.public_subnet_ids[0]
  associate_public_ip_address = true  # Explicit assignment at instance level

  tags = {
    Name        = "temporary-instance"
    Environment = "dev"
  }
}
```

### Option 3: Load Balancers (Recommended for Web Applications)

Application Load Balancers automatically receive public IPs when using public subnets:

```hcl
resource "aws_lb" "web" {
  name               = "web-alb"
  internal           = false  # Public-facing
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnet_ids

  # ALB will automatically get public IPs in public subnets
  # Backend EC2 instances remain in private subnets with no public IPs

  tags = {
    Name = "web-application-lb"
  }
}
```

---

## Best Practices

### ✅ Recommended Architecture

```
Internet
    ↓
Application Load Balancer (public subnet, automatic public IP)
    ↓
EC2 Instances (private subnet, NO public IP)
    ↓
RDS Database (private subnet, NO public IP)
```

### ❌ Anti-Patterns

- **DON'T**: Enable `map_public_ip_on_launch = true`
- **DON'T**: Assign public IPs to database instances
- **DON'T**: Assign public IPs to application servers (use ALB instead)
- **DON'T**: Expose resources directly to the internet

### ✅ When Public IPs Are Acceptable

1. **Bastion/Jump Hosts**: Use Elastic IP with strict security groups
2. **NAT Gateways**: Managed service, receives public IP automatically
3. **Load Balancers**: ALB/NLB in public subnets for web traffic
4. **Temporary Dev/Test**: Use instance-level assignment, delete when done

---

## Security Groups

Always restrict access when using public IPs:

```hcl
# Good: Bastion host with IP whitelist
resource "aws_security_group" "bastion" {
  name        = "bastion-sg"
  description = "SSH access from specific IPs only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]  # Your office IP
    description = "SSH from office"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Bad: Open to the internet
resource "aws_security_group" "bad_example" {
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # ❌ Never do this!
  }
}
```

---

## Compliance References

- **CIS AWS Foundations Benchmark 5.1**: Ensure no security groups allow ingress from 0.0.0.0/0 to port 22
- **OWASP Cloud Security**: Minimize attack surface by limiting public exposure
- **AWS Well-Architected Framework**: Security Pillar - Infrastructure Protection
- **NIST SP 800-53 r5**: SC-7 (Boundary Protection)

---

## Migration Guide

If you have existing resources expecting auto-assigned public IPs:

1. **Identify affected resources**: Check EC2 instances in public subnets
2. **Choose appropriate method**: Elastic IP (persistent) or instance-level (temporary)
3. **Update Terraform**: Add explicit public IP assignment
4. **Test connectivity**: Verify resources are reachable after change
5. **Update security groups**: Ensure they allow required traffic

---

## Questions?

See `docs/06-security-and-risk/infrastructure-security.md` for infrastructure security guidelines.
