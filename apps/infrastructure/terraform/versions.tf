terraform {
  # Require a specific range of Terraform versions to ensure reproducible behavior
  # Use tfenv /.terraform-version to pin local developers and CI to the same version.
  required_version = ">= 1.6.7, < 2.0.0"

  # Providers are left unpinned here; pin providers in a dedicated release if
  # you need strict reproducibility. CI uses HashiCorp's setup-terraform to
  # provide a matching version.
}
