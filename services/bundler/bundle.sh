#!/bin/bash

set -e

# Define the target file
TARGET_FILE="./dist/bundle.lua"

# Create the target directory if it doesn't exist
mkdir -p "dist"

# Clear the target file if it exists
if [ -f "$TARGET_FILE" ]; then
  rm "$TARGET_FILE"
fi

# Array of files to bundle
FILES=(
    "./external-libs/apm_client.lua"
    "./external-libs/subscribable.lua"
    "../../packages/kv/base/src/kv.lua"
    "../../packages/kv/batchplugin/src/batch.lua"
    "../../packages/asset-manager/asset-manager.lua"
    "../src/zones/zone.lua"
)

# Array of corresponding package names
PACKAGE_NAMES=(
    ""
    ""
    "@permaweb/kv-base"
    "@permaweb/kv-batch"
    "@permaweb/asset-manager"
    "@permaweb/zone"
)

# Function to print headers
print_header() {
    HEADER="$1"
    WIDTH=80
    BORDER=$(printf '%*s' "$WIDTH" '' | tr ' ' '=')

    echo ""
    echo ""
    echo "-- $BORDER"
    echo "-- $BORDER"
    echo "-- $HEADER"
    echo "-- $BORDER"
    echo "-- $BORDER"
}

# Function to indent lines
indent_lines() {
    while IFS= read -r line; do
        echo "    $line"
    done
}

# Append each file's content to the target file
for i in "${!FILES[@]}"; do
    echo "Processing file: ${FILES[$i]}"

    FILE="${FILES[$i]}"
    PACKAGE_NAME="${PACKAGE_NAMES[$i]}"

    if [[ "$FILE" == *"apm"* ]] || [[ "$FILE" == *"trusted"* ]] || [[ "$FILE" == *"subscribable"* ]]; then
        cat "$FILE" >> "$TARGET_FILE"
        echo "" >> "$TARGET_FILE"
        echo " -- ENDFILE " >> "$TARGET_FILE"
        echo "" >> "$TARGET_FILE"   # Add a newline for separation

        continue
    fi

    if [ -f "$FILE" ]; then
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
        echo "" >> "$TARGET_FILE"  # Add a newline for separation
    else
        echo "File '$FILE' does not exist."
    fi
done

echo "Bundling complete. Output written to $TARGET_FILE."
