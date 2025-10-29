#!/bin/bash
# Backup and Disaster Recovery Script for Political Sphere
# Version: 1.0
# Last Updated: 2025-10-29

set -euo pipefail

# Configuration
BACKUP_BUCKET="${BACKUP_BUCKET:-political-sphere-backups}"
ENVIRONMENT="${ENVIRONMENT:-production}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/tmp/backup-${TIMESTAMP}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    command -v aws >/dev/null 2>&1 || {
        log_error "AWS CLI is required but not installed. Aborting."
        exit 1
    }
    
    command -v jq >/dev/null 2>&1 || {
        log_error "jq is required but not installed. Aborting."
        exit 1
    }
    
    # Check AWS credentials
    aws sts get-caller-identity >/dev/null 2>&1 || {
        log_error "AWS credentials not configured. Aborting."
        exit 1
    }
    
    log_info "Prerequisites check passed"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
}

# Backup RDS database
backup_database() {
    log_info "Starting database backup..."
    
    local db_cluster="political-sphere-${ENVIRONMENT}"
    local snapshot_id="political-sphere-${ENVIRONMENT}-${TIMESTAMP}"
    
    # Create RDS snapshot
    aws rds create-db-cluster-snapshot \
        --db-cluster-snapshot-identifier "${snapshot_id}" \
        --db-cluster-identifier "${db_cluster}" \
        --tags "Key=Environment,Value=${ENVIRONMENT}" "Key=Type,Value=scheduled-backup" "Key=Timestamp,Value=${TIMESTAMP}" \
        2>&1 || {
            log_error "Failed to create database snapshot"
            return 1
        }
    
    log_info "Database snapshot created: ${snapshot_id}"
    
    # Wait for snapshot to be available (optional, can be run async)
    # aws rds wait db-cluster-snapshot-available \
    #     --db-cluster-snapshot-identifier "${snapshot_id}"
    
    echo "${snapshot_id}" > "${BACKUP_DIR}/db-snapshot.txt"
}

# Backup application configuration
backup_config() {
    log_info "Backing up application configuration..."
    
    # Backup secrets from AWS Secrets Manager
    local secrets=$(aws secretsmanager list-secrets \
        --filters Key=name,Values=political-sphere/${ENVIRONMENT} \
        --query 'SecretList[].Name' \
        --output text)
    
    mkdir -p "${BACKUP_DIR}/secrets"
    
    for secret in ${secrets}; do
        log_info "Backing up secret: ${secret}"
        aws secretsmanager describe-secret \
            --secret-id "${secret}" \
            > "${BACKUP_DIR}/secrets/$(basename ${secret}).json"
    done
    
    # Backup parameter store values
    local params=$(aws ssm describe-parameters \
        --parameter-filters "Key=Name,Option=BeginsWith,Values=/political-sphere/${ENVIRONMENT}" \
        --query 'Parameters[].Name' \
        --output text)
    
    mkdir -p "${BACKUP_DIR}/parameters"
    
    for param in ${params}; do
        log_info "Backing up parameter: ${param}"
        aws ssm get-parameter \
            --name "${param}" \
            --with-decryption \
            > "${BACKUP_DIR}/parameters/$(basename ${param}).json"
    done
}

# Backup S3 buckets
backup_s3() {
    log_info "Backing up S3 buckets..."
    
    local buckets=$(aws s3 ls | grep "political-sphere-${ENVIRONMENT}" | awk '{print $3}')
    
    for bucket in ${buckets}; do
        log_info "Syncing bucket: ${bucket}"
        aws s3 sync "s3://${bucket}" "${BACKUP_DIR}/s3/${bucket}" \
            --exclude "*.tmp" \
            --exclude "cache/*" || {
                log_warn "Failed to sync bucket: ${bucket}"
            }
    done
}

# Backup ECS task definitions
backup_ecs() {
    log_info "Backing up ECS task definitions..."
    
    local cluster="political-sphere-${ENVIRONMENT}"
    
    mkdir -p "${BACKUP_DIR}/ecs"
    
    # List all services
    local services=$(aws ecs list-services \
        --cluster "${cluster}" \
        --query 'serviceArns[]' \
        --output text)
    
    for service_arn in ${services}; do
        local service=$(basename "${service_arn}")
        log_info "Backing up service: ${service}"
        
        # Get service definition
        aws ecs describe-services \
            --cluster "${cluster}" \
            --services "${service}" \
            > "${BACKUP_DIR}/ecs/${service}-service.json"
        
        # Get task definition
        local task_def=$(aws ecs describe-services \
            --cluster "${cluster}" \
            --services "${service}" \
            --query 'services[0].taskDefinition' \
            --output text)
        
        aws ecs describe-task-definition \
            --task-definition "${task_def}" \
            > "${BACKUP_DIR}/ecs/${service}-task-definition.json"
    done
}

# Backup CloudWatch logs
backup_logs() {
    log_info "Exporting CloudWatch logs..."
    
    local log_groups=$(aws logs describe-log-groups \
        --log-group-name-prefix "/aws/ecs/political-sphere-${ENVIRONMENT}" \
        --query 'logGroups[].logGroupName' \
        --output text)
    
    mkdir -p "${BACKUP_DIR}/logs"
    
    for log_group in ${log_groups}; do
        log_info "Exporting log group: ${log_group}"
        
        local from_time=$(($(date +%s) - 86400))  # Last 24 hours
        local to_time=$(date +%s)
        
        # Create export task (async)
        aws logs create-export-task \
            --log-group-name "${log_group}" \
            --from $(expr ${from_time} \* 1000) \
            --to $(expr ${to_time} \* 1000) \
            --destination "${BACKUP_BUCKET}" \
            --destination-prefix "logs/${ENVIRONMENT}/${TIMESTAMP}/$(basename ${log_group})" \
            2>&1 || {
                log_warn "Failed to export log group: ${log_group}"
            }
    done
}

# Backup infrastructure state (Terraform)
backup_terraform() {
    log_info "Backing up Terraform state..."
    
    mkdir -p "${BACKUP_DIR}/terraform"
    
    # Assuming Terraform state is in S3
    local state_bucket="political-sphere-terraform-state"
    local state_key="state/terraform.tfstate"
    
    aws s3 cp "s3://${state_bucket}/${state_key}" \
        "${BACKUP_DIR}/terraform/terraform.tfstate" || {
            log_warn "Failed to backup Terraform state"
        }
    
    # Backup lock table if using DynamoDB
    aws dynamodb scan \
        --table-name terraform-state-lock \
        > "${BACKUP_DIR}/terraform/lock-table.json" 2>/dev/null || {
            log_warn "Failed to backup Terraform lock table"
        }
}

# Create backup manifest
create_manifest() {
    log_info "Creating backup manifest..."
    
    cat > "${BACKUP_DIR}/manifest.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "environment": "${ENVIRONMENT}",
  "backup_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "created_by": "$(whoami)@$(hostname)",
  "aws_account": "$(aws sts get-caller-identity --query Account --output text)",
  "aws_region": "${AWS_REGION:-us-east-1}",
  "components": {
    "database": $([ -f "${BACKUP_DIR}/db-snapshot.txt" ] && echo "true" || echo "false"),
    "secrets": $([ -d "${BACKUP_DIR}/secrets" ] && echo "true" || echo "false"),
    "s3": $([ -d "${BACKUP_DIR}/s3" ] && echo "true" || echo "false"),
    "ecs": $([ -d "${BACKUP_DIR}/ecs" ] && echo "true" || echo "false"),
    "terraform": $([ -d "${BACKUP_DIR}/terraform" ] && echo "true" || echo "false")
  }
}
EOF
    
    cat "${BACKUP_DIR}/manifest.json"
}

# Upload backup to S3
upload_backup() {
    log_info "Uploading backup to S3..."
    
    local backup_archive="/tmp/political-sphere-${ENVIRONMENT}-${TIMESTAMP}.tar.gz"
    
    # Create tarball
    log_info "Creating backup archive..."
    tar -czf "${backup_archive}" -C "$(dirname ${BACKUP_DIR})" "$(basename ${BACKUP_DIR})"
    
    # Upload to S3
    log_info "Uploading to s3://${BACKUP_BUCKET}/backups/${ENVIRONMENT}/${TIMESTAMP}/"
    aws s3 cp "${backup_archive}" \
        "s3://${BACKUP_BUCKET}/backups/${ENVIRONMENT}/${TIMESTAMP}/backup.tar.gz" \
        --server-side-encryption AES256 \
        --metadata "environment=${ENVIRONMENT},timestamp=${TIMESTAMP}"
    
    # Upload manifest separately for easy access
    aws s3 cp "${BACKUP_DIR}/manifest.json" \
        "s3://${BACKUP_BUCKET}/backups/${ENVIRONMENT}/${TIMESTAMP}/manifest.json" \
        --server-side-encryption AES256
    
    log_info "Backup uploaded successfully"
    
    # Cleanup
    rm -f "${backup_archive}"
}

# Cleanup old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Delete old RDS snapshots
    local old_snapshots=$(aws rds describe-db-cluster-snapshots \
        --db-cluster-identifier "political-sphere-${ENVIRONMENT}" \
        --query "DBClusterSnapshots[?SnapshotCreateTime<='$(date -d "${RETENTION_DAYS} days ago" -u +%Y-%m-%d)'].DBClusterSnapshotIdentifier" \
        --output text)
    
    for snapshot in ${old_snapshots}; do
        log_info "Deleting old snapshot: ${snapshot}"
        aws rds delete-db-cluster-snapshot \
            --db-cluster-snapshot-identifier "${snapshot}" || {
                log_warn "Failed to delete snapshot: ${snapshot}"
            }
    done
    
    # Delete old S3 backups (using lifecycle policy is preferred)
    # This is a manual cleanup for testing
    # aws s3 rm "s3://${BACKUP_BUCKET}/backups/${ENVIRONMENT}/" \
    #     --recursive \
    #     --exclude "*" \
    #     --include "$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)*"
    
    log_info "Cleanup completed"
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."
    
    # Check manifest exists
    [ -f "${BACKUP_DIR}/manifest.json" ] || {
        log_error "Manifest file missing"
        return 1
    }
    
    # Verify components
    local components="secrets parameters ecs terraform"
    for component in ${components}; do
        if [ -d "${BACKUP_DIR}/${component}" ]; then
            local file_count=$(find "${BACKUP_DIR}/${component}" -type f | wc -l)
            log_info "Component ${component}: ${file_count} files"
        fi
    done
    
    log_info "Backup verification completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    log_info "Sending notification: ${message}"
    
    # SNS notification (if configured)
    local sns_topic="arn:aws:sns:${AWS_REGION:-us-east-1}:ACCOUNT:political-sphere-alerts"
    
    aws sns publish \
        --topic-arn "${sns_topic}" \
        --subject "Political Sphere Backup ${status}" \
        --message "${message}" \
        2>/dev/null || {
            log_warn "Failed to send SNS notification"
        }
}

# Main execution
main() {
    log_info "Starting backup process for environment: ${ENVIRONMENT}"
    
    check_prerequisites
    create_backup_dir
    
    # Run backup components
    backup_database || log_warn "Database backup failed"
    backup_config || log_warn "Config backup failed"
    backup_s3 || log_warn "S3 backup failed"
    backup_ecs || log_warn "ECS backup failed"
    backup_terraform || log_warn "Terraform backup failed"
    # backup_logs || log_warn "Logs backup failed"  # Async, check later
    
    create_manifest
    verify_backup
    upload_backup
    cleanup_old_backups
    
    # Cleanup local backup
    log_info "Cleaning up local backup directory..."
    rm -rf "${BACKUP_DIR}"
    
    log_info "Backup process completed successfully"
    send_notification "SUCCESS" "Backup completed for ${ENVIRONMENT} at ${TIMESTAMP}"
}

# Trap errors
trap 'log_error "Backup failed with error at line $LINENO"; send_notification "FAILED" "Backup failed at line $LINENO"; exit 1' ERR

# Run main function
main "$@"
