#!/bin/bash
# Fix ESM imports in the shared library dist folder by adding .js extensions

cd "$(dirname "$0")/../libs/shared/dist/src" || exit 1

echo "Fixing ESM imports in shared library..."

# Function to add .js extension to relative imports
fix_imports() {
  local file="$1"
  # Add .js to imports like './file' or './path/file' but not './file.js' or './path/'
  sed -i '' -E "s/(from ['\"])(\.\/.*)(['\"])/\1\2.js\3/g; s/\.js\.js/.js/g" "$file"
  echo "Fixed: $file"
}

# Fix all .js files
find . -name "*.js" -type f | while read -r file; do
  fix_imports "$file"
done

echo "Done fixing imports!"
