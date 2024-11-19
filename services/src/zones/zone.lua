local KV = require('@permaweb/kv-base')
if not KV then
    error('KV Not found, install it')
end

local BatchPlugin = require('@permaweb/kv-batch')
if not BatchPlugin then
    error('BatchPlugin not found, install it')
end

local AssetManager = require('@permaweb/asset-manager')
if not AssetManager then
    error('AssetManager not found, install it')
end

local Subscribable = require('subscribable')({ useDB = false })

Zone = Zone or {}

Zone.Functions = Zone.Functions or {}

Zone.Constants = Zone.Constants or {
    H_ZONE_ERROR = 'Zone-Error',
    H_ZONE_SUCCESS = 'Zone-Success',
    H_ZONE_UPDATE = 'Zone-Update',
    H_ZONE_SET = 'Zone-Set',
    H_ZONE_APPEND = 'Zone-Append',
    H_ZONE_REMOVE = 'Zone-Remove',
    H_ZONE_KEYS = 'Zone-Keys',
    H_ZONE_GET = 'Info',
    H_ZONE_CREDIT_NOTICE = 'Credit-Notice',
    H_ZONE_DEBIT_NOTICE = 'Debit-Notice',
    H_ZONE_RUN_ACTION = 'Run-Action'
}

Zone.Data = Zone.Data or {
    KV = KV.new({ BatchPlugin }),
    AssetManager = AssetManager.new()
}

ZoneInitCompleted = ZoneInitCompleted or false

-- Utility Functions
function Zone.Functions.decodeMessageData(data)
    local status, decodedData = pcall(json.decode, data)
    if not status or type(decodedData) ~= 'table' then
        return { success = false, data = nil }
    end

    return { success = true, data = decodedData }
end

function Zone.Functions.isAuthorized(msg)
    return msg.From == Owner or msg.From == ao.id
end

function Zone.Functions.sendError(target, errorMessage)
    ao.send({
        Target = target,
        Action = Zone.H_ZONE_ERROR,
        Tags = {
            Status = 'Error',
            Message = errorMessage
        }
    })
end

-- Zone Actions
function Zone.Functions.zoneGet(msg)
    msg.reply({
        Action = Zone.Constants.H_ZONE_SUCCESS,
        Data = {
            Store = Zone.Data.KV:dump(),
            Assets = Zone.Data.AssetManager.Assets
        }
    })
end

function Zone.Functions.zoneUpdate(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    local decodedData = Zone.Functions.decodeMessageData(msg.Data)

    if not decodedData.success then
        Zone.Functions.sendError(msg.From, 'Invalid Data')
        return
    end

    local entries = decodedData.data
    if entries and #entries then
        for _, entry in ipairs(entries) do
            if entry.key and entry.value then
                local updateType = msg.UpdateType or 'Add-Or-Update'
                if updateType == 'Add-Or-Update' then
                    Zone.Data.KV:set(entry.key, entry.value)
                elseif updateType == 'Remove' then
                    Zone.Data.KV:remove(entry.key)
                end
            end
        end
        ao.send({ Target = msg.From, Action = Zone.Constants.H_ZONE_SUCCESS })
        Subscribable.notifySubscribers(Zone.Constants.H_ZONE_UPDATE, { UpdateTx = msg.Id })
    end
end

function Zone.Functions.creditNotice(msg)
    Zone.Data.AssetManager:update({
        Type = 'Add',
        AssetId = msg.From,
        Timestamp = msg.Timestamp
    })
end

function Zone.Functions.debitNotice(msg)
    Zone.Data.AssetManager:update({
        Type = 'Remove',
        AssetId = msg.From,
        Timestamp = msg.Timestamp
    })
end

function Zone.Functions.runAction(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    if not msg.ForwardTo or not msg.ForwardAction then
        ao.send({
            Target = msg.From,
            Action = 'Input-Error',
            Tags = {
                Status = 'Error',
                Message = 'Invalid arguments, required { ForwardTo, ForwardAction }'
            }
        })
        return
    end

    ao.send({
        Target = msg.ForwardTo,
        Action = msg.ForwardAction,
        Data = msg.Data,
        Tags = msg.Tags
    })
end

function Zone.Functions.setHandler(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    local path = msg.Tags.Path or ""
    local decodedData = Zone.Functions.decodeMessageData(msg.Data)
    if not decodedData.success or not decodedData.data then
        Zone.Functions.sendError(msg.From, 'Invalid Data')
        return
    end

    Zone.Data.KV:set(path, decodedData.data)
    msg.reply({ Target = msg.From, Action = Zone.Constants.H_ZONE_SUCCESS })
end

function Zone.Functions.appendHandler(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    local path = msg.Tags.Path or ""
    local decodedData = Zone.Functions.decodeMessageData(msg.Data)

    if not decodedData.success or not decodedData.data then
        Zone.Functions.sendError(msg.From, 'Invalid Data')
        return
    end

    Zone.Data.KV:append(path, decodedData.data)
    msg.reply({ Target = msg.From, Action = Zone.Constants.H_ZONE_SUCCESS })
end

function Zone.Functions.removeHandler(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    local path = msg.Tags.Path or ""
    if path == "" then
        Zone.Functions.sendError(msg.From, 'Invalid Path: Path required to remove')
        return
    end

    Zone.Data.KV:remove(path)
    msg.reply({ Target = msg.From, Action = Zone.Constants.H_ZONE_SUCCESS })
end

function Zone.Functions.keysHandler(msg)
    if not Zone.Functions.isAuthorized(msg) then
        Zone.Functions.sendError(msg.From, 'Not Authorized')
        return
    end

    local path = msg.Tags.Path or nil
    local keys = Zone.Data.KV:keys(path)

    msg.reply({
        Target = msg.From,
        Action = Zone.Constants.H_ZONE_SUCCESS,
        Data = { Keys = keys }
    })
end

-- Handler Registration
Handlers.add(Zone.Constants.H_ZONE_GET, Zone.Constants.H_ZONE_GET, Zone.Functions.zoneGet)
Handlers.add(Zone.Constants.H_ZONE_UPDATE, Zone.Constants.H_ZONE_UPDATE, Zone.Functions.zoneUpdate)
Handlers.add(Zone.Constants.H_ZONE_CREDIT_NOTICE, Zone.Constants.H_ZONE_CREDIT_NOTICE, Zone.Functions.creditNotice)
Handlers.add(Zone.Constants.H_ZONE_DEBIT_NOTICE, Zone.Constants.H_ZONE_DEBIT_NOTICE, Zone.Functions.debitNotice)
Handlers.add(Zone.Constants.H_ZONE_RUN_ACTION, Zone.Constants.H_ZONE_RUN_ACTION, Zone.Functions.runAction)
Handlers.add(Zone.Constants.H_ZONE_SET, Zone.Constants.H_ZONE_SET, Zone.Functions.setHandler)
Handlers.add(Zone.Constants.H_ZONE_APPEND, Zone.Constants.H_ZONE_APPEND, Zone.Functions.appendHandler)
Handlers.add(Zone.Constants.H_ZONE_REMOVE, Zone.Constants.H_ZONE_REMOVE, Zone.Functions.removeHandler)
Handlers.add(Zone.Constants.H_ZONE_KEYS, Zone.Constants.H_ZONE_KEYS, Zone.Functions.keysHandler)

-- Register-Whitelisted-Subscriber
-- Looks for Tag: Subscriber-Process-Id = <registry_id>
Handlers.add('Register-Whitelisted-Subscriber', 'Register-Whitelisted-Subscriber',
    Subscribable.handleRegisterWhitelistedSubscriber)

Subscribable.configTopicsAndChecks({
    [Zone.Constants.H_ZONE_UPDATE] = {
        description = 'Zone updated',
        returns = '{ "UpdateTx" : string }',
        subscriptionBasis = 'Whitelisting'
    },
})

-- Boot Initialization
if #Inbox >= 1 and Inbox[1]["On-Boot"] ~= nil then
    local collectedValues = {}
    for _, tag in ipairs(Inbox[1].TagArray) do
        local prefix = "Bootloader-"
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
        if #values == 1 then
            Zone.Data.KV:set(key, values[1])
        else
            Zone.Data.KV:set(key, values)
        end
    end
end

if not ZoneInitCompleted then
    ZoneInitCompleted = true
end

return Zone
