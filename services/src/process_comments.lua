local json = require('json')

Comments = Comments or {}

AuthUsers = AuthUsers or {}

local function isAuthorized(addr)
    if not addr then return false end
    for _, v in ipairs(AuthUsers) do
        if v == addr then return true end
    end
    return false
end

local function getTag(msg, name)
    if not msg or not msg.TagArray then return nil end
    for _, t in ipairs(msg.TagArray) do
        if t.name == name then return t.value end
    end
    return nil
end

local function normalizeStatus(s)
    if not s then return nil end
    s = string.lower(s)
    if s == 'active' or s == 'inactive' then return s end
    return nil
end

local function findCommentIndexById(id)
    if not id or type(id) ~= 'string' then return nil end
    for i, c in ipairs(Comments) do
        if c.Id == id then return i end
    end
    return nil
end

function SyncState()
    Send({ device = 'patch@1.0', zone = json.encode(GetState()) })
end

function SyncDynamicState(key, value, opts)
    opts = opts or {}

    local data = value
    if opts.jsonEncode then data = json.encode(value) end

    Send({ device = 'patch@1.0', [key] = data })
end

Handlers.add('Get-Comments', 'Get-Comments', function(msg)
    Send({ Target = msg.From, Data = json.encode(Comments) })
end)

Handlers.add('Get-Auth-Users', 'Get-Auth-Users', function(msg)
    Send({ Target = msg.From, Data = json.encode(AuthUsers) })
end)

Handlers.add('Add-Comment', 'Add-Comment', function(msg)
    table.insert(Comments, {
        Id = msg.Id,
        Creator = msg.From,
        DateCreated = msg.Timestamp,
        Status = 'active',
        Content = msg.Data
    })

    Send({ Target = msg.From, Action = 'Add-Comment-Success' })

    SyncDynamicState('comments', Comments, { jsonEncode = true })
end)

Handlers.add('Update-Comment-Status', 'Update-Comment-Status', function(msg)
    if not isAuthorized(msg.From) then
        Send({ Target = msg.From, Action = 'Update-Comment-Status-Error', Error = 'Unauthorized' })
        return
    end

    local id = getTag(msg, 'Comment-Id')
    local idx = findCommentIndexById(id)
    if not idx then
        Send({ Target = msg.From, Action = 'Update-Comment-Status-Error', Error = 'Invalid Id', Id = tostring(id or '') })
        return
    end

    local current = Comments[idx].Status or 'active'
    local desired = normalizeStatus(getTag(msg, 'Status'))

    -- If no explicit status provided then toggle
    if not desired then
        desired = (current == 'active') and 'inactive' or 'active'
    end

    Comments[idx].Status = desired

    SyncDynamicState('comments', Comments, { jsonEncode = true })

    Send({
        Target = msg.From,
        Action = 'Update-Comment-Status-Success',
        Id = Comments[idx].Id,
        Status = desired
    })
end)

Handlers.add('Remove-Comment', 'Remove-Comment', function(msg)
    if not isAuthorized(msg.From) then
        Send({ Target = msg.From, Action = 'Remove-Comment-Error', Error = 'Unauthorized' })
        return
    end

    local id = getTag(msg, 'Comment-Id')
    local idx = findCommentIndexById(id)
    if not idx then
        Send({ Target = msg.From, Action = 'Remove-Comment-Error', Error = 'Invalid Id', Id = tostring(id or '') })
        return
    end

    local removedId = Comments[idx].Id
    table.remove(Comments, idx)

    SyncDynamicState('comments', Comments, { jsonEncode = true })

    Send({
        Target = msg.From,
        Action = 'Remove-Comment-Success',
        Id = removedId
    })
end)

local isInitialized = false

-- Boot Initialization
if not isInitialized and #Inbox >= 1 and Inbox[1]['On-Boot'] ~= nil then
    isInitialized = true

    for _, tag in ipairs(Inbox[1].TagArray) do
        if tag.name == 'Auth-Users' then
            local authUsers = json.decode(tag.value)
            for _, authUser in ipairs(authUsers) do
                table.insert(AuthUsers, authUser)
            end
        end
    end

    SyncDynamicState('users', AuthUsers, { jsonEncode = true })
end
