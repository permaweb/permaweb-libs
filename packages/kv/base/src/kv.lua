local KVPackageName = "@permaweb/kv-base"
local KV = {}

KV.__index = KV

function KV.new(plugins)
    if type(plugins) ~= "table" and type(plugins) ~= "nil" then
        print("invalid plugins")
        error("Invalid plugins arg, must be table or nil")
    end

    local self = setmetatable({}, KV)

    if plugins and type(plugins) == "table" then
        for _, plugin in ipairs(plugins) do
            if type(plugin) == "table" and plugin.register then
                plugin.register(self)
            end
        end
    end
    self.store = {}
    return self
end

function KV:dump()
    local copy = {}
    for k, v in pairs(self.store) do
        copy[k] = v
    end
    return copy
end

function KV:get(keyString)
    local keys = self:_splitKeyString(keyString)
    local current = self.store

    for _, key in ipairs(keys) do
        if type(current) ~= "table" or current[key] == nil then
            return nil
        end
        current = current[key]
    end

    return current
end

function KV:set(keyString, value)
    local keys = self:_splitKeyString(keyString)
    local current = self.store

    for i = 1, #keys - 1 do
        local key = keys[i]
        if type(current[key]) ~= "table" then
            current[key] = {}  -- Create table if it doesn't exist
        end
        current = current[key]
    end

    current[keys[#keys]] = value
end

function KV:append(keyString, value)
    local array = self:get(keyString)
    if type(array) ~= "table" then
        array = {}
        self:set(keyString, array)
    end

    table.insert(array, value)
end

function KV:_splitKeyString(keyString)
    local keys = {}
    for key in string.gmatch(keyString, "[^%.]+") do
        table.insert(keys, key)
    end
    return keys
end

function KV:append(keyString, value)
    self.store[keyString] = self.store[keyString] or {}
    table.insert(self.store[keyString], value)
end

function KV:remove(keyString)
    local keys = self:_splitKeyString(keyString)
    local current = self.store

    -- Traverse to the second to last key
    for i = 1, #keys - 1 do
        local key = keys[i]
        if type(current) ~= "table" or current[key] == nil then
            return -- Key path doesn't exist, nothing to remove
        end
        current = current[key]
    end

    -- Remove the final key in the path
    current[keys[#keys]] = nil
end

function KV:len()
    local count = 0
    for _ in pairs(self.store) do
        count = count + 1
    end
    return count
end

function KV:keys(path)
    -- Helper function to recursively gather keys from a table
    local function recurse(store)
        local keys = {}
        for k, _ in pairs(store) do
            table.insert(keys, k)
        end
        return keys
    end

    -- If a path is specified, traverse to that nested level
    if path and type(path) == "string" then
        local keys = self:_splitKeyString(path)
        local current = self.store

        -- Traverse the store according to the keys in the path
        for _, key in ipairs(keys) do
            if type(current) == "table" and current[key] then
                current = current[key]
            else
                return {}  -- If the path does not exist, return an empty table
            end
        end

        -- If the value at the path is not a table, return an empty table
        if type(current) ~= "table" then
            return {}
        end

        -- Return the keys of the nested object
        return recurse(current)
    else
        -- If no path is specified, return top-level keys
        return recurse(self.store)
    end
end

function KV:registerPlugin(pluginName, pluginFunction)
    if type(pluginName) ~= "string" or type(pluginFunction) ~= "function" then
        error("Invalid plugin name or function")
    end
    if self[pluginName] then
        error(pluginName .. " already exists")
    end

    self[pluginName] = pluginFunction
end

function KV.filter_store(store, fn)
    local results = {}
    for k, v in pairs(store) do
        if fn(k, v) then
            results[k] = v
        end
    end
    return results
end

function KV.starts_with(str, prefix)
    return str:sub(1, #prefix) == prefix
end

function KV:getPrefix(str)
    return KV.filter_store(self.store, function(k, _)
        return KV.starts_with(k, str)
    end)
end

return KV
