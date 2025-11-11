#!/usr/bin/env bash
# ==============================================================================
# Cryptographic Algorithm Security Validator
# ==============================================================================
# Scans source code for usage of weak cryptographic algorithms (MD5, SHA-1)
# and ensures only secure alternatives (SHA-256+) are used.
#
# Exit codes:
#   0 - No weak crypto detected
#   1 - Weak crypto algorithms found
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo -e "${BLUE}🔐 Cryptographic Algorithm Security Validator${NC}"
echo "Repository: ${REPO_ROOT}"
echo ""

ISSUES_FOUND=0

# ==============================================================================
# Check 1: Detect MD5 usage
# ==============================================================================
echo -e "${BLUE}[1/4] Checking for MD5 usage...${NC}"

MD5_PATTERNS=(
  "createHash\(['\"]md5['\"]"
  "crypto\.md5"
  "hashlib\.md5"
  "Digest::MD5"
  "MessageDigest\.getInstance\(['\"]MD5['\"]"
)

for pattern in "${MD5_PATTERNS[@]}"; do
  if find "${REPO_ROOT}" -type f \
    \( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.cjs" \
    -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" \
    -o -name "*.rb" -o -name "*.go" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/.git/*" \
    ! -path "*/coverage/*" \
    -exec grep -l -E "${pattern}" {} + 2>/dev/null; then
    
    echo -e "${RED}❌ MD5 usage detected!${NC}"
    echo -e "${YELLOW}Files with MD5:${NC}"
    find "${REPO_ROOT}" -type f \
      \( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.cjs" \
      -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" \
      -o -name "*.rb" -o -name "*.go" \) \
      ! -path "*/node_modules/*" \
      ! -path "*/dist/*" \
      ! -path "*/build/*" \
      ! -path "*/.git/*" \
      ! -path "*/coverage/*" \
      -exec grep -n -H -E "${pattern}" {} + 2>/dev/null | head -20
    
    ((ISSUES_FOUND++))
    break
  fi
done

if [[ $ISSUES_FOUND -eq 0 ]]; then
  echo -e "${GREEN}✅ No MD5 usage found${NC}"
fi

# ==============================================================================
# Check 2: Detect SHA-1 usage
# ==============================================================================
echo ""
echo -e "${BLUE}[2/4] Checking for SHA-1 usage...${NC}"

SHA1_PATTERNS=(
  "createHash\(['\"]sha1['\"]"
  "crypto\.sha1"
  "hashlib\.sha1"
  "Digest::SHA1"
  "MessageDigest\.getInstance\(['\"]SHA-1['\"]"
  "MessageDigest\.getInstance\(['\"]SHA1['\"]"
)

SHA1_FOUND=0
for pattern in "${SHA1_PATTERNS[@]}"; do
  if find "${REPO_ROOT}" -type f \
    \( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.cjs" \
    -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" \
    -o -name "*.rb" -o -name "*.go" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/.git/*" \
    ! -path "*/coverage/*" \
    -exec grep -l -E "${pattern}" {} + 2>/dev/null; then
    
    echo -e "${RED}❌ SHA-1 usage detected!${NC}"
    echo -e "${YELLOW}Files with SHA-1:${NC}"
    find "${REPO_ROOT}" -type f \
      \( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.cjs" \
      -o -name "*.jsx" -o -name "*.tsx" -o -name "*.py" -o -name "*.java" \
      -o -name "*.rb" -o -name "*.go" \) \
      ! -path "*/node_modules/*" \
      ! -path "*/dist/*" \
      ! -path "*/build/*" \
      ! -path "*/.git/*" \
      ! -path "*/coverage/*" \
      -exec grep -n -H -E "${pattern}" {} + 2>/dev/null | head -20
    
    ((ISSUES_FOUND++))
    SHA1_FOUND=1
    break
  fi
done

if [[ $SHA1_FOUND -eq 0 ]]; then
  echo -e "${GREEN}✅ No SHA-1 usage found${NC}"
fi

# ==============================================================================
# Check 3: Verify secure alternatives are being used
# ==============================================================================
echo ""
echo -e "${BLUE}[3/4] Verifying secure hash usage...${NC}"

SECURE_HASHES_FOUND=0
if find "${REPO_ROOT}" -type f \
  \( -name "*.js" -o -name "*.ts" -o -name "*.mjs" -o -name "*.cjs" \
  -o -name "*.jsx" -o -name "*.tsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/dist/*" \
  ! -path "*/build/*" \
  ! -path "*/.git/*" \
  ! -path "*/coverage/*" \
  -exec grep -l -E "createHash\(['\"]sha(256|384|512|3-[0-9]+)['\"]" {} + 2>/dev/null; then
  
  echo -e "${GREEN}✅ Secure hash algorithms detected (SHA-256+)${NC}"
  SECURE_HASHES_FOUND=1
fi

if [[ $SECURE_HASHES_FOUND -eq 0 ]]; then
  echo -e "${YELLOW}⚠️  No cryptographic hash usage detected${NC}"
fi

# ==============================================================================
# Check 4: Check for deprecated crypto libraries
# ==============================================================================
echo ""
echo -e "${BLUE}[4/4] Checking for deprecated crypto libraries...${NC}"

DEPRECATED_LIBS=(
  "crypto-js"      # Often misused with weak algorithms
  "md5"            # MD5-only library
  "sha1"           # SHA-1-only library
)

DEPRECATED_FOUND=0
for lib in "${DEPRECATED_LIBS[@]}"; do
  if [[ -f "${REPO_ROOT}/package.json" ]]; then
    if grep -q "\"${lib}\"" "${REPO_ROOT}/package.json" 2>/dev/null; then
      echo -e "${YELLOW}⚠️  Potentially deprecated crypto library found: ${lib}${NC}"
      echo "   Consider using Node.js built-in 'crypto' module with SHA-256+"
      DEPRECATED_FOUND=1
    fi
  fi
done

if [[ $DEPRECATED_FOUND -eq 0 ]]; then
  echo -e "${GREEN}✅ No deprecated crypto libraries found${NC}"
fi

# ==============================================================================
# Summary and recommendations
# ==============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

if [[ $ISSUES_FOUND -eq 0 ]]; then
  echo -e "${GREEN}✅ All cryptographic algorithm checks passed!${NC}"
  echo ""
  echo "Best practices:"
  echo "  • Use SHA-256 or higher (SHA-384, SHA-512, SHA-3)"
  echo "  • Avoid MD5 and SHA-1 (known collision vulnerabilities)"
  echo "  • Use bcrypt/argon2 for password hashing"
  echo "  • Use crypto.randomBytes() for random generation"
  exit 0
else
  echo -e "${RED}❌ Found ${ISSUES_FOUND} cryptographic security issue(s)${NC}"
  echo ""
  echo -e "${YELLOW}Required actions:${NC}"
  echo "  1. Replace MD5 with SHA-256 or higher"
  echo "  2. Replace SHA-1 with SHA-256 or higher"
  echo "  3. For passwords, use bcrypt or argon2"
  echo "  4. For checksums, use SHA-256 minimum"
  echo ""
  echo -e "${YELLOW}Secure alternatives:${NC}"
  echo "  • Node.js: crypto.createHash('sha256')"
  echo "  • Python: hashlib.sha256()"
  echo "  • Java: MessageDigest.getInstance('SHA-256')"
  echo ""
  echo "See: https://owasp.org/www-project-web-security-testing-guide/stable/4-Web_Application_Security_Testing/09-Testing_for_Weak_Cryptography/04-Testing_for_Weak_Encryption"
  exit 1
fi
