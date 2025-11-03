#!/bin/bash

# File organization, naming convention check, and dead code cleanup script for Political Sphere

set -euo pipefail

# Configuration
PROJECT_DIR="${PROJECT_DIR:-$(pwd)}"  # Default to current directory if not set
DEAD_CODE_DIRS=("libs" "apps")  # Directories to check for dead code
NAMING_CONVENTION_PATTERN="^[a-z0-9-]+$"  # Naming convention: lowercase, hyphens only (no spaces, underscores, uppercase)
LOG_FILE="${PROJECT_DIR}/cleanup_log.txt"

# Function to check naming conventions
check_naming_conventions() {
    echo "Checking naming conventions..." | tee -a "$LOG_FILE"
    find "$PROJECT_DIR" -type f -name "*.*" | while read -r file; do
        filename=$(basename "$file")
        if [[ ! "$filename" =~ $NAMING_CONVENTION_PATTERN ]]; then
            echo "Invalid naming convention: $filename" | tee -a "$LOG_FILE"
        fi
    done
}

# Function to find and remove dead code (TypeScript files without exports)
remove_dead_code() {
    echo "Removing dead code..." | tee -a "$LOG_FILE"
    for dir in "${DEAD_CODE_DIRS[@]}"; do
        if [[ -d "$PROJECT_DIR/$dir" ]]; then
            find "$PROJECT_DIR/$dir" -type f -name "*.ts" -exec grep -L "export" {} \; | while read -r file; do
                echo "Removing dead code file: $file" | tee -a "$LOG_FILE"
                rm -f "$file"
            done
        fi
    done
}

# Function to organize files (rename by replacing spaces with hyphens, consistent with naming convention)
organize_files() {
    echo "Organizing files (renaming to replace spaces with hyphens)..." | tee -a "$LOG_FILE"
    find "$PROJECT_DIR" -type f | while read -r file; do
        dirname=$(dirname "$file")
        basename=$(basename "$file")
        new_basename="${basename// /-}"  # Replace spaces with hyphens
        if [[ "$basename" != "$new_basename" ]]; then
            new_file="$dirname/$new_basename"
            echo "Renaming: $file -> $new_file" | tee -a "$LOG_FILE"
            mv "$file" "$new_file"
        fi
    done
}

# Execute all tasks
check_naming_conventions
remove_dead_code
organize_files

echo "Cleanup completed at $(date)" | tee -a "$LOG_FILE"
