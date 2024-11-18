# Key-Value

# Base
Base functions of the KV
- kv:get()
- kv:set()
- kv:del()

# Extensions
- Batch
  - kv:batchInit()
    - b:set(), b:execute()
- Normalized keys
- Lists
  - sorted
- Encoded values
  - encoding binary data for value
  - encoding json for value


# Installation
1. Make sure you have APM
   `load-blueprint apm`
2. Use APM to install
   `APM.install("@permaweb/kv-base")`

# Usage
1. Require
   `KV = require("@permaweb/kv-base")`
2. Instantiate
    ```
    local status, result = pcall(KV.new, plugins)

    local store = result
    ```
3. Set
    ```
   local nameKey = "FancyName"
   store:set(nameKey, "BobbaBouey")
   ```
4. Get
    ```
   local response = store:get(nameKey)
   ```

# Plugins
```
  KV = require("@permaweb/kv-base")
  plugin = require("someKvPlugin")
  local status, result = pcall(KV.new, { plugin })
```


# Development

## Luarocks
`sudo apt install luarocks`
`luarocks install busted --local`
`export PATH=$PATH:$HOME/.luarocks/bin`
## Testing
`cd kv/base; busted`

## Build
`cd kv/base; ./build.sh`
`cd kv/batchplugin; ./build.sh`

## Plugins
Plugins should have a register function
```
    function plugin.register(kv)
        kv:registerPlugin("aPluginFunction", function()
            return plugin.createBatch(kv)
        end)
        -- more
    end
```
Instantiate `myKV` and use `myKV:aPluginFunction()`

# APM Publish

1. Run build script in selected subfolder
   `./build/sh`
2. Publish `main.lua` from `dist/`

# Asset manager

# Asset Manager Lua Package

The **Asset Manager** Lua package (`@permaweb/asset-manager`) provides a utility for managing digital assets, including adding, removing, and updating asset quantities. It uses the `bint` library for handling large integer arithmetic and includes utilities for validating asset data and maintaining asset balances.

## Features

- **Asset Management**:
  - Add or remove assets.
  - Maintain and update asset quantities with timestamps.

## Usage

### 1. **Initialization**
Create a new instance of the `AssetManager`:

```lua
local AssetManager = require('@permaweb/asset-manager')

local manager = AssetManager.new()
```

### 2. **API Functions**

#### `AssetManager:get()`
Returns a JSON-encoded string of the current list of assets.

```lua
local assets = manager:get()
print(assets) -- Outputs JSON string
```

#### `AssetManager:update(args)`
Updates an asset's balance. This function handles both `Add` and `Remove` operations.

- **Arguments**:
  - `Type` (string): The type of update (`"Add"` or `"Remove"`).
  - `AssetId` (string): The ID of the asset to update.
  - `Timestamp` (number): The timestamp of the update.

```lua
manager:update({
    Type = 'Add',
    AssetId = 'valid-asset-id-12345678901234567890123456789012345678901',
    Timestamp = os.time()
})
```

### 3. **Handlers**

#### `Handlers.add('Add-Upload', ...)`
Registers a handler to process `Add-Upload` events, automatically updating the asset manager.

```lua
Handlers.add('Add-Upload', 'Add-Upload', function(msg)
    manager:update({
        Type = 'Add',
        AssetId = msg.AssetId,
        Timestamp = msg.Timestamp
    })
end)
```

## Example

```lua
local manager = AssetManager.new()

-- Add an asset
manager:update({
    Type = 'Add',
    AssetId = 'valid-asset-id-12345678901234567890123456789012345678901',
    Timestamp = os.time()
})

-- Get the current list of assets
print(manager:get())
```