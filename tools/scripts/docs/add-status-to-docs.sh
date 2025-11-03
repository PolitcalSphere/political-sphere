#!/bin/bash
# Add document status field to all documentation files
# This script identifies documents and suggests appropriate status values

set -euo pipefail

DOCS_DIR="docs"
TEMP_FILE=$(mktemp)

echo "🔍 Scanning documentation files for status metadata..."
echo ""

# Function to check if file has metadata table
has_metadata_table() {
    local file="$1"
    grep -q "Classification.*Version.*Last Updated" "$file" 2>/dev/null || return 1
}

# Function to check if file already has Status column
has_status_column() {
    local file="$1"
    grep -q "Status" "$file" 2>/dev/null && grep -q "Draft\|Review\|Approved\|Published" "$file" 2>/dev/null || return 1
}

# Find all markdown files in docs directory
find "$DOCS_DIR" -type f -name "*.md" | sort > "$TEMP_FILE"

echo "📊 Document Status Report"
echo "========================="
echo ""

NEEDS_METADATA=0
NEEDS_STATUS=0
HAS_STATUS=0
TOTAL=0

while IFS= read -r file; do
    TOTAL=$((TOTAL + 1))
    
    if has_status_column "$file"; then
        HAS_STATUS=$((HAS_STATUS + 1))
        echo "✅ $file - Already has status"
    elif has_metadata_table "$file"; then
        NEEDS_STATUS=$((NEEDS_STATUS + 1))
        echo "⚠️  $file - Has metadata table, needs Status column"
    else
        NEEDS_METADATA=$((NEEDS_METADATA + 1))
        echo "❌ $file - Needs complete metadata table"
    fi
done < "$TEMP_FILE"

echo ""
echo "Summary:"
echo "--------"
echo "Total documents: $TOTAL"
echo "✅ Already have status: $HAS_STATUS"
echo "⚠️  Need status column: $NEEDS_STATUS"
echo "❌ Need complete metadata: $NEEDS_METADATA"

rm "$TEMP_FILE"

echo ""
echo "Status values to use:"
echo "  - Draft: Document being created or significantly incomplete"
echo "  - Review: Under peer review or awaiting feedback"
echo "  - Approved: Reviewed and approved, ready for use"
echo "  - Published: Live, official document in use"
echo "  - Archived: No longer active, kept for reference"
echo "  - Prospective: Future planning, not yet approved"
