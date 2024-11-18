local KV = require('kv')

local function get_len(results)
    local printed = ""
    local len = 0
    for _, v in pairs(results) do
        printed = printed .. v
        len = len + 1
    end
    return len
end

describe("Should set, get, and remove simple strings", function()
    it("should create, set, get, and remove", function()
        local nameKey = "@x:Name"
        local status, result = pcall(KV.new)
        if not status then
            print(result)
            return result
        end
        assert.are.same(status, true)

        local store = result

        -- Set and get value
        store:set(nameKey, "BobbaBouey")
        local response = store:get(nameKey)
        assert.are.same(response, "BobbaBouey")

        -- Remove value
        store:remove(nameKey)
        local responseAfterRemove = store:get(nameKey)
        assert.are.same(responseAfterRemove, nil)

        -- Ensure keys are empty after removal
        local keys = store:keys()
        assert.are.same(#keys, 0)
    end)
end)

describe("By prefix", function()
    it("should set multiple, get by prefix key, and remove", function()
        local status, result = pcall(KV.new)
        assert.are.same(status, true)
        local bStore = result

        -- Set values
        bStore:set("@x:Fruit:1", "apple")
        bStore:set("@x:Fruit:2", "peach")
        bStore:set("@x:Meat:1", "bacon")

        -- Get by prefix and verify length
        local results = bStore:getPrefix("@x:Fruit")
        assert.are.same(get_len(results), 2)

        local allResults = bStore:getPrefix("")
        assert.are.same(get_len(allResults), 3)

        -- Remove one of the values and verify
        bStore:remove("@x:Fruit:1")
        local resultsAfterRemove = bStore:getPrefix("@x:Fruit")
        assert.are.same(get_len(resultsAfterRemove), 1)

        -- Verify that removing a non-existent key does not cause any errors
        bStore:remove("@x:Fruit:NonExistent")

        -- Remove remaining values and check that the store is empty
        bStore:remove("@x:Fruit:2")
        bStore:remove("@x:Meat:1")

        local allResultsAfterRemovals = bStore:getPrefix("")
        assert.are.same(get_len(allResultsAfterRemovals), 0)
    end)
end)

describe("Nested keys", function()
    it("should set, get, and remove nested values", function()
        local status, result = pcall(KV.new)
        assert.are.same(status, true)
        local store = result

        -- Set nested keys
        store:set("user.info.name", "Alice")
        store:set("user.info.age", 30)
        store:set("user.info.hobbies.1", "reading")
        store:set("user.info.hobbies.2", "cycling")

        -- Get nested values
        assert.are.same(store:get("user.info.name"), "Alice")
        assert.are.same(store:get("user.info.age"), 30)
        assert.are.same(store:get("user.info.hobbies.1"), "reading")
        assert.are.same(store:get("user.info.hobbies.2"), "cycling")

        -- Remove a nested value
        store:remove("user.info.age")
        assert.are.same(store:get("user.info.age"), nil)

        -- Remove an entire nested object
        store:remove("user.info.hobbies")
        assert.are.same(store:get("user.info.hobbies.1"), nil)
        assert.are.same(store:get("user.info.hobbies.2"), nil)

        -- Ensure "user.info.name" still exists
        assert.are.same(store:get("user.info.name"), "Alice")
    end)
end)

describe("KV:keys() functionality", function()

    it("should return only top-level keys when no path is provided", function()
        local store = KV.new()
        store:set("user.info.name", "Alice")
        store:set("user.info.age", 30)
        store:set("settings.theme", "dark")

        local keys = store:keys()
        table.sort(keys)  -- Sorting keys to ensure order consistency for testing
        assert.are.same(keys, {"settings", "user"})
    end)

    it("should return nested keys when a valid path is provided", function()
        local store = KV.new()
        store:set("user.info.name", "Alice")
        store:set("user.info.age", 30)
        store:set("user.address.city", "Wonderland")

        local userInfoKeys = store:keys("user.info")
        table.sort(userInfoKeys)  -- Sorting keys to ensure order consistency for testing
        assert.are.same(userInfoKeys, {"age", "name"})

        local userAddressKeys = store:keys("user.address")
        assert.are.same(userAddressKeys, {"city"})
    end)

    it("should return an empty table if the specified path does not exist", function()
        local store = KV.new()
        store:set("user.info.name", "Alice")
        store:set("user.info.age", 30)

        local keys = store:keys("user.nonexistent")
        assert.are.same(keys, {})
    end)

    it("should handle deep nested structures properly", function()
        local store = KV.new()
        store:set("config.system.network.ip", "192.168.0.1")
        store:set("config.system.network.gateway", "192.168.0.254")
        store:set("config.system.display.resolution", "1920x1080")

        local networkKeys = store:keys("config.system.network")
        table.sort(networkKeys)  -- Sorting keys to ensure order consistency for testing
        assert.are.same(networkKeys, {"gateway", "ip"})

        local displayKeys = store:keys("config.system.display")
        assert.are.same(displayKeys, {"resolution"})
    end)

    it("should return an empty table if called on a leaf node", function()
        local store = KV.new()
        store:set("settings.theme", "dark")

        -- Since "settings.theme" is a value, not an object, it should return an empty table
        local themeKeys = store:keys("settings.theme")
        assert.are.same(themeKeys, {})
    end)
end)

