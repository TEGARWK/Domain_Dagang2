# ============================================================
#  Git History Cleanup Script
#  Removes sensitive files from git history
#
#  WARNING: This script rewrites git history!
#  Make sure to backup your repository before running.
#
#  Usage:
#  1. Backup your repository
#  2. Run: bash scripts/git-cleanup.sh
#  3. Force push: git push origin --force --all
# ============================================================

#!/bin/bash

echo "=========================================="
echo "  Git History Cleanup Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Files and patterns to remove from git history
SENSITIVE_FILES=(
    ".env"
    ".env.local"
    ".env.production"
    ".env.*.local"
    "backend/.env"
    "backend/.env.*"
    "backend/db_queries.log"
    "backend/emergency_error.log"
    "backend/all_regions.sql"
    "backend/uploads/*"
    "node_modules/"
    "dist/"
    "*.log"
    ".DS_Store"
)

echo -e "${YELLOW}Files/Patterns to be removed from git history:${NC}"
for item in "${SENSITIVE_FILES[@]}"; do
    echo "  - $item"
done
echo ""

# Check if running in git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}ERROR: Not a git repository!${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating backup branch...${NC}"
git branch "backup-pre-git-cleanup-$(date +%Y%m%d%H%M%S)"

echo ""
echo -e "${YELLOW}Removing sensitive files from git history...${NC}"

# Method 1: Using git filter-branch (slower but more compatible)
echo ""
echo "Using git filter-branch to rewrite history..."

for pattern in "${SENSITIVE_FILES[@]}"; do
    echo "  Processing: $pattern"

    # Handle directory patterns
    if [[ "$pattern" == */ ]]; then
        git filter-branch --force --index-filter \
            "git rm --cached --ignore-unmatch -r '$pattern'" \
            --prune-empty --tag-name-filter cat -- --all 2>/dev/null
    else
        git filter-branch --force --index-filter \
            "git rm --cached --ignore-unmatch '$pattern'" \
            --prune-empty --tag-name-filter cat -- --all 2>/dev/null
    fi

    if [ $? -eq 0 ]; then
        echo -e "    ${GREEN}✓ Removed: $pattern${NC}"
    else
        echo -e "    ${YELLOW}⚠ Skipped or not found: $pattern${NC}"
    fi
done

echo ""
echo -e "${YELLOW}Cleaning up old refs and garbage...${NC}"
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Cleanup Complete!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Review changes: git log --oneline -10"
echo "2. Test that the repository works correctly"
echo "3. Force push: git push origin --force --all"
echo "4. Update all team members to re-clone the repository"
echo ""
echo -e "${RED}WARNING: If you've already pushed to a public repo,${NC}"
echo -e "${RED}you should also rotate all exposed secrets!${NC}"
echo ""
