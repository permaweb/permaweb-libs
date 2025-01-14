local json = require('json')
local sqlite3 = require('lsqlite3')

Db = Db or sqlite3.open_memory()

-- action names
local H_ZONE_ERROR = 'Zone.Error'
local H_ZONE_SUCCESS = 'Zone.Success'
local H_GET_ZONES_USERS = "Get-Zones-For-User"
local H_GET_ZONES_METADATA = "Get-Zones-Metadata"
local H_PREPARE_DB = "Prepare-Database"
local H_INFO = "Info"
local H_NOTIFY_ON_TOPIC = "Notify-On-Topic"
local H_SUB_REG_CONFIRM = "Subscriber-Registration-Confirmation"
local H_SUB_TOP_CONFIRM = "Subscriber-Topics-Confirmation"

-- handlers to be assigned
local H_ZONE_UPDATE = 'Zone-Update'
local H_ROLE_SET = 'Role-Set'
local H_ZONE_BOOT = "Create-Zone"

local ASSIGNABLES = {
    H_ZONE_UPDATE, H_ROLE_SET, H_ZONE_BOOT }

local RELEVANT_METADATA = { "UserName", "DisplayName", "Description", "Banner", "Thumbnail", "Tags", "DateUpdated" }

if not NotifiedPending then
    NotifiedPending = {}
end

local function match_assignable_actions(a)
    for _, v in ipairs(ASSIGNABLES) do
        if a == v then
            return true
        end
    end
end

ao.addAssignable("AssignableActions", { Action = function(a)
    return match_assignable_actions(a)
end })

local function isInArray(table, value)
    for _, v in ipairs(table) do
        if v == value then
            return true
        end
    end
    return false
end

local function decode_message_data(data)
    local status, decoded_data = pcall(json.decode, data)
    if not status or type(decoded_data) ~= 'table' then
        return false, nil
    end
    return true, decoded_data
end

local function cleanPending()
    local newPending = {}
    local now = os.time()
    for _, pending in ipairs(NotifiedPending) do
        -- pending: { UpdateTx = "abc", Timestamp = os.time() }
        if now - pending.Timestamp < 300000 then
            table.insert(newPending, pending)
        end
    end
    NotifiedPending = newPending
end

local function removePendingId(id)
    local newPending = {}
    local found = false
    for _, pending in ipairs(NotifiedPending) do
        if pending.UpdateTx == id then
            found = true
        else
            table.insert(newPending, pending)
        end
    end
    NotifiedPending = newPending
    return found
end

-- For any update that preauthorizes an incoming assignment
local function handle_notified_update(msg)
    local decode_check, data = decode_message_data(msg.Data)
    if not decode_check then
        --ao.send({
        --    Target = msg.From,
        --    Action = 'H_ZONE_ERROR',
        --    Data = { Message = "Failed to decode data" }
        --})

        -- fail silently
        return
    end

    local updateTx = data["UpdateTx"];
    if not updateTx then
        --ao.send({
        --    Target = msg.From,
        --    Action = 'H_ZONE_ERROR',
        --    Data = { Message = "No UpdateTx found" }
        --})

        -- fail silently
        return
    end
    table.insert(NotifiedPending, { UpdateTx = updateTx, Timestamp = os.time() })
    -- assign the txid containing the "Update-Zone" action
    ao.assign({
        Message = updateTx,
        Processes = {
            ao.id
        }
    })
end

-- get notification on topic, check topic, and send to handler
local function handle_notified(msg)
    print(msg.Tags.Topic)
    cleanPending()
    if msg.Tags.Topic == H_ZONE_UPDATE then
        handle_notified_update(msg)
    end
    -- we can use this for any update that triggers an assigned message
    if msg.Tags.Topic == H_ROLE_SET then
        handle_notified_update(msg)
    end
end

-- init a zone from spawn msg using tags
local function handle_boot_zone(msg)

    local ZoneId = msg.Id -- create = msg.Id spawn
    local UserId = msg.From -- (assigned) -- AuthorizedAddress

    local check = Db:prepare('SELECT 1 FROM zone_users WHERE user_id = ? AND zone_id = ? LIMIT 1')
    check:bind_values(UserId, ZoneId)
    if check:step() ~= sqlite3.ROW then
        local insert_auth = Db:prepare(
                'INSERT INTO zone_users (zone_id, user_id) VALUES (?, ?)')
        insert_auth:bind_values(ZoneId, UserId)
        insert_auth:step()
        insert_auth:finalize()
    else
        ao.send({
            Target = reply_to,
            Action = 'Zone-Create-Notice',
            Data = { Status = H_ZONE_ERROR,
                     Message = "Zone already found, cannot insert",
                     Code = "INSERT_FAILED" }
        })
        return
    end

    -- for each tag starting with "bootloader-", populate metadataValues
    local columns = {}
    local placeholders = {}
    local params = {}
    local metadataValues = {}

    -- extract Tags array, other metadata
    for _, tag in msg.Tags do
        local zoneTags = {}
        if string.match(tag, "Bootloader-") then
            -- strip "bootloader-" from tag
            local cleanedTag = string.sub(tag, 12)
            if (isInArray(RELEVANT_METADATA, cleanedTag)) then
                if (cleanedTag == "Tags") then
                    table.insert(zoneTags, tag.value)
                else
                    metadataValues[cleanedTag] = tag.value
                end
            end
        end
        metadataValues["Tags"] = json.encode(zoneTags)
    end

    local function generateInsertQuery()
        for key, val in pairs(metadataValues) do
            if val ~= nil then
                -- Include the field if provided
                table.insert(columns, key)
                if val == "" then
                    -- If the field is an empty string, insert NULL
                    table.insert(placeholders, "NULL")
                else
                    -- Otherwise, prepare to bind the actual value
                    table.insert(placeholders, "?")
                    table.insert(params, val)
                end
            else
                -- If field is nil and not mandatory, insert NULL
                if key ~= "id" then
                    table.insert(columns, key)
                    table.insert(placeholders, "NULL")
                end
            end
        end

        local sql = "INSERT INTO ao_zone_metadata (" .. table.concat(columns, ", ") .. ")"
        sql = sql .. " VALUES (" .. table.concat(placeholders, ", ") .. ")"

        return sql
    end
    local sql = generateInsertQuery()
    local stmt = Db:prepare(sql)

    if not stmt then
        ao.send({
            Target = reply_to,
            Action = 'DB_CODE',
            Data = { Code = "Failed to prepare insert statement",
                     SQL = sql,
                     ERROR = Db:errmsg(),
                     Status = 'DB_PREPARE_FAILED',
                     Message = "DB PREPARED QUERY FAILED"
            }
        })
        print("Failed to prepare insert statement")
    end

    -- bind values for INSERT statement
    local bindres = stmt:bind_values(table.unpack(params))

    if not bindres then
        ao.send({
            Target = reply_to,
            Action = 'Zone-Create-Notice',
            Tags = {
                Status = 'DB_PREPARE_FAILED',
                Message = "DB BIND QUERY FAILED"
            },
            Data = { Code = "Failed to prepare insert statement",
                     SQL = sql,
                     ERROR = Db:errmsg()
            }
        })
        print("Failed to prepare insert statement")
        return json.encode({ Code = 'DB_PREPARE_FAILED' })
    end
    local step_status = stmt:step()

    if step_status ~= sqlite3.OK and step_status ~= sqlite3.DONE and step_status ~= sqlite3.ROW then
        stmt:finalize()
        print("Error: " .. Db:errmsg())
        print("SQL" .. sql)
        ao.send({
            Target = reply_to,
            Action = 'DB_STEP_CODE',
            Tags = {
                Status = 'ERROR',
                Message = 'sqlite step error'
            },
            Data = { DB_STEP_MSG = step_status }
        })
        return json.encode({ Code = step_status })
    end
    stmt:finalize()
    print('db prepared')
    ao.send({
        Target = reply_to,
        Action = 'Success',
        Tags = {
            Status = 'Success',
            Message = is_update and 'Record Updated' or 'Record Inserted'
        },
        Data = json.encode(metadataValues)
    })

end

local function handle_prepare_db(msg)
    if msg.From ~= Owner and msg.From ~= ao.id then
        ao.send({
            Target = msg.From,
            Action = 'Authorization-Error',
            Tags = {
                Status = 'Error',
                Message = 'Unauthorized to access this handler'
            }
        })
        return
    end
    Db:exec [[
                CREATE TABLE IF NOT EXISTS ao_zone_metadata (
                    id TEXT PRIMARY KEY NOT NULL,
                    username TEXT,
                    display_name TEXT,
                    description TEXT,
                    thumbnail TEXT,
                    banner TEXT,
                    tags TEXT,
                    date_updated INTEGER NOT NULL
                );
            ]]

    Db:exec [[
                CREATE TABLE IF NOT EXISTS zone_users (
                    zone_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    PRIMARY KEY (zone_id, user_id)
                    FOREIGN KEY (zone_id) REFERENCES ao_zone_metadata (id) ON DELETE CASCADE
                );
            ]]

    Db:exec [[
        CREATE INDEX IF NOT EXISTS idx_zone_id ON zone_users (zone_id);
        CREATE INDEX IF NOT EXISTS idx_user_id ON zone_users (user_id);
    ]]

    print("db prepared")
    ao.send({
        Target = Owner,
        Action = 'DB-Init-Success',
        Tags = {
            Status = 'Success',
            Message = 'Created DB'
        }
    })
end

local function handle_meta_get(msg)
    local decode_check, data = decode_message_data(msg.Data)
    local reply_to = ao.id
    print("after decode")
    if decode_check and data then
        if not data.ZoneIds then
            ao.send({
                Target = reply_to,
                Action = 'Input-Error',
                Tags = {
                    Status = 'Error',
                    Message = 'Invalid arguments, required { ProfileIds }'
                },
                Data = msg.Data
            })
            return
        end

        local metadata = {}
        if #data.ZoneIds > 0 then
            local placeholders = {}

            for _, _ in ipairs(data.ZoneIds) do
                table.insert(placeholders, "?")
            end

            if #placeholders > 0 then
                local stmt = Db:prepare([[
                        SELECT *
                        FROM ao_zone_metadata
                        WHERE id IN (]] .. table.concat(placeholders, ',') .. [[)
                        ]])

                if not stmt then
                    ao.send({
                        Target = reply_to,
                        Action = 'DB_CODE',
                        Tags = {
                            Status = 'DB_PREPARE_FAILED',
                            Message = "DB PREPARED QUERY FAILED"
                        },
                        Data = { Code = "Failed to prepare query statement" }
                    })
                    print("Failed to prepare query statement")
                    return json.encode({ Code = 'DB_PREPARE_FAILED' })
                end

                print(data.ZoneIds[1])
                stmt:bind_values(table.unpack(data.ZoneIds))

                local foundRows = false
                for row in stmt:nrows() do
                    foundRows = true
                    table.insert(metadata, { ZoneId = row.id,
                                             Username = row.username,
                                             Thumbnail = row.thumbnail,
                                             Banner = row.banner,
                                             Description = row.description,
                                             DisplayName = row.display_name,
                                             Tags = row.tags and json.decode(row.tags) or nil,
                                             DateUpdated = row.date_updated,
                    })
                end

                if not foundRows then
                    print('No rows found matching the criteria.')
                end

                ao.send({
                    Target = reply_to,
                    Action = 'Get-Metadata-Success',
                    Tags = {
                        Status = 'Success',
                        Message = 'Metadata retrieved',
                    },
                    Data = json.encode(metadata)
                })
            else
                print('Profile ID list is empty after validation.')
            end
        else
            ao.send({
                Target = reply_to,
                Action = 'Input-Error',
                Tags = {
                    Status = 'Error',
                    Message = 'No ZoneIds provided or the list is empty.'
                }
            })
            print('No ZoneIds provided or the list is empty.')
            return

        end
    else
        ao.send({
            Target = reply_to,
            Action = 'Input-Error',
            Tags = {
                Status = 'Error',
                Message = string.format(
                        'Failed to parse data, received: %s. %s.', msg.Data,
                        'Data must be an object - { ZoneIds }')
            }
        })
    end
end

local function handle_role_set(msg)
    local reply_to = ao.id
    local decode_check, data = decode_message_data(msg.Data)
    -- data.entries may contain {"UserName":"x", ...etc}

    local function check_valid_roles(roles)
        -- nil is ok
        if not roles then
            return true
        end

        -- empty table is ok
        if #roles == 0 then
            return true
        end

        -- just make sure roles table is strings {}
        for _, role in ipairs(roles) do
            if type(role) ~= 'string' then
                return false
            end
        end
        return true
    end

    if not decode_check then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = 'DECODE_FAILED',
                     Message = "Failed to decode data", Code = "DECODE_FAILED" }
        })
        return
    end
    if not data.id or type(data.id) ~= 'string' then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = "BAD_DATA",
                     Message = "data.id missing" }
        })
        return
    end

    if type(data.roles) ~= 'nil' and type(data.roles) ~= 'table' then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = "BAD_DATA",
                     Message = "data.roles invalid" }
        })
        return
    end

    if not check_valid_roles(data.roles) then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = "BAD_DATA",
                     Message = "data.roles must be a table of strings or empty table or nil" }
        })
        return
    end

    -- make sure msg.Id is in NotifiedPending from Zone
    -- if NotifiedPending has msg.Id then
    -- remove msg.Id from NotifiedPending and continue.
    -- removed =
    if not removePendingId(msg.Id) then
        print("could not remove pending")
        -- did not find notification confirmation from zone for this update
        return
    end

    local ZoneId = msg.Target -- Is this original target? confirm.
    local UserId = data.id -- (assigned) -- AuthorizedAddress
    -- now if roles is nil, remove the user from the zone

    local hasEntry = false

    local check = Db:prepare('SELECT 1 FROM zone_users WHERE user_id = ? AND zone_id = ? LIMIT 1')
    check:bind_values(UserId, ZoneId)
    local checkStepped, err = check:step()
    if err then
        print(Db:errmsg())
    end
    if checkStepped == sqlite3.ROW then
        hasEntry = true;
    end
    print(tostring(checkStepped))
    check:finalize()

    if not data.roles then
        if hasEntry then
            print("has entry")
            local delete_auth = Db:prepare(
                    'DELETE FROM zone_users WHERE zone_id = ? AND user_id = ?')
            delete_auth:bind_values(ZoneId, UserId)
            delete_auth:step()
            delete_auth:finalize()
        end
        return
    else
        if not hasEntry then
            local insert_auth = Db:prepare(
                    'INSERT INTO zone_users (zone_id, user_id) VALUES (?, ?)')
            insert_auth:bind_values(ZoneId, UserId)
            local insertStepped, insertErr = insert_auth:step()
            if insertErr then
                print(Db:errmsg())
            end
            print(tostring(insertStepped))
            insert_auth:finalize()
        end
        return
    end
end
-- assignment of message from authorized wallet to zone_id
local function handle_meta_set(msg)
    local reply_to = ao.id
    local decode_check, data = decode_message_data(msg.Data)
    -- data.entries may contain {"UserName":"x", ...etc}

    if not decode_check then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = 'DECODE_FAILED',
                     Message = "Failed to decode data", Code = "DECODE_FAILED" }
        })
        return
    end
    if not data.entries or #data.entries < 1 then
        ao.send({
            Target = reply_to,
            Action = H_ZONE_ERROR,
            Data = { Status = "BAD_QUERY",
                     Message = "data.entries contains no zone ids" }
        })
        return
    end

    local entries = data.entries

    -- make sure msg.Id is in NotifiedPending from Zone
    -- if NotifiedPending has msg.Id then
    -- remove msg.Id from NotifiedPending and continue.
    -- removed =
    if not removePendingId(msg.Id) then
        print("could not remove pending")
        -- did not find notification confirmation from zone for this update
        return
    end

    local ZoneId = msg.Target -- Is this original target? confirm.
    local UserId = msg.From -- (assigned) -- AuthorizedAddress

    local check = Db:prepare('SELECT 1 FROM zone_users WHERE user_id = ? AND zone_id = ? LIMIT 1')
    check:bind_values(UserId, ZoneId)
    if check:step() ~= sqlite3.ROW then
        print("inserting users")
        local insert_auth = Db:prepare(
                'INSERT INTO zone_users (zone_id, user_id) VALUES (?, ?)')
        insert_auth:bind_values(ZoneId, UserId)
        insert_auth:step()
        insert_auth:finalize()
    end

    local columns = {}
    local placeholders = {}
    local params = {}

    local metadataKeysMap = {
        UserName = "username",
        Thumbnail = "thumbnail",
        Banner = "banner",
        Description = "description",
        Tags = "tags",
        DisplayName = "display_name",
        DateUpdated = "date_updated"
    }
    local metadataValues = { id = ZoneId}
    --local metadataValues = {
    --    username = entries.UserName or nil,
    --    thumbnail = entries.Thumbnail or nil,
    --    banner = entries.Banner or nil,
    --    description = entries.Description or nil,
    --    tags = entries.Tags and json.encode(entries.Tags) or nil,
    --    display_name = entries.DisplayName or nil,
    --    date_updated = entries.DateUpdated and tonumber(entries.DateUpdated) or os.time()
    --}


    -- for each tuple in data.entries if it mathes relevant metadata, add it to metadataValues
    for _, item in ipairs(entries) do
        if isInArray(RELEVANT_METADATA, item.key) then
            metadataValues[metadataKeysMap[item.key]] = item.value
        end
    end

    local function generateUpdateQuery(m)
        -- first create setclauses for everything but id
        --    print(m.username .. m.thumbnail)
        for key, val in pairs(m) do
            if val ~= nil then
                -- Include the field if provided
                -- define columns
                table.insert(columns, key)
                -- provide placeholders or null
                if val == "" then
                    -- If the field is an empty string, insert NULL
                    table.insert(placeholders, "NULL")
                else
                    -- Otherwise, prepare to bind the actual value
                    table.insert(placeholders, "?")
                    table.insert(params, val)
                end
            end
        end

        print("updating meta " .. table.concat(columns, ', ') .. table.concat(placeholders, ", "))
        local sql = "INSERT OR REPLACE INTO ao_zone_metadata (" .. table.concat(columns, ", ") .. ")"
        sql = sql .. " VALUES (" .. table.concat(placeholders, ", ") .. ")"
        -- (key, key, key ..)

        return sql
    end
    local sql = generateUpdateQuery(metadataValues)
    local stmt = Db:prepare(sql)
    print(sql)
    if not stmt then
        ao.send({
            Target = reply_to,
            Action = 'DB_CODE',
            Tags = {
                Status = 'DB_PREPARE_FAILED',
                Message = "DB PREPARED QUERY FAILED"
            },
            Data = { Code = "Failed to prepare update statement",
                     SQL = sql,
                     ERROR = Db:errmsg()
            }
        })
        print("Failed to prepare update statement")
        return json.encode({ Code = 'DB_PREPARE_FAILED' })
    end

    stmt:bind_values(table.unpack(params))

    local step_status = stmt:step()
    if step_status ~= sqlite3.OK and step_status ~= sqlite3.DONE and step_status ~= sqlite3.ROW then
        stmt:finalize()
        print("Error: " .. Db:errmsg())
        print("SQL" .. sql)
        ao.send({
            Target = reply_to,
            Action = 'DB_STEP_CODE',
            Tags = {
                Status = H_ZONE_ERROR,
                Message = 'sqlite step error'
            },
            Data = { DB_STEP_MSG = step_status }
        })
        return json.encode({ Code = step_status })
    end
    print('added metadata')
    stmt:finalize()
    ao.send({
        Target = zone_id,
        Action = 'Success',
        Tags = {
            Status = 'Success',
            Message = 'Metadata Record Success'
        },
        Data = json.encode({ ZoneId = zone_id, DelegateAddress = Id })
    })
    return
end

Handlers.add(H_PREPARE_DB, Handlers.utils.hasMatchingTag('Action', H_PREPARE_DB),
        handle_prepare_db)

-- Data - { [Address: {} | Addresses: {} ] }
Handlers.add(H_GET_ZONES_USERS, Handlers.utils.hasMatchingTag('Action', H_GET_ZONES_USERS),
        function(msg)
            local decode_check, data = decode_message_data(msg.Data)

            if decode_check and data then
                if not data.Address and not data.Addresses then
                    ao.send({
                        Target = msg.From,
                        Action = 'Input-Error',
                        Tags = {
                            Status = 'Error',
                            Message = 'Invalid arguments, required { Address }'
                        }
                    })
                    return
                end
                local associated_zones = {}
                if data.Addresses then
                    -- do WHERE IN
                    local placeholders = {}
                    for _, _ in ipairs(data.Addresses) do
                        table.insert(placeholders, "?")
                    end

                    if #placeholders > 0 then
                        local query = Db:prepare([[
                        SELECT *
                        FROM zone_users
                        WHERE user_id IN (]] .. table.concat(placeholders, ',') .. [[)
                        ]])

                        if not query then
                            ao.send({
                                Target = msg.From,
                                Action = 'DB_CODE',
                                Tags = {
                                    Status = 'DB_PREPARE_FAILED',
                                    Message = "DB PREPARED QUERY FAILED"
                                },
                                Data = { Code = "Failed to prepare query statement" }
                            })
                            print("Failed to prepare query statement")
                            return json.encode({ Code = 'DB_PREPARE_FAILED' })
                        end

                        query:bind_values(table.unpack(data.Addresses))
                        local foundRows = false
                        for row in query:nrows() do
                            foundRows = true
                            table.insert(associated_zones, {
                                ZoneId = row.zone_id,
                                Address = row.user_id
                            })
                        end

                        if not foundRows then
                            print('No rows found matching the criteria.')
                            ao.send({
                                Target = msg.From,
                                Action = 'Get-Metadata-Success',
                                Tags = {
                                    Status = 'Success',
                                    Message = 'Metadata retrieved',
                                },
                                Data = json.encode({ })
                            })
                        end

                        ao.send({
                            Target = reply_to,
                            Action = 'Get-Metadata-Success',
                            Tags = {
                                Status = 'Success',
                                Message = 'Metadata retrieved',
                            },
                            Data = json.encode(associated_zones)
                        })

                    end
                end

                if data.Address then

                    local query = Db:prepare([[
                        SELECT zone_id, user_id
                        FROM zone_users
                        WHERE user_id = ?
                    ]])

                    query:bind_values(data.Address)

                    for row in query:nrows() do
                        table.insert(associated_zones, {
                            ZoneId = row.zone_id,
                            Address = row.user_id
                        })
                    end

                    query:finalize()

                    if #associated_zones > 0 then
                        ao.send({
                            Target = msg.From,
                            Action = 'Profile-Success',
                            Tags = {
                                Status = 'Success',
                                Message = 'Associated zones fetched'
                            },
                            Data = json.encode(associated_zones)
                        })
                    else
                        ao.send({
                            Target = msg.From,
                            Action = 'Profile-Error',
                            Tags = {
                                Status = 'Error',
                                Message = 'This wallet address is not associated with a zone'
                            }
                        })
                    end
                end
            else
                ao.send({
                    Target = msg.From,
                    Action = 'Input-Error',
                    Tags = {
                        Status = 'Error',
                        Message = string.format(
                                'Failed to parse data, received: %s. %s.', msg.Data,
                                'Data must be an object - { Address }')
                    }
                })
            end
        end)

-- Create-Zone Handler: (assigned from original zone spawn message)
--Handlers.add(H_ZONE_BOOT, Handlers.utils.hasMatchingTag('Action', H_ZONE_BOOT),
--        handle_test_boot)

Handlers.add(H_ZONE_UPDATE, Handlers.utils.hasMatchingTag('Action', H_ZONE_UPDATE),
        handle_meta_set)

Handlers.add(H_ROLE_SET, Handlers.utils.hasMatchingTag('Action', H_ROLE_SET),
        handle_role_set)

Handlers.add(H_GET_ZONES_METADATA, Handlers.utils.hasMatchingTag('Action', H_GET_ZONES_METADATA),
        handle_meta_get)

Handlers.add(H_NOTIFY_ON_TOPIC, Handlers.utils.hasMatchingTag('Action', H_NOTIFY_ON_TOPIC),
        handle_notified)

Handlers.add(H_INFO, Handlers.utils.hasMatchingTag('Action', H_INFO),
        function(msg)
            local metadata = {}

            local query = Db:prepare([[
                SELECT id, username
                FROM ao_zone_metadata
            ]])
            for row in query:nrows() do
                table.insert(metadata, {
                    ZoneId = row.id,
                    Username = row.username,
                })
            end

            ao.send({
                Target = msg.From,
                Action = 'Read-Metadata-Success',
                Tags = {
                    Status = 'Success',
                    Message = 'Metadata retrieved',
                },
                Data = json.encode(metadata)
            })

            return json.encode(metadata)
        end)

Handlers.add(H_SUB_REG_CONFIRM, Handlers.utils.hasMatchingTag('Action', H_SUB_REG_CONFIRM),
        function(msg)
            print("Whitelist-Confirmation")
        end
)

Handlers.add(H_SUB_TOP_CONFIRM, Handlers.utils.hasMatchingTag('Response-For', "Subscribe-To-Topics"),
        function(msg)
            print("Topics-Confirmation")
        end
)
