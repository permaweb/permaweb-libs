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

local Subscribable = require 'subscribable'({ useDB = false })

Zone = Zone or {}
Zone.zoneKV = Zone.zoneKV or KV.new({ BatchPlugin })
Zone.assetManager = Zone.assetManager or AssetManager.new()
ZoneInitCompleted = ZoneInitCompleted or false


-- Action handler and notice names
Zone.H_ZONE_ERROR = 'Zone.Error'
Zone.H_ZONE_SUCCESS = 'Zone.Success'
Zone.H_ZONE_GET = 'Info'
Zone.H_ZONE_UPDATE = 'Update-Zone'
Zone.H_ZONE_CREDIT_NOTICE = 'Credit-Notice'
Zone.H_ZONE_DEBIT_NOTICE = 'Debit-Notice'
Zone.H_ZONE_RUN_ACTION = 'Run-Action'

-- Utility Functions
function Zone.decodeMessageData(data)
    local status, decodedData = pcall(json.decode, data)
    if not status or type(decodedData) ~= 'table' then
        return { valid=false, data=nil }
    end

    return { valid=true, data=decodedData }
end

function Zone.isAuthorized(msg)
    return msg.From == Owner or msg.From == ao.id
end

function Zone.sendError(target, errorMessage)
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
function Zone.zoneGet(msg)
    msg.reply({
        Target = msg.From,
        Action = Zone.H_ZONE_SUCCESS,
        Data = {
            Store = Zone.zoneKV:dump(),
            Assets = Zone.assetManager.assets
        }
    })
end

function Zone.zoneUpdate(msg)
    if not Zone.isAuthorized(msg) then
        Zone.sendError(msg.From, 'Not Authorized')
        return
    end

    local decodedData = Zone.decodeMessageData(msg.Data)

    if not decodedData.valid then
        Zone.sendError(msg.From, 'Invalid Data')
        return
    end

    local entries = decodedData.data and decodedData.data.entries
    if entries and #entries then
        for _, entry in ipairs(entries) do
            if entry.key and entry.value then
                local updateType = msg.UpdateType or 'Add-Or-Update'
                if updateType == 'Add-Or-Update' then
                    Zone.zoneKV:set(entry.key, entry.value)
                end
                if updateType == 'Remove' then
                    Zone.zoneKV:del(entry.key)
                end
            end
        end
        ao.send({ Target = msg.From, Action = Zone.H_ZONE_SUCCESS })
        Subscribable.notifySubscribers(Zone.H_ZONE_UPDATE, { UpdateTx = msg.Id })
    end
end

function Zone.creditNotice(msg)
    Zone.assetManager:update({
        Type = 'Add',
        AssetId = msg.From,
        Timestamp = msg.Timestamp
    })
end

function Zone.debitNotice(msg)
    Zone.assetManager:update({
        Type = 'Remove',
        AssetId = msg.From,
        Timestamp = msg.Timestamp
    })
end

function Zone.runAction(msg)
    if not Zone.isAuthorized(msg) then
        Zone.sendError(msg.From, 'Not Authorized')
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

-- Handler Registration
Handlers.add(Zone.H_ZONE_GET, Zone.H_ZONE_GET, Zone.zoneGet)
Handlers.add(Zone.H_ZONE_UPDATE, Zone.H_ZONE_UPDATE, Zone.zoneUpdate)
Handlers.add(Zone.H_ZONE_CREDIT_NOTICE, Zone.H_ZONE_CREDIT_NOTICE, Zone.creditNotice)
Handlers.add(Zone.H_ZONE_DEBIT_NOTICE, Zone.H_ZONE_DEBIT_NOTICE, Zone.debitNotice)
Handlers.add(Zone.H_ZONE_RUN_ACTION, Zone.H_ZONE_RUN_ACTION, Zone.runAction)

-- Register-Whitelisted-Subscriber
-- looks for Tag: Subscriber-Process-Id = <registry_id>
Handlers.add(
        'Register-Whitelisted-Subscriber',
        Handlers.utils.hasMatchingTag('Action', 'Register-Whitelisted-Subscriber'),
        Subscribable.handleRegisterWhitelistedSubscriber
)

Subscribable.configTopicsAndChecks({
    [Zone.H_ZONE_UPDATE] = {
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
            Zone.zoneKV:set(key, values[1])
        else
            Zone.zoneKV:set(key, values)
        end
    end
end

if not ZoneInitCompleted then
    ZoneInitCompleted = true
end

return Zone
