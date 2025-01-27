local json = require('json')

local function printTable(t, indent)
    local jsonStr = ''
    local function serialize(tbl, indentLevel)
        local isArray = #tbl > 0
        local tab = isArray and '[\n' or '{\n'
        local sep = isArray and ',\n' or ',\n'
        local endTab = isArray and ']' or '}'
        indentLevel = indentLevel + 1

        for k, v in pairs(tbl) do
            tab = tab .. string.rep('  ', indentLevel)
            if not isArray then
                tab = tab .. '\'' .. tostring(k) .. '\': '
            end

            if type(v) == 'table' then
                tab = tab .. serialize(v, indentLevel) .. sep
            else
                if type(v) == 'string' then
                    tab = tab .. '\'' .. tostring(v) .. '\'' .. sep
                else
                    tab = tab .. tostring(v) .. sep
                end
            end
        end

        if tab:sub(-2) == sep then
            tab = tab:sub(1, -3) .. '\n'
        end

        indentLevel = indentLevel - 1
        tab = tab .. string.rep('  ', indentLevel) .. endTab
        return tab
    end

    jsonStr = serialize(t, indent or 0)
    print(jsonStr)
end

local unsetPlaceholder = '!UNSET!'

Token = Token or {
    Name = Name or unsetPlaceholder,
    Ticker = Ticker or unsetPlaceholder,
    Denomination = Denomination or unsetPlaceholder,
    TotalSupply = TotalSupply or unsetPlaceholder,
    Transferable = true,
    Creator = Creator or unsetPlaceholder,
    Balances = Balances or {},
}


Metadata = Metadata or {}

Inbox = {
    {
        ['On-Boot'] = 'yP9yYuq5dWNrXuTClg1rFTX70gpgMIgI-0MyxfN0w64',
        TagArray = {
            { name = 'On-Boot',                 value = 'yP9yYuq5dWNrXuTClg1rFTX70gpgMIgI-0MyxfN0w64' },
            { name = 'Creator',                 value = 'creator' },
            { name = 'Asset-Type',              value = 'Example Atomic Asset Type' },
            { name = 'Content-Type',            value = 'text/plain' },
            { name = 'Implements',              value = 'ANS-110' },
            { name = 'Date-Created',            value = '1737995715334' },
            { name = 'Bootloader-Name',         value = 'Example Name' },
            { name = 'Bootloader-Description',  value = 'Example Description' },
            { name = 'Bootloader-Ticker',       value = 'ATOMIC' },
            { name = 'Bootloader-Denomination', value = '1' },
            { name = 'Bootloader-TotalSupply',  value = '1' },
            { name = 'Bootloader-Transferable', value = 'true' },
            { name = 'Bootloader-Creator',      value = 'creator' },
            { name = 'Bootloader-Topics',       value = '["Topic 1","Topic 2","Topic 3"]' },
            { name = 'Bootloader-Status',       value = 'Initial Status' }
        }
    }
}

local function setStoreValue(key, value)
    -- Split by '.'
    local parts = {}
    for part in string.gmatch(key, "[^%.]+") do
        table.insert(parts, part)
    end

    local lastPart = parts[#parts]

    local isAppend = false
    if string.sub(lastPart, -3) == '+++' then
        isAppend = true
        lastPart = string.sub(lastPart, 1, -4) -- remove '+++'
    end

    parts[#parts] = lastPart

    -- Traverse the structure in Metadata
    local current = Metadata
    for i = 1, #parts - 1 do
        local segment = parts[i]
        if current[segment] == nil then
            current[segment] = {}
        end
        current = current[segment]
    end

    local finalKey = parts[#parts]

    local status, decodedValue = pcall(json.decode, value)

    print(decodedValue)

    if not status or decodedValue == nil then
        -- Value is not JSON, treat it as a normal string
        decodedValue = value
    end

    if isAppend then
        -- Append mode
        if type(current[finalKey]) == "table" then
            -- Append to an existing table
            table.insert(current[finalKey], decodedValue)
        else
            -- Append to a string or create a new array
            current[finalKey] = current[finalKey] and { current[finalKey], decodedValue } or { decodedValue }
        end
    else
        -- Normal mode
        if type(decodedValue) == "table" then
            if current[finalKey] == nil then
                current[finalKey] = decodedValue
            else
                -- Merge tables
                for k, v in pairs(decodedValue) do
                    current[finalKey][k] = v
                end
            end
        else
            current[finalKey] = decodedValue
        end
    end
end

local function setTokenProps(collectedValues)
    for key, values in pairs(collectedValues) do
        if Token[key] ~= nil then
            if #values == 1 then
                if type(Token[key]) == 'table' then
                    table.insert(Token[key], values[1])
                else
                    Token[key] = values[1]
                end
            else
                if type(Token[key]) == 'table' then
                    for _, value in ipairs(values) do
                        table.insert(Token[key], value)
                    end
                else
                    Token[key] = values
                end
            end
        end
    end

    -- Replace unset placeholders in Token with nil
    for k, v in pairs(Token) do
        if v == unsetPlaceholder then
            Token[k] = nil
        end
    end
end

-- Boot Initialization
if #Inbox >= 1 and Inbox[1]['On-Boot'] ~= nil then
    local collectedValues = {}
    for _, tag in ipairs(Inbox[1].TagArray) do
        if tag.name == 'Date-Created' then
            DateCreated = tostring(tag.value)
        end

        local prefix = 'Bootloader-'
        if string.sub(tag.name, 1, string.len(prefix)) == prefix then
            local keyWithoutPrefix = string.sub(tag.name, string.len(prefix) + 1)
            if Token[keyWithoutPrefix] == nil then
                setStoreValue(keyWithoutPrefix, tag.value)
            end

            if not collectedValues[keyWithoutPrefix] then
                collectedValues[keyWithoutPrefix] = { tag.value }
            else
                table.insert(collectedValues[keyWithoutPrefix], tag.value)
            end
        end
    end

    setTokenProps(collectedValues)
end

printTable(Metadata)
