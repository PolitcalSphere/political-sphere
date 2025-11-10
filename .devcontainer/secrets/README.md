# Development Secrets

This directory contains development secrets for the devcontainer environment.

## Setup Instructions

1. **Create actual secret files** (these are gitignored):
   ```bash
   # From repository root
   cd .devcontainer/secrets
   
   # Copy example and set your password
   cp postgres_password.txt.example postgres_password.txt
   echo "your_dev_password_here" > postgres_password.txt
   ```

2. **Security Notes**:
   - ✅ `.example` files are committed to git
   - ❌ Actual secret files are gitignored
   - ⚠️ **Never commit actual passwords**
   - 🔒 Use strong passwords even for local development

## Available Secrets

### `postgres_password.txt`
PostgreSQL database password for local development.

**Default**: `dev123` (from example)
**Recommendation**: Change to a unique password for your local environment

## Troubleshooting

**Error: "secret not found"**
- Ensure you've created `postgres_password.txt` from the example
- Check file location: `.devcontainer/secrets/postgres_password.txt`

**Error: "permission denied"**
- Ensure proper file permissions: `chmod 600 postgres_password.txt`

## Adding New Secrets

1. Create `.example` file with placeholder value
2. Add actual secret filename to `.gitignore`
3. Reference in `docker-compose.yml`:
   ```yaml
   secrets:
     my_secret:
       file: ./secrets/my_secret.txt
   ```
4. Update this README with instructions
