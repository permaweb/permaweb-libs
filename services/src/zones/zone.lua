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

Zone.ACTIONS = Zone.ACTIONS or {
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
    H_ZONE_RUN_ACTION = 'Run-Action',
    H_ADD_UPLOAD = 'Add-Upload',
    H_ZONE_ROLE_UPDATE = 'Update-Role'
}

Zone.ROLE_NAMES = Zone.ROLE_NAMES or {
    OWNER = 'Owner',
    ADMIN = 'Admin',
    CONTRIBUTOR = 'Contributor',
    MODERATOR = 'Moderator'
}

HandlerRoles = HandlerRoles or {
        [Zone.ACTIONS.H_ZONE_ROLE_UPDATE] = { 'Owner' }, -- could allow admin if specifically limit removing owner roles
        [Zone.ACTIONS.H_ZONE_UPDATE] = { 'Owner', 'Admin' },
        [Zone.ACTIONS.H_ADD_UPLOAD] = { 'Owner', 'Admin', 'Contributor' }
        --['Transfer'] = {'Owner', 'Admin'},
        --['Debit-Notice'] = {'Owner', 'Admin'},
        --['Credit-Notice'] = {'Owner', 'Admin'},
        --['Action-Response'] = {'Owner', 'Admin'},
        --['Run-Action'] = {'Owner', 'Admin'},
        --['Proxy-Action'] = {'Owner', 'Admin'},
        --['Update-Role'] = {'Owner', 'Admin'}
    }

-- Roles: { Id, Role } []
if not Roles then
    Roles = {}
end

function Zone.Functions.isAuthorized(msg)
    -- If Roles is blank, the initial call should be from the owner
    if msg.From ~= Owner and msg.From ~= ao.id and #Roles == 0 then
        return false, "Not Authorized"
    end
    local rolesForHandler = HandlerRoles[msg.Action]
    if not rolesForHandler then
        return msg.From == Owner or false, "AuthRoles: Sender " .. msg.From .. " not Authorized. Only Owner can access the handler " .. msg.Action
    end

    local actorRole

    for _, role in pairs(Roles) do
        if role.Id == msg.From then
            actorRole = role.Role
            break
        end
    end

    if not actorRole then
        if msg.From == Owner then
            -- If Roles table is empty or owner doesn't exist, authorize the owner
            table.insert(Roles, { Role = Zone.ROLE_NAMES.OWNER, Id = msg.From })
            return true
        else
            return false, "AuthRoles: " .. msg.From .. " Not Authorized"
        end
    else
        -- now check if the role is allowed to access the handler if msg.From isn't Owner
        local authorized = false
        for _, role in pairs(rolesForHandler) do
            if role == actorRole then
                return true
            end
        end

        if not authorized then
            return false, "AuthRoles: Sender " .. msg.From .. " not Authorized."
        end
    end

    return false, "AuthRoles: Sender " .. msg.From .. " not Authorized."
end

Zone.Data = Zone.Data or {
    KV = KV.new({ BatchPlugin }),
    AssetManager = AssetManager.new({ authFn = Zone.Functions.isAuthorized })
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
        Action = Zone.ACTIONS.H_ZONE_SUCCESS,
        Data = {
            Store = Zone.Data.KV:dump(),
            Assets = Zone.Data.AssetManager.Assets
        }
    })
end

function Zone.Functions.zoneUpdate(msg)
    authorized, message = Zone.Functions.isAuthorized(msg)
    if not authorized then
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
        ao.send({ Target = msg.From, Action = Zone.ACTIONS.H_ZONE_SUCCESS })
        Subscribable.notifySubscribers(Zone.ACTIONS.H_ZONE_UPDATE, { UpdateTx = msg.Id })
    end
end

function Zone.Functions.zoneRoleUpdate(msg)
    local function check_valid_address(address)
        if not address or type(address) ~= 'string' then
            return false
        end
        return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
    end

    local function check_valid_role(role, op)
        if op == 'Delete' then
            return true
        end
        if not role or type(role) ~= 'string' then
            return false
        end
        return role == 'Admin' or role == 'Contributor' or role == 'Moderator' or role == 'Owner'
    end

    local authorized, message = Zone.Functions.isAuthorized(msg)
    if not authorized then
        Zone.Functions.sendError(msg.From, message)
        return
    end
    local decodeResult = Zone.Functions.decodeResult(msg.Data)

    if decodeResult.success and decodeResult.data then
        local Id = decodeResult.data.Id or msg.Tags.Id
        local Role = decodeResult.data.Role or msg.Tags.Role
        local Op = decodeResult.data.Op or msg.Tags.Op
        if not Id or not Op then
            ao.send({
                Target = msg.From,
                Action = 'Input-Error',
                Tags = {
                    Status = 'Error',
                    Message = 'Invalid arguments, required { Id, Op } in data or tags'
                }
            })
            return
        end

        if not check_valid_address(Id) then
            Zone.Functions.sendError(msg.From, 'Id must be a valid address')
            return
        end

        if not check_valid_role(Role, Op) then
            Zone.Functions.sendError(msg.From, 'Role must be one of "Admin", "Contributor", "Moderator", "Owner"')
            return
        end

        -- Add, update, or remove role
        local role_index = -1
        local current_role
        for i, role in ipairs(Roles) do
            if role.Id == Id then
                role_index = i
                current_role = role.Role
                break
            end
        end

        if role_index == -1 then
            if (Op == 'Add') then
                table.insert(Roles, { Id = Id, Role = Role })
            else
                Zone.Functions.sendError(msg.From, 'Role Op not possible, role does not exist to delete or update')
                return
            end
        else
            if Op == 'Delete' and current_role ~= 'Owner' then
                table.remove(Roles, role_index)
            elseif Op == "Update" then
                Roles[role_index].Role = Role
            end
        end

        ao.send({
            Target = msg.From,
            Action = Zone.ACTIONS.H_ZONE_SUCCESS,
            Tags = {
                Status = 'Success',
                Message = 'Role updated'
            }
        })
    else
        Zone.Functions.sendError(msg.From, string.format(
                'Failed to parse role update data, received: %s. %s.', msg.Data,
                'Data must be an object - { Id, Op, Role }'))
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
    msg.reply({ Target = msg.From, Action = Zone.ACTIONS.H_ZONE_SUCCESS })
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
    msg.reply({ Target = msg.From, Action = Zone.ACTIONS.H_ZONE_SUCCESS })
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
    msg.reply({ Target = msg.From, Action = Zone.ACTIONS.H_ZONE_SUCCESS })
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
        Action = Zone.ACTIONS.H_ZONE_SUCCESS,
        Data = { Keys = keys }
    })
end

-- Handler Registration
Handlers.add(Zone.ACTIONS.H_ZONE_GET, Zone.ACTIONS.H_ZONE_GET, Zone.Functions.zoneGet)
Handlers.add(Zone.ACTIONS.H_ZONE_UPDATE, Zone.ACTIONS.H_ZONE_UPDATE, Zone.Functions.zoneUpdate)
Handlers.add(Zone.ACTIONS.H_ZONE_CREDIT_NOTICE, Zone.ACTIONS.H_ZONE_CREDIT_NOTICE, Zone.Functions.creditNotice)
Handlers.add(Zone.ACTIONS.H_ZONE_DEBIT_NOTICE, Zone.ACTIONS.H_ZONE_DEBIT_NOTICE, Zone.Functions.debitNotice)
Handlers.add(Zone.ACTIONS.H_ZONE_RUN_ACTION, Zone.ACTIONS.H_ZONE_RUN_ACTION, Zone.Functions.runAction)
Handlers.add(Zone.ACTIONS.H_ZONE_SET, Zone.ACTIONS.H_ZONE_SET, Zone.Functions.setHandler)
Handlers.add(Zone.ACTIONS.H_ZONE_APPEND, Zone.ACTIONS.H_ZONE_APPEND, Zone.Functions.appendHandler)
Handlers.add(Zone.ACTIONS.H_ZONE_REMOVE, Zone.ACTIONS.H_ZONE_REMOVE, Zone.Functions.removeHandler)
Handlers.add(Zone.ACTIONS.H_ZONE_KEYS, Zone.ACTIONS.H_ZONE_KEYS, Zone.Functions.keysHandler)
Handlers.add(Zone.ACTIONS.H_ZONE_ROLE_UPDATE, Zone.ACTIONS.H_ZONE_ROLE_UPDATE, Zone.Functions.zoneRoleUpdate)

-- Register-Whitelisted-Subscriber
-- Looks for Tag: Subscriber-Process-Id = <registry_id>
Handlers.add('Register-Whitelisted-Subscriber', 'Register-Whitelisted-Subscriber',
        Subscribable.handleRegisterWhitelistedSubscriber)

Subscribable.configTopicsAndChecks({
    [Zone.ACTIONS.H_ZONE_UPDATE] = {
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
