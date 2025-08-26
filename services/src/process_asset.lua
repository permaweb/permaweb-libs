local bint = require('.bint')(256)
local json = require('json')

local unsetPlaceholder = '!UNSET!'

Token = Token or {
    Name = Name or unsetPlaceholder,
    Ticker = Ticker or unsetPlaceholder,
    Denomination = Denomination or unsetPlaceholder,
    Balances = Balances or {},
    TotalSupply = TotalSupply or unsetPlaceholder,
    Transferable = true,
    Creator = Creator or unsetPlaceholder,
}

Metadata = Metadata or {}

-- Users with permission to update process token data and metadata
AuthUsers = AuthUsers or {}

-- Processes who receive updates on asset updates
IndexRecipients = IndexRecipients or {}

DateCreated = DateCreated or nil
LastUpdate = LastUpdate or nil

local function checkValidAddress(address)
    if not address or type(address) ~= 'string' then
        return false
    end

    return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

local function checkValidAmount(data)
    return (math.type(tonumber(data)) == 'integer' or math.type(tonumber(data)) == 'float') and bint(data) > 0
end

local function decodeMessageData(data)
    local status, decodedData = pcall(json.decode, data)

    if not status or type(decodedData) ~= 'table' then
        return false, nil
    end

    return true, decodedData
end

local function hasUpdatePermissions(from)
    if from == Creator or from == Owner or from == ao.id then
        return true
    end

    for _, user in ipairs(AuthUsers) do
        if from == user then
            return true
        end
    end

    return false
end

local function deepCopy(original)
    local copy
    if type(original) == 'table' then
        copy = {}
        for originalKey, originalValue in pairs(original) do
            copy[originalKey] = deepCopy(originalValue)
        end
    else
        copy = original
    end
    return copy
end

local function splitPath(path)
    local parts = {}
    local current = ''
    for i = 1, #path do
        local char = string.sub(path, i, i)
        if char == '.' then
            if current ~= '' then
                table.insert(parts, current)
                current = ''
            end
        else
            current = current .. char
        end
    end
    if current ~= '' then
        table.insert(parts, current)
    end
    return parts
end

local function excludeField(data, fieldPath)
    local parts = splitPath(fieldPath)

    local current = data
    for i = 1, #parts - 1 do
        if type(current) ~= 'table' or current[parts[i]] == nil then
            return -- Path doesn't exist, nothing to exclude
        end
        current = current[parts[i]]
    end

    if type(current) == 'table' then
        current[parts[#parts]] = nil
    end
end

local function getIndexData(args) -- AssetType, ContentType, Exclude
    local indexData = {
        Name = Token.Name,
        Ticker = Token.Ticker,
        Denomination = tostring(Token.Denomination),
        TotalSupply = Token.TotalSupply,
        Balances = Token.Balances,
        Transferable = Token.Transferable,
        Creator = Token.Creator,
        Metadata = deepCopy(Metadata),
        ProcessType = 'atomic-asset',
        DateCreated = DateCreated,
        LastUpdate = LastUpdate,
    }

    if args then
        if args.AssetType then indexData.AssetType = args.AssetType end;
        if args.ContentType then indexData.ContentType = args.ContentType end;

        -- Handle exclusions
        if args.Exclude then
            for _, excludeKey in ipairs(args.Exclude) do
                excludeField(indexData, excludeKey)
            end
        end
    end

    return json.encode(indexData)
end

local function getState()
    return {
        Name = Token.Name,
        Ticker = Token.Ticker,
        Denomination = tostring(Token.Denomination),
        Balances = Token.Balances,
        TotalSupply = Token.TotalSupply,
        Transferable = Token.Transferable,
        Creator = Token.Creator,
        Metadata = Metadata,
        AuthUsers = AuthUsers,
        IndexRecipients = IndexRecipients,
        DateCreated = tostring(DateCreated),
        LastUpdate = tostring(LastUpdate),
    }
end

local function syncState()
    Send({ device = 'patch@1.0', asset = json.encode(getState()) })
end

Handlers.add('Init', 'Init', function(msg)
    if Token.Creator and Token.TotalSupply then
        -- Notify creator of the asset
        ao.send({
            Target = Token.Creator,
            Action = 'Add-Uploaded-Asset',
            Quantity = tostring(Token.TotalSupply),
            ['Asset-Id'] = ao.id,
        })
    end
end)

-- Read process state
Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
    msg.reply({
        Name = Token.Name,
        Ticker = Token.Ticker,
        Denomination = tostring(Token.Denomination),
        Transferable = tostring(Token.Transferable),
        Data = json.encode(getState())
    })
end)

-- Transfer balance to recipient (Data - { Recipient, Quantity })
Handlers.add('Transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'), function(msg)
    if not Token.Transferable and msg.From ~= ao.id then
        msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Transfers are not allowed' } })
        return
    end

    local data = {
        Recipient = msg.Tags.Recipient,
        Quantity = msg.Tags.Quantity
    }

    if checkValidAddress(data.Recipient) and checkValidAmount(data.Quantity) and bint(data.Quantity) <= bint(Token.Balances[msg.From] or '0') then
        -- Transfer is valid, calculate balances
        if not Token.Balances[msg.From] then
            Token.Balances[msg.From] = '0'
        end

        if not Token.Balances[data.Recipient] then
            Token.Balances[data.Recipient] = '0'
        end

        Token.Balances[msg.From] = tostring(bint(Token.Balances[msg.From]) - bint(data.Quantity))
        Token.Balances[data.Recipient] = tostring(bint(Token.Balances[data.Recipient]) + bint(data.Quantity))

        -- If new balance zeroes out then remove it from the table
        if bint(Token.Balances[msg.From]) <= bint(0) then
            Token.Balances[msg.From] = nil
        end
        if bint(Token.Balances[data.Recipient]) <= bint(0) then
            Token.Balances[data.Recipient] = nil
        end

        local debitNoticeTags = {
            Status = 'Success',
            Message = 'Balance transferred, debit notice issued',
            Recipient = msg.Tags.Recipient,
            Quantity = msg.Tags.Quantity,
        }

        local creditNoticeTags = {
            Status = 'Success',
            Message = 'Balance transferred, credit notice issued',
            Sender = msg.From,
            Quantity = msg.Tags.Quantity,
        }

        for tagName, tagValue in pairs(msg) do
            if string.sub(tagName, 1, 2) == 'X-' then
                debitNoticeTags[tagName] = tagValue
                creditNoticeTags[tagName] = tagValue
            end
        end

        -- Send a debit notice to the sender
        ao.send({
            Target = msg.From,
            Action = 'Debit-Notice',
            Tags = debitNoticeTags,
            Data = json.encode({
                Recipient = data.Recipient,
                Quantity = tostring(data.Quantity)
            })
        })

        -- Send a credit notice to the recipient
        ao.send({
            Target = data.Recipient,
            Action = 'Credit-Notice',
            Tags = creditNoticeTags,
            Data = json.encode({
                Sender = msg.From,
                Quantity = tostring(data.Quantity)
            })
        })

        syncState()
    end
end)

-- Mint new tokens (Data - { Quantity })
Handlers.add('Mint', Handlers.utils.hasMatchingTag('Action', 'Mint'), function(msg)
    local decodeCheck, data = decodeMessageData(msg.Data)

    if decodeCheck and data then
        -- Check if quantity is present
        if not data.Quantity then
            msg.reply({ Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Quantity }' } })
            return
        end

        -- Check if quantity is a valid integer greater than zero
        if not checkValidAmount(data.Quantity) then
            msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Quantity must be an integer greater than zero' } })
            return
        end

        -- Check if owner is sender
        if msg.From ~= Owner then
            msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Only the process owner can mint new tokens' } })
            return
        end

        if not Token.Balances[Owner] then
            Token.Balances[Owner] = '0'
        end

        Token.Balances[Owner] = tostring(bint(Token.Balances[Owner]) + bint(data.Quantity))

        msg.reply({ Action = 'Mint-Success', Tags = { Status = 'Success', Message = 'Tokens minted' } })

        syncState()
    else
        msg.reply({
            Action = 'Input-Error',
            Tags = {
                Status = 'Error',
                Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
                    'Data must be an object - { Quantity }')
            }
        })
    end
end)

-- Read balance ({ Recipient | Target })
Handlers.add('Balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
    local data

    if msg.Tags.Recipient then
        data = { Target = msg.Tags.Recipient }
    elseif msg.Tags.Target then
        data = { Target = msg.Tags.Target }
    else
        data = { Target = msg.From }
    end

    if data then
        -- Check if target is present
        if not data.Target then
            msg.reply({ Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Target }' } })
            return
        end

        -- Check if target is a valid address
        if not checkValidAddress(data.Target) then
            msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Target is not a valid address' } })
            return
        end

        local balance = Token.Balances[data.Target] or '0'

        msg.reply({
            Action = 'Balance-Notice',
            Tags = {
                Status = 'Success',
                Message = 'Balance received',
                Account = data.Target
            },
            Data = balance
        })
    else
        msg.reply({
            Action = 'Input-Error',
            Tags = {
                Status = 'Error',
                Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
                    'Data must be an object - { Target }')
            }
        })
    end
end)

-- Read balances
Handlers.add('Balances', Handlers.utils.hasMatchingTag('Action', 'Balances'),
    function(msg)
        msg.reply({ Data = json.encode(Token.Balances) })
    end)

-- Read total supply of token
Handlers.add('Total-Supply', Handlers.utils.hasMatchingTag('Action', 'Total-Supply'), function(msg)
    assert(msg.From ~= ao.id, 'Cannot call Total-Supply from the same process!')

    msg.reply({
        Action = 'Total-Supply',
        Data = tostring(Token.TotalSupply),
        Ticker = Token.Ticker
    })
end)

-- Update asset token / metadata
Handlers.add('Update-Asset', 'Update-Asset', function(msg)
    if not hasUpdatePermissions(msg.From) then return end

    local decodeCheck, data = decodeMessageData(msg.Data)

    if decodeCheck and data then
        LastUpdate = tostring(msg.Timestamp)

        for key, value in pairs(data) do
            if Token[key] ~= nil then
                Token[key] = value
            elseif Metadata[key] ~= nil or type(value) == 'string' or type(value) == 'table' then
                Metadata[key] = value
            end
        end

        -- Parse Exclude tag if present
        local excludeList = nil
        if msg.Tags['Exclude-Index'] then
            local excludeDecodeCheck, excludeData = pcall(json.decode, msg.Tags['Exclude-Index'])
            if excludeDecodeCheck and type(excludeData) == 'table' then
                excludeList = excludeData
            end
        end

        for _, recipient in ipairs(IndexRecipients) do
            ao.send({
                Target = recipient,
                Action = 'Index-Notice',
                Recipient = recipient,
                Data = getIndexData({
                    Exclude = excludeList
                })
            })
        end

        msg.reply({
            Action = 'Update-Asset-Notice',
            Tags = { Status = 'Success', Message = 'Asset updated!' }
        })

        syncState()
    end
end)

-- Initialize a request to index this asset data in another process
Handlers.add('Send-Index', 'Send-Index', function(msg)
    if not hasUpdatePermissions(msg.From) then return end

    local decodeCheck, data = decodeMessageData(msg.Data)

    if decodeCheck and data then
        if data.Recipients then
            -- Parse Exclude tag if present
            local excludeList = nil
            if msg.Tags['Exclude'] then
                local excludeDecodeCheck, excludeData = pcall(json.decode, msg.Tags['Exclude'])
                if excludeDecodeCheck and type(excludeData) == 'table' then
                    excludeList = excludeData
                end
            end

            for _, recipient in ipairs(data.Recipients) do
                local exists = false
                for _, existingRecipient in ipairs(IndexRecipients) do
                    if existingRecipient == recipient then
                        exists = true
                        break
                    end
                end

                if not exists then
                    table.insert(IndexRecipients, recipient)
                end

                ao.send({
                    Target = recipient,
                    Action = 'Index-Notice',
                    Recipient = recipient,
                    Data = getIndexData({
                        AssetType = msg.Tags['Asset-Type'],
                        ContentType = msg.Tags['Content-Type'],
                        Exclude = excludeList
                    }),
                })
            end
        end
    end
end)

-- Parse the key string to determine the nested structure:
-- Split the key by . to get each 'level'.
-- For the last part, check if it ends with []. If so, we are dealing with an array field.
-- Traverse store according to the split key parts, creating sub-tables as needed.
-- At the final level:
-- If it’s a normal field (no []), assign the value directly.
-- If it ends with [], append the value to an array at that field.
-- Examples:
-- setStoreValue('User.Name', 'Alice')
-- setStoreValue('User.Address.City', 'New York')
-- setStoreValue('Tags[]', 'tag1')
-- setStoreValue('Tags[]', 'tag2')
-- setStoreValue('User.Hobbies[]', 'gaming')
-- setStoreValue('User.Hobbies[]', 'chess')
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

    local isArray = false
    if string.sub(lastPart, -2) == '[]' then
        isArray = true
        lastPart = string.sub(lastPart, 1, -3)
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

    if not status or decodedValue == nil then
        decodedValue = value
    end

    if isAppend then
        -- Append mode
        if type(current[finalKey]) == 'table' then
            -- Append to an existing table
            table.insert(current[finalKey], decodedValue)
        elseif isArray then
            -- Append to the last array element
            local arr = current[finalKey]
            arr[#arr] = arr[#arr] .. value
        else
            -- Append to a string or create a new array
            current[finalKey] = current[finalKey] and { current[finalKey], decodedValue } or { decodedValue }
        end
    else
        -- Normal mode
        if type(decodedValue) == 'table' then
            if current[finalKey] == nil then
                current[finalKey] = decodedValue
            else
                -- Merge tables
                for k, v in pairs(decodedValue) do
                    current[finalKey][k] = v
                end
            end
        elseif isArray then
            if current[finalKey] == nil then
                current[finalKey] = { value }
            else
                table.insert(current[finalKey], value)
            end
        else
            current[finalKey] = decodedValue
        end
    end
end

-- setTokenProps adjusts the Token table based on the bootloader values
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

local isInitialized = false

-- Boot Initialization
if not isInitialized and #Inbox >= 1 and Inbox[1]['On-Boot'] ~= nil then
    isInitialized = true

    local collectedValues = {}
    for _, tag in ipairs(Inbox[1].TagArray) do
        if tag.name == 'Date-Created' then
            DateCreated = tostring(tag.value)
        end

        if tag.name == 'Auth-Users' then
            local authUsers = json.decode(tag.value)
            for _, authUser in ipairs(authUsers) do
                table.insert(AuthUsers, authUser)
            end
        end

        local bootLoaderPrefix = 'Bootloader-'
        if string.sub(tag.name, 1, string.len(bootLoaderPrefix)) == bootLoaderPrefix then
            local keyWithoutPrefix = string.sub(tag.name, string.len(bootLoaderPrefix) + 1)
            if not Token[keyWithoutPrefix] then
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

    -- Initialize balances if needed
    if Token.Creator and Token.TotalSupply then
        Token.Balances = { [Token.Creator] = tostring(Token.TotalSupply) }
    end

    syncState()
end
