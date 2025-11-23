local KVPackageName = '@permaweb/kv-base'
local KV = {}

KV.__index = KV

--- Creates a new KV instance.
-- @param plugins Optional table of plugins, each with a register function.
-- @return A new KV instance.
function KV.new(plugins)
	if type(plugins) ~= 'table' and type(plugins) ~= 'nil' then
		print('Invalid plugins')
		error('Invalid plugins arg, must be table or nil')
	end

	local self = setmetatable({}, KV)

	if plugins and type(plugins) == 'table' then
		for _, plugin in ipairs(plugins) do
			if type(plugin) == 'table' and plugin.register then
				plugin.register(self)
			end
		end
	end
	self.Store = {}
	return self
end

--- Returns a copy of the entire key-value store.
-- @return A table representing the current state of the key-value store.
function KV:dump()
	local copy = {}
	for k, v in pairs(self.Store) do
		copy[k] = v
	end
	return copy
end

--- Retrieves a value from the key-value store.
-- @param keyString A dot-separated string representing the key path.
-- @return The value at the specified key path, or nil if not found.
function KV:get(keyString)
	local keys = self:_splitKeyString(keyString)
	local current = self.Store

	for _, key in ipairs(keys) do
		if type(current) ~= 'table' or current[key] == nil then
			return nil
		end
		current = current[key]
	end

	return current
end

--- Sets a value in the key-value store.
-- @param keyString A dot-separated string representing the key path.
-- @param value The value to set at the specified key path.
function KV:set(keyString, value)
	if keyString == '' then
		self.Store = value -- Set the entire store to the value
		return
	end

	local keys = self:_splitKeyString(keyString)
	local current = self.Store

	for i = 1, #keys - 1 do
		local key = keys[i]
		if type(current[key]) ~= 'table' then
			current[key] = {} -- Create table if it doesn't exist
		end
		current = current[key]
	end

	current[keys[#keys]] = value
end

--- Appends a value to an array stored at the given key path.
-- @param keyString A dot-separated string representing the key path.
-- @param value The value to append to the array.
function KV:append(keyString, value)
	local array = self:get(keyString)
	if type(array) ~= 'table' then
		array = {}
		self:set(keyString, array)
	end

	table.insert(array, value)
end

--- Splits a dot-separated key string into individual keys.
-- @param keyString The dot-separated key string.
-- @return A table containing individual keys.
function KV:_splitKeyString(keyString)
	local keys = {}
	for key in string.gmatch(keyString, '[^%.]+') do
		table.insert(keys, key)
	end
	return keys
end

--- Removes a value from the key-value store.
--- Use `"."` to clear the entire store (root level).
-- @param keyString A dot-separated string for the key path, or `"."` to clear the root.
-- @raise Error if `keyString` is `""`.
function KV:remove(keyString)
	if keyString == '.' then
		self.Store = {} -- Clear the entire store
		return
	elseif keyString == '' then
		error(
			"Invalid keyString: an empty string is not allowed. Use '.' to clear the root."
		)
	end

	local keys = self:_splitKeyString(keyString)
	local current = self.Store

	-- Traverse to the second-to-last key
	for i = 1, #keys - 1 do
		local key = keys[i]
		if type(current) ~= 'table' or current[key] == nil then
			return -- Key path doesn't exist, nothing to remove
		end
		current = current[key]
	end

	-- Remove the final key in the path
	current[keys[#keys]] = nil
end

--- Returns the number of top-level keys in the store.
-- @return The count of top-level keys in the key-value store.
function KV:len()
	local count = 0
	for _ in pairs(self.Store) do
		count = count + 1
	end
	return count
end

--- Returns a list of keys at a specified path.
-- @param path Optional dot-separated string representing the key path.
-- @return A table containing keys at the specified path, or top-level keys if no path is specified.
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
	if path and type(path) == 'string' then
		local keys = self:_splitKeyString(path)
		local current = self.Store

		-- Traverse the store according to the keys in the path
		for _, key in ipairs(keys) do
			if type(current) == 'table' and current[key] then
				current = current[key]
			else
				return {} -- If the path does not exist, return an empty table
			end
		end

		-- If the value at the path is not a table, return an empty table
		if type(current) ~= 'table' then
			return {}
		end

		-- Return the keys of the nested object
		return recurse(current)
	else
		-- If no path is specified, return top-level keys
		return recurse(self.Store)
	end
end

--- Registers a new plugin function in the KV instance.
-- @param pluginName The name of the plugin.
-- @param pluginFunction The function to be registered as a plugin.
function KV:registerPlugin(pluginName, pluginFunction)
	if type(pluginName) ~= 'string' or type(pluginFunction) ~= 'function' then
		error('Invalid plugin name or function')
	end
	if self[pluginName] then
		error(pluginName .. ' already exists')
	end

	self[pluginName] = pluginFunction
end

--- Filters the store based on a given condition function.
-- @param store The table to filter.
-- @param fn The condition function that takes key and value and returns a boolean.
-- @return A new table containing only the key-value pairs that match the condition.
function KV.filter_store(store, fn)
	local results = {}
	for k, v in pairs(store) do
		if fn(k, v) then
			results[k] = v
		end
	end
	return results
end

--- Checks if a string starts with a specified prefix.
-- @param str The string to check.
-- @param prefix The prefix to look for.
-- @return True if the string starts with the prefix, otherwise false.
function KV.starts_with(str, prefix)
	return str:sub(1, #prefix) == prefix
end

--- Gets all keys that start with a specified prefix.
-- @param str The prefix string to filter keys.
-- @return A table containing all keys that start with the specified prefix.
function KV:getPrefix(str)
	return KV.filter_store(self.Store, function(k, _)
		return KV.starts_with(k, str)
	end)
end

return KV
