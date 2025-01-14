local bint = require('.bint')(256)
local json = require('json')

UNSET_PLACEHOLDER = '<UNSET>'

if Name ~= UNSET_PLACEHOLDER then Name = UNSET_PLACEHOLDER end

Ticker = Ticker or UNSET_PLACEHOLDER
Denomination = Denomination or UNSET_PLACEHOLDER
TotalSupply = TotalSupply or UNSET_PLACEHOLDER

Creator = Creator or UNSET_PLACEHOLDER
Collection = Collection or UNSET_PLACEHOLDER
Status = Status or UNSET_PLACEHOLDER
Content = Content or {}
Topics = Topics or {}
Categories = Categories or {}
Thumbnail = Thumbnail or UNSET_PLACEHOLDER
Description = Description or UNSET_PLACEHOLDER
IndexRecipients = IndexRecipients or {}

Balances = Balances or { ['<CREATOR>'] = '<SUPPLY>' }

Transferable = true

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

local function mergeTables(t1, t2)
    local merged = {}
    for k, v in pairs(t1) do
        merged[k] = v
    end
    for k, v in pairs(t2) do
        merged[k] = v
    end
    return merged
end

local function getAssetData(full)
    local data = {
        Id = ao.id,
        Title = Name,
        Creator = Creator,
        Balances = Balances,
        Status = Status,
        Categories = Categories,
        Topics = Topics,
    }

    if full then
        data.Content = Content
    end

    return data
end

-- Read process state
Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
    msg.reply({
        Name = Name,
        Ticker = Ticker,
        Denomination = tostring(Denomination),
        Transferable = Transferable,
        Data = json.encode(getAssetData(false))
    })
end)

-- Transfer balance to recipient (Data - { Recipient, Quantity })
Handlers.add('Transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'), function(msg)
    if not Transferable and msg.From ~= ao.id then
        msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Transfers are not allowed' } })
        return
    end

    local data = {
        Recipient = msg.Tags.Recipient,
        Quantity = msg.Tags.Quantity
    }

    if checkValidAddress(data.Recipient) and checkValidAmount(data.Quantity) and bint(data.Quantity) <= bint(Balances[msg.From]) then
        -- Transfer is valid, calculate balances
        if not Balances[msg.From] then
            Balances[msg.From] = '0'
        end

        if not Balances[data.Recipient] then
            Balances[data.Recipient] = '0'
        end

        Balances[msg.From] = tostring(bint(Balances[msg.From]) - bint(data.Quantity))
        Balances[data.Recipient] = tostring(bint(Balances[data.Recipient]) + bint(data.Quantity))

        -- If new balance zeroes out then remove it from the table
        if bint(Balances[msg.From]) <= bint(0) then
            Balances[msg.From] = nil
        end
        if bint(Balances[data.Recipient]) <= bint(0) then
            Balances[data.Recipient] = nil
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

        -- Mint request is valid, add tokens to the pool
        if not Balances[Owner] then
            Balances[Owner] = '0'
        end

        Balances[Owner] = tostring(bint(Balances[Owner]) + bint(data.Quantity))

        msg.reply({ Action = 'Mint-Success', Tags = { Status = 'Success', Message = 'Tokens minted' } })
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

-- Read balance (Data - { Recipient })
Handlers.add('Balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
    local balance = '0'

    -- If not Recipient is provided, then return the Senders balance
    if (msg.Tags.Recipient) then
        if (Balances[msg.Tags.Recipient]) then
            balance = Balances[msg.Tags.Recipient]
        end
    elseif msg.Tags.Target and Balances[msg.Tags.Target] then
        balance = Balances[msg.Tags.Target]
    elseif Balances[msg.From] then
        balance = Balances[msg.From]
    end

    msg.reply({
        Balance = balance,
        Ticker = Ticker,
        Account = msg.Tags.Recipient or msg.From,
        Data = balance
    })
end)

-- Read balances
Handlers.add('Balances', Handlers.utils.hasMatchingTag('Action', 'Balances'),
    function(msg) msg.reply({ Data = json.encode(Balances) }) end)

-- Read total supply of token
Handlers.add('Total-Supply', Handlers.utils.hasMatchingTag('Action', 'Total-Supply'), function(msg)
    assert(msg.From ~= ao.id, 'Cannot call Total-Supply from the same process!')

    msg.reply({
        Action = 'Total-Supply',
        Data = tostring(TotalSupply),
        Ticker = Ticker
    })
end)

-- Update post content
Handlers.add('Update-Asset', 'Update-Asset', function(msg)
    if msg.From ~= Creator and msg.From ~= Owner and msg.From ~= ao.id then return end
    local decodeCheck, data = decodeMessageData(msg.Data)

    if decodeCheck and data then
        local indexData = {}

        if data.Title then
            Name = data.Title
            indexData.Title = data.Title
        end
        if data.Thumbnail then
            Thumbanail = data.Thumbnail
            indexData.Thumbnail = data.Thumbnail
        end
        if data.Description then
            Description = data.Description
            indexData.Description = data.Description
        end
        if data.Status then
            Status = data.Status
            indexData.Status = data.Status
        end
        if data.Categories then
            Categories = data.Categories
            indexData.Categories = data.Categories
        end
        if data.Topics then
            Topics = data.Topics
            indexData.Topics = data.Topics
        end

        if data.Content then Content = data.Content end

        for _, recipient in ipairs(IndexRecipients) do
            ao.send({
                Target = recipient,
                Action = 'Index-Notice',
                Recipient = recipient,
                Data = json.encode(indexData)
            })
        end

        msg.reply({ Action = 'Update-Asset-Notice', Tags = { Status = 'Success', Message = 'Asset updated' } })
    end
end)

-- Get post content
Handlers.add('Get-Asset', 'Get-Asset', function(msg)
    msg.reply({
        Action = 'Asset-Notice',
        Data = json.encode(getAssetData(true))
    })
end)

-- Initialize a request to index this asset data in another process
Handlers.add('Send-Index', 'Send-Index', function(msg)
    if msg.From ~= Creator and msg.From ~= Owner and msg.From ~= ao.id then return end
    local decodeCheck, data = decodeMessageData(msg.Data)

    if decodeCheck and data then
        if data.Recipients then
            local indexData = {
                ProcessType = 'atomic-asset',
                DateCreated = msg.Timestamp
            }

            if msg.AssetType then indexData.AssetType = msg.AssetType end
            if msg.ContentType then indexData.ContentType = msg.ContentType end

            indexData = mergeTables(indexData, getAssetData(false))

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
                    Data = json.encode(indexData)
                })
            end
        end
    end
end)

-- Initialize a request to add to creator zone
Handlers.once('Add-Upload-To-Zone', 'Add-Upload-To-Zone', function(msg)
    if msg.From ~= Creator and msg.From ~= Owner and msg.From ~= ao.id then return end
    ao.send({
        Target = Creator,
        Action = 'Add-Upload',
        AssetId = ao.id,
        AssetType = msg.AssetType,
        ContentType = msg.ContentType
    })
end)

-- Boot Initialization
if #Inbox >= 1 and Inbox[1]['On-Boot'] ~= nil then
    local collectedValues = {}
    for _, tag in ipairs(Inbox[1].TagArray) do
        local prefix = 'Bootloader-'
        if string.sub(tag.name, 1, string.len(prefix)) == prefix then
            local keyWithoutPrefix = string.sub(tag.name, string.len(prefix) + 1)
            if not collectedValues[keyWithoutPrefix] then
                collectedValues[keyWithoutPrefix] = { tag.value }
            else
                table.insert(collectedValues[keyWithoutPrefix], tag.value)
            end
        end
    end

    for key, values in pairs(collectedValues) do
        if _G[key] ~= nil then
            if #values == 1 then
                if type(_G[key]) == 'table' then
                    table.insert(_G[key], values[1])
                else
                    _G[key] = values[1]
                end
            else
                if type(_G[key]) == 'table' then
                    for _, value in ipairs(values) do
                        table.insert(_G[key], value)
                    end
                else
                    _G[key] = values
                end
            end
        end
    end

    for key, value in pairs(_G) do
        if value == UNSET_PLACEHOLDER then
            _G[key] = nil
        end
    end

    Balances = { [Creator] = tostring(TotalSupply) }

    ao.send({ Target = Creator, Action = 'Add-Upload', AssetId = ao.id })
end
