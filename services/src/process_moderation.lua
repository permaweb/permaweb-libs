local json = require("json")

Moderation = Moderation or {}

AuthUsers = AuthUsers or {}

ModerationEntries = ModerationEntries or {}
EntriesById = EntriesById or {}
EntriesByTarget = EntriesByTarget or {}
EntriesByType = EntriesByType or {}
Subscriptions = Subscriptions or {}
SubscriptionsById = SubscriptionsById or {}

local function addToTargetIndex(targetId, id)
	EntriesByTarget[targetId] = EntriesByTarget[targetId] or {}
	table.insert(EntriesByTarget[targetId], id)
end

local function addToTypeIndex(targetType, id)
	EntriesByType[targetType] = EntriesByType[targetType] or {}
	table.insert(EntriesByType[targetType], id)
end

local function getTag(msg, name)
	if not msg or not msg.TagArray then
		return nil
	end
	for _, t in ipairs(msg.TagArray) do
		if t.name == name then
			return t.value
		end
	end
	return nil
end

local function normalizeStatus(s)
	if not s then
		return nil
	end
	s = string.lower(s)
	if s == "active" or s == "inactive" or s == "removed" or s == "flagged" or s == "approved" or s == "blocked" then
		return s
	end
	return nil
end

function SyncState()
	Send({ device = "patch@1.0", moderation = json.encode(GetState()) })
end

function SyncDynamicState(key, value, opts)
	opts = opts or {}

	local data = value
	if opts.jsonEncode then
		data = json.encode(value)
	end

	Send({ device = "patch@1.0", [key] = data })
end

function GetState()
	return {
		ModerationEntries = ModerationEntries,
		EntriesById = EntriesById,
		EntriesByTarget = EntriesByTarget,
		EntriesByType = EntriesByType,
		Subscriptions = Subscriptions,
		SubscriptionsById = SubscriptionsById,
		AuthUsers = AuthUsers
	}
end

Handlers.add("Get-Moderation-State", "Get-Moderation-State", function(msg)
	Send({ Target = msg.From, Data = json.encode(GetState()) })
end)

Handlers.add("Get-Moderation-Entries", "Get-Moderation-Entries", function(msg)
	local targetType = getTag(msg, "Target-Type")
	local targetId = getTag(msg, "Target-Id")
	local status = getTag(msg, "Status")
	local moderator = getTag(msg, "Moderator")
	local targetContext = getTag(msg, "Target-Context")

	local entries = ModerationEntries
	local filtered = {}

	for _, entry in ipairs(entries) do
		local include = true

		if targetType and entry.TargetType ~= targetType then
			include = false
		end
		if targetId and entry.TargetId ~= targetId then
			include = false
		end
		if status and entry.Status ~= status then
			include = false
		end
		if moderator and entry.Moderator ~= moderator then
			include = false
		end
		if targetContext and entry.TargetContext ~= targetContext then
			include = false
		end

		if include then
			table.insert(filtered, entry)
		end
	end

	Send({ Target = msg.From, Data = json.encode(filtered) })
end)

Handlers.add("Add-Moderation-Entry", "Add-Moderation-Entry", function(msg)

	local targetType = getTag(msg, "Target-Type")
	local targetId = getTag(msg, "Target-Id")
	local status = normalizeStatus(getTag(msg, "Status"))
	local targetContext = getTag(msg, "Target-Context")
	local reason = getTag(msg, "Reason")

	if not targetType or not targetId then
		Send({ Target = msg.From, Action = "Add-Moderation-Entry-Error", Error = "Target-Type and Target-Id required" })
		return
	end

	if not status then
		status = "flagged"
	end

	local id = getTag(msg, "Entry-Id") or msg.Id

	if EntriesById[id] then
		Send({ Target = msg.From, Action = "Add-Moderation-Entry-Error", Error = "Duplicate Entry-Id" })
		return
	end

	local existingEntries = EntriesByTarget[targetId] or {}
	for _, entryId in ipairs(existingEntries) do
		local entry = EntriesById[entryId]
		if entry and entry.TargetContext == targetContext then
			entry.Status = status
			entry.Moderator = msg.From
			entry.UpdatedAt = msg.Timestamp
			entry.Reason = reason

			SyncDynamicState("moderationEntries", ModerationEntries, { jsonEncode = true })
			SyncDynamicState("entriesById", EntriesById, { jsonEncode = true })
			Send({ Target = msg.From, Action = "Update-Moderation-Entry-Success", Id = entryId })
			return
		end
	end

	local newEntry = {
		Id = id,
		TargetType = targetType,
		TargetId = targetId,
		Status = status,
		Moderator = msg.From,
		DateCreated = msg.Timestamp,
		UpdatedAt = msg.Timestamp,
		TargetContext = targetContext,
		Reason = reason,
		Metadata = {}
	}

	if msg.Data and msg.Data ~= "" then
		local status, metadata = pcall(json.decode, msg.Data)
		if status and type(metadata) == "table" then
			newEntry.Metadata = metadata
		end
	end

	table.insert(ModerationEntries, newEntry)
	EntriesById[id] = newEntry
	addToTargetIndex(targetId, id)
	addToTypeIndex(targetType, id)

	SyncDynamicState("moderationEntries", ModerationEntries, { jsonEncode = true })
	SyncDynamicState("entriesById", EntriesById, { jsonEncode = true })
	SyncDynamicState("entriesByTarget", EntriesByTarget, { jsonEncode = true })
	SyncDynamicState("entriesByType", EntriesByType, { jsonEncode = true })

	Send({ Target = msg.From, Action = "Add-Moderation-Entry-Success", Id = id })
end)

Handlers.add("Update-Moderation-Entry", "Update-Moderation-Entry", function(msg)

	local id = getTag(msg, "Entry-Id")
	local entry = id and EntriesById[id]

	if not entry then
		Send({
			Target = msg.From,
			Action = "Update-Moderation-Entry-Error",
			Error = "Invalid Entry-Id",
			Id = tostring(id or "")
		})
		return
	end

	local status = normalizeStatus(getTag(msg, "Status"))
	local reason = getTag(msg, "Reason")

	if status then
		entry.Status = status
	end
	if reason then
		entry.Reason = reason
	end

	entry.Moderator = msg.From
	entry.UpdatedAt = msg.Timestamp

	if msg.Data and msg.Data ~= "" then
		local success, metadata = pcall(json.decode, msg.Data)
		if success and type(metadata) == "table" then
			for k, v in pairs(metadata) do
				entry.Metadata[k] = v
			end
		end
	end

	SyncDynamicState("moderationEntries", ModerationEntries, { jsonEncode = true })
	SyncDynamicState("entriesById", EntriesById, { jsonEncode = true })

	Send({ Target = msg.From, Action = "Update-Moderation-Entry-Success", Id = id })
end)

Handlers.add("Remove-Moderation-Entry", "Remove-Moderation-Entry", function(msg)

	local id = getTag(msg, "Entry-Id")
	local entry = id and EntriesById[id]

	if not entry then
		Send({ Target = msg.From, Action = "Remove-Moderation-Entry-Error", Error = "Invalid Entry-Id" })
		return
	end

	local targetEntries = EntriesByTarget[entry.TargetId] or {}
	for i, entryId in ipairs(targetEntries) do
		if entryId == id then
			table.remove(targetEntries, i)
			break
		end
	end

	local typeEntries = EntriesByType[entry.TargetType] or {}
	for i, entryId in ipairs(typeEntries) do
		if entryId == id then
			table.remove(typeEntries, i)
			break
		end
	end

	for i, e in ipairs(ModerationEntries) do
		if e.Id == id then
			table.remove(ModerationEntries, i)
			break
		end
	end

	EntriesById[id] = nil

	SyncDynamicState("moderationEntries", ModerationEntries, { jsonEncode = true })
	SyncDynamicState("entriesById", EntriesById, { jsonEncode = true })
	SyncDynamicState("entriesByTarget", EntriesByTarget, { jsonEncode = true })
	SyncDynamicState("entriesByType", EntriesByType, { jsonEncode = true })

	Send({ Target = msg.From, Action = "Remove-Moderation-Entry-Success", Id = id })
end)

Handlers.add("Add-Moderation-Subscription", "Add-Moderation-Subscription", function(msg)

	local zoneId = getTag(msg, "Zone-Id")
	local moderationProcessId = getTag(msg, "Moderation-Process-Id")
	local subType = getTag(msg, "Subscription-Type") or "default"

	if not zoneId then
		Send({ Target = msg.From, Action = "Add-Subscription-Error", Error = "Zone-Id required" })
		return
	end

	if not moderationProcessId then
		Send({ Target = msg.From, Action = "Add-Subscription-Error", Error = "Moderation-Process-Id required" })
		return
	end

	if SubscriptionsById[zoneId] then
		Send({ Target = msg.From, Action = "Add-Subscription-Error", Error = "Already subscribed" })
		return
	end

	local subscription = {
		Id = zoneId,
		ModerationProcessId = moderationProcessId,
		Type = subType,
		DateCreated = msg.Timestamp
	}

	table.insert(Subscriptions, subscription)
	SubscriptionsById[zoneId] = subscription

	SyncDynamicState("subscriptions", Subscriptions, { jsonEncode = true })
	SyncDynamicState("subscriptionsById", SubscriptionsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Add-Subscription-Success", ZoneId = zoneId })
end)

Handlers.add("Remove-Moderation-Subscription", "Remove-Moderation-Subscription", function(msg)

	local zoneId = getTag(msg, "Zone-Id")
	if not zoneId then
		Send({ Target = msg.From, Action = "Remove-Subscription-Error", Error = "Zone-Id required" })
		return
	end

	local subscription = SubscriptionsById[zoneId]
	if not subscription then
		Send({ Target = msg.From, Action = "Remove-Subscription-Error", Error = "Not subscribed" })
		return
	end

	for i, sub in ipairs(Subscriptions) do
		if sub.Id == zoneId then
			table.remove(Subscriptions, i)
			break
		end
	end

	SubscriptionsById[zoneId] = nil

	SyncDynamicState("subscriptions", Subscriptions, { jsonEncode = true })
	SyncDynamicState("subscriptionsById", SubscriptionsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Remove-Subscription-Success", ZoneId = zoneId })
end)

Handlers.add("Get-Moderation-Subscriptions", "Get-Moderation-Subscriptions", function(msg)
	Send({ Target = msg.From, Data = json.encode(Subscriptions) })
end)

Handlers.add("Bulk-Add-Moderation-Entries", "Bulk-Add-Moderation-Entries", function(msg)

	if not msg.Data or msg.Data == "" then
		Send({ Target = msg.From, Action = "Bulk-Add-Error", Error = "Data required" })
		return
	end

	local status, entries = pcall(json.decode, msg.Data)
	if not status or type(entries) ~= "table" then
		Send({ Target = msg.From, Action = "Bulk-Add-Error", Error = "Invalid data format" })
		return
	end

	local addedCount = 0
	local updatedCount = 0

	for _, entry in ipairs(entries) do
		if entry.TargetId and entry.TargetType then
			local existingEntries = EntriesByTarget[entry.TargetId] or {}
			local updated = false

			for _, entryId in ipairs(existingEntries) do
				local existing = EntriesById[entryId]
				if existing and existing.TargetContext == entry.TargetContext then
					existing.Status = entry.Status or existing.Status
					existing.Moderator = msg.From
					existing.UpdatedAt = msg.Timestamp
					existing.Reason = entry.Reason or existing.Reason
					updated = true
					updatedCount = updatedCount + 1
					break
				end
			end

			if not updated then
				local id = entry.Id or (msg.Id .. "-" .. tostring(addedCount))
				local newEntry = {
					Id = id,
					TargetType = entry.TargetType,
					TargetId = entry.TargetId,
					Status = entry.Status or "flagged",
					Moderator = msg.From,
					DateCreated = msg.Timestamp,
					UpdatedAt = msg.Timestamp,
					TargetContext = entry.TargetContext,
					Reason = entry.Reason,
					Metadata = entry.Metadata or {}
				}

				table.insert(ModerationEntries, newEntry)
				EntriesById[id] = newEntry
				addToTargetIndex(entry.TargetId, id)
				addToTypeIndex(entry.TargetType, id)
				addedCount = addedCount + 1
			end
		end
	end

	SyncDynamicState("moderationEntries", ModerationEntries, { jsonEncode = true })
	SyncDynamicState("entriesById", EntriesById, { jsonEncode = true })
	SyncDynamicState("entriesByTarget", EntriesByTarget, { jsonEncode = true })
	SyncDynamicState("entriesByType", EntriesByType, { jsonEncode = true })

	Send({
		Target = msg.From,
		Action = "Bulk-Add-Success",
		Added = tostring(addedCount),
		Updated = tostring(updatedCount)
	})
end)

Handlers.add("Get-Auth-Users", "Get-Auth-Users", function(msg)
	Send({ Target = msg.From, Data = json.encode(AuthUsers) })
end)

local isInitialized = false

if not isInitialized and #Inbox >= 1 and Inbox[1]["On-Boot"] ~= nil then
	isInitialized = true

	for _, tag in ipairs(Inbox[1].TagArray) do
		if tag.name == "Auth-Users" then
			local authUsers = json.decode(tag.value)
			for _, authUser in ipairs(authUsers) do
				table.insert(AuthUsers, authUser)
			end
		end
	end

	SyncDynamicState("authUsers", AuthUsers, { jsonEncode = true })
end
