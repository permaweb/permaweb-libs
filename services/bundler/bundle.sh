#!/bin/bash

set -e

# Define the target file
TARGET_FILE="./dist/bundle_zone.lua"

# Create the target directory if it doesn't exist
mkdir -p "dist"

# Clear the target file if it exists
if [ -f "$TARGET_FILE" ]; then
  rm "$TARGET_FILE"
fi

# Array of files to bundle
FILES=(
    "../src/package_kv.lua"
    "../src/package_kv_batch.lua"
    "../src/package_asset_manager.lua"
    "../src/process_zone.lua"
)

# Array of corresponding package names, must match length of FILES
PACKAGE_NAMES=(
    "@permaweb/kv-base"
    "@permaweb/kv-batch"
    "@permaweb/asset-manager"
    "@permaweb/zone"
)

print_header() {
    HEADER="$1"
    echo "-- $HEADER"
}

# Function to indent lines, skipping empty lines
indent_lines() {
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            echo "    $line"
        else
            echo ""
        fi
    done
}

# Add dependencies
echo "local json = require('json')" >> "$TARGET_FILE"

# Append each file's content to the target file
for i in "${!FILES[@]}"; do
    echo "Processing file: ${FILES[$i]}"

    FILE="${FILES[$i]}"
    PACKAGE_NAME="${PACKAGE_NAMES[$i]}"

    if [ -f "$FILE" ]; then
        echo "" >> "$TARGET_FILE"   # Add a newline for separation
        
        FILE_NAME=$(basename "$FILE" .lua)
        FUNCTION_NAME="load_${FILE_NAME//-/_}"

        # Add header to target file if a package name is provided
        if [ -n "$PACKAGE_NAME" ]; then
            print_header "$PACKAGE_NAME" >> "$TARGET_FILE"
        fi

        echo "local function $FUNCTION_NAME()" >> "$TARGET_FILE"
        indent_lines < "$FILE" >> "$TARGET_FILE"
        echo "end" >> "$TARGET_FILE"
        echo "package.loaded['$PACKAGE_NAME'] = $FUNCTION_NAME()" >> "$TARGET_FILE"
    else
        echo "File '$FILE' does not exist."
    fi
done

echo "Bundling complete. Output written to $TARGET_FILE."
