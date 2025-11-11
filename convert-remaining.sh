#!/bin/bash
# This script will help identify which files still need conversion
echo "Files that need TypeScript conversion:"
find src -name "*.jsx" -o -name "*.js" | grep -v node_modules | sort
