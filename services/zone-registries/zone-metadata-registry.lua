local json = require('json')
local sqlite3 = require('lsqlite3')

-- primary registry should keep a list of wallet/zone-id pairs
Db = Db or sqlite3.open_memory()

-- we have roles on who can do things, for now only owner used
-- action names
Zone.H_ZONE_GET = 'Info'

local H_ZONE_ERROR = 'Zone.Error'
local H_ZONE_SUCCESS = 'Zone.Success'
local H_GET_ZONES_USERS = "Get-Zones-For-User"
local H_GET_ZONES_METADATA = "Get-Zones-Metadata"
local H_PREPARE_DB = "Prepare-Database"
local H_INFO = "Zone-Info"
local H_NOTIFY_ON_TOPIC = "Notify-On-Topic"
local H_INIT_ZONE = "Init-Zone"

-- handlers to be forwarded
local H_ZONE_UPDATE = 'Update-Zone'
local H_ZONE_BOOT = "Create-Zone"

local ASSIGNABLES = {
    H_ZONE_UPDATE, H_ZONE_BOOT, H_GET_ZONES_USERS, H_GET_ZONES_METADATA }

local RELEVANT_METADATA = {"Title", "Date-Created", "UserName", "DisplayName", "Description", "CoverImage", "ProfileImage", "Tags" }

local NotifiedPending = {}

local function match_assignable_actions(a)
    for _, v in ipairs(ASSIGNABLES) do
        if a == v then
            return true
        end
    end
end

ao.addAssignable("AssignableActions", { Action = function(a) return match_assignable_actions(a) end } )

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
        if now - pending.Timestamp < 300 then
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

local function handle_notified_update_profile(msg)
    local decode_check, data = decode_message_data(msg.Data)
    if not decode_check then
        ao.send({
            Target = msg.From,
            Action = 'H_ZONE_ERROR',
            Data = { Message = "Failed to decode data" }
        })
        return
    end

    local updateTx = data["UpdateTx"];
    if not updateTx then
        ao.send({
            Target = msg.From,
            Action = 'H_ZONE_ERROR',
            Data = { Message = "No UpdateTx found" }
        })
        return
    end
    table.insert(NotifiedPending, { UpdateTx = updateTx, Timestamp = os.time() })
    -- assign the txid containing the "Update-Zone" action
    Assign({
        Message = updateTx,
        Processes = {
            ao.id
        }
    })
end

-- get notification on topic, check topic, and send to handler
local function handle_notified(msg)
    if msg.Tags.Topic == H_ZONE_UPDATE then
        handle_notified_update_profile(msg)
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
        insert_auth:bind_values(ZoneId, UserId, 'Owner')
        insert_auth:step()
        insert_auth:finalize()
    else
        ao.send({
            Target = reply_to,
            Action = 'Zone-Create-Notice',
            Tags = {
                Status = 'ERROR',
                Message = "Zone already found, cannot insert"
            },
            Data = { Code = "INSERT_FAILED" }
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
                    metadataTags[cleanedTag] = tag.value
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
            Tags = {
                Status = 'DB_PREPARE_FAILED',
                Message = "DB PREPARED QUERY FAILED"
            },
            Data = { Code = "Failed to prepare insert statement",
                     SQL = sql,
                     ERROR = Db:errmsg()
            }
        })
        print("Failed to prepare insert statement")
        return json.encode({ Code = 'DB_PREPARE_FAILED' })
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
    stmt:finalize()    ao.send({
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
                    profile_image TEXT,
                    cover_image TEXT,
                    tags TEXT,
                    date_created INTEGER NOT NULL,
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

    if decode_check and data then
        if not data.ZoneIds then
            ao.send({
                Target = msg.From,
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
                        Target = msg.From,
                        Action = 'DB_CODE',
                        Tags = {
                            Status = 'DB_PREPARE_FAILED',
                            Message = "DB PREPARED QUERY FAILED"
                        },
                        Data = { Code = "Failed to prepare insert statement" }
                    })
                    print("Failed to prepare insert statement")
                    return json.encode({ Code = 'DB_PREPARE_FAILED' })
                end

                stmt:bind_values(table.unpack(data.ZoneIds))

                local foundRows = false
                for row in stmt:nrows() do
                    foundRows = true
                    table.insert(metadata, { ProfileId = row.id,
                                             Username = row.username,
                                             ProfileImage = row.profile_image,
                                             CoverImage = row.cover_image,
                                             Description = row.description,
                                             DisplayName = row.display_name,
                                             Tags = JSON.decode(row.tags),
                    })
                end

                if not foundRows then
                    print('No rows found matching the criteria.')
                end

                ao.send({
                    Target = msg.From,
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
                Target = msg.From,
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
            Target = msg.From,
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

-- assignment of message from authorized wallet to zone_id
local function handle_meta_set(msg)
    local reply_to = msg.From
    local decode_check, data = decode_message_data(msg.Data)
    -- data may contain {"UserName":"x", ...etc}

    if not decode_check then
        ao.send({
            Target = reply_to,
            Action = 'ERROR',
            Tags = {
                Status = 'DECODE_FAILED',
                Message = "Failed to decode data"
            },
            Data = { Code = "DECODE_FAILED" }
        })
        return
    end

    -- make sure msg.Id is in NotifiedPending from Zone
    -- if NotifiedPending has msg.Id then
    -- remove msg.Id from NotifiedPending and continue.
    -- removed =
    if not removePendingId(msg.Id) then
        -- did not find notification confirmation from zone for this update
        return
    end

    local ZoneId = msg.Target -- Is this original target? confirm.
    local UserId = msg.From -- (assigned) -- AuthorizedAddress

    local check = Db:prepare('SELECT 1 FROM zone_users WHERE user_id = ? AND zone_id = ? LIMIT 1')
    check:bind_values(UserId, ZoneId)
    if check:step() ~= sqlite3.ROW then
        local insert_auth = Db:prepare(
                'INSERT INTO zone_users (zone_id, user_id) VALUES (?, ?)')
        insert_auth:bind_values(ZoneId, UserId, 'Owner')
        insert_auth:step()
        insert_auth:finalize()
    end

    local columns = {}
    local placeholders = {}
    local params = {}
    local metadataValues = {
        username = data.UserName or nil,
        profile_image = data.ProfileImage or nil,
        cover_image = data.CoverImage or nil,
        description = data.Description or nil,
        tags = data.Tags and json.encode(data.Tags) or nil,
        display_name = data.DisplayName or nil,
        date_updated = data.DateUpdated
    }

    local function generateUpdateQuery()
        -- first create setclauses for everything but id
        for key, val in pairs(metadataValues) do
            if val ~= nil and val ~= 'id' then
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
            end
        end
        -- now build querystring
        local sql = "UPDATE ao_zone_metadata SET "
        for i, _ in ipairs(columns) do
            sql = sql .. columns[i] .. " = " .. placeholders[i]
            if i ~= #columns then
                sql = sql .. ","
            end
        end
        sql = sql .. " WHERE id = ?"
        return sql
    end
    local sql = generateUpdateQuery()
    local stmt = Db:prepare(sql)

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

    -- add id last
    table.insert(params, ZoneId)
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
                Status = 'ERROR',
                Message = 'sqlite step error'
            },
            Data = { DB_STEP_MSG = step_status }
        })
        return json.encode({ Code = step_status })
    end
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

-- Data - { Address }
Handlers.add(H_GET_ZONES_USERS, Handlers.utils.hasMatchingTag('Action', H_GET_ZONES_USERS),
        function(msg)
            local decode_check, data = decode_message_data(msg.Data)

            if decode_check and data then
                if not data.Address then
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
Handlers.add(H_ZONE_BOOT, Handlers.utils.hasMatchingTag('Action', H_ZONE_BOOT),
        handle_boot_zone )

Handlers.add(H_ZONE_UPDATE, Handlers.utils.hasMatchingTag('Action', H_ZONE_UPDATE),
        handle_meta_set)

Handlers.add(H_GET_ZONES_METADATA, Handlers.utils.hasMatchingTag('Action', H_GET_ZONES_METADATA),
        handle_meta_get)
