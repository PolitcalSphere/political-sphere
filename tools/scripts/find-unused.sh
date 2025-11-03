#!/bin/bash
# Find potentially unused files in the codebase
# Usage: ./scripts/find-unused.sh

echo "Finding potentially unused files..."

# Find TypeScript/JavaScript files
find . -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" | grep -v node_modules | grep -v dist | while read file; do
  # Skip test files, config files, and index files
  if [[ $file == *test* ]] || [[ $file == *config* ]] || [[ $file == *index* ]] || [[ $file == *.d.ts ]]; then
    continue
  fi

  # Check if file is imported/referenced anywhere
  filename=$(basename "$file" | sed 's/\.[^.]*$//')
  if ! grep -r "$filename" . --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" | grep -v "$file" | grep -v node_modules | grep -v dist >/dev/null; then
    echo "Potentially unused: $file"
  fi
done

echo "Done."
