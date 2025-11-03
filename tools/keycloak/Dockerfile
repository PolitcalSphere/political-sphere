# Dev Keycloak image: adds curl for reliable healthchecks in local development
# Based on Keycloak official image. This image is for development only.
FROM quay.io/keycloak/keycloak:23.0

# Install a minimal HTTP client (curl). Different base images may provide
# different package managers; detect and use the available one.
USER root
RUN /bin/sh -c '\
  if command -v microdnf >/dev/null 2>&1; then \
    microdnf install -y curl && microdnf clean all; \
  elif command -v yum >/dev/null 2>&1; then \
    yum install -y curl && yum clean all; \
  elif command -v apt-get >/dev/null 2>&1; then \
    apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*; \
  else \
    echo "No supported package manager found; curl may not be installed"; \
  fi'

# Ensure permissions match the upstream image defaults
USER 1000

# Note: keep entrypoint / CMD from base image. This Dockerfile is intended
# only to add curl for dev healthchecks and should not be used in production.
