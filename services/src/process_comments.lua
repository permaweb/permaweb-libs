local json = require("json")

Comments = Comments or {}

AuthUsers = AuthUsers or {}

CommentsById = CommentsById or {} -- id -> comment
ByParent = ByParent or {} -- parentKey -> { childIds in append order }

local function parentKey(pid)
	return pid or "NULL"
end

local function addToIndex(pid, id)
	local k = parentKey(pid)
	ByParent[k] = ByParent[k] or {}
	table.insert(ByParent[k], id)
end

local function listSlice(arr, startIdx, limit)
	local i = startIdx or 1
	local j = math.min(i + (limit or 20) - 1, #arr)
	local out = {}
	for k = i, j do
		out[#out + 1] = CommentsById[arr[k]]
	end
	local nextCursor = (j < #arr) and (j + 1) or nil
	return out, nextCursor
end

local function isAuthorized(addr)
	if not addr then
		return false
	end
	for _, v in ipairs(AuthUsers) do
		if v == addr then
			return true
		end
	end
	return false
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
	if s == "active" or s == "inactive" then
		return s
	end
	return nil
end

function SyncState()
	Send({ device = "patch@1.0", zone = json.encode(GetState()) })
end

function SyncDynamicState(key, value, opts)
	opts = opts or {}

	local data = value
	if opts.jsonEncode then
		data = json.encode(value)
	end

	Send({ device = "patch@1.0", [key] = data })
end

Handlers.add("Get-Comments", "Get-Comments", function(msg)
	Send({ Target = msg.From, Data = json.encode(Comments) })
end)

Handlers.add("Get-Comments-Pagination", "Get-Comments-Pagination", function(msg)
	local parentId = getTag(msg, "Parent-Id") -- nil => top-level
	local limit = tonumber(getTag(msg, "Limit")) or 20
	local cursor = tonumber(getTag(msg, "Cursor")) -- 1-based

	if parentId then
		local p = CommentsById[parentId]
		if not p or p.Status ~= "active" then -- if parent doesn't exist or is inactive, return empty
			Send({ Target = msg.From, Data = json.encode({ items = {}, nextCursor = nil }) })
			return
		end
	end

	local k = parentKey(parentId)
	local arr = ByParent[k] or {}
	local items, nextCursor = listSlice(arr, cursor, limit)

	local visible = {}
	for _, c in ipairs(items) do
		if c.Status == "active" then
			table.insert(visible, c)
		end
	end

	Send({ Target = msg.From, Data = json.encode({ items = visible, nextCursor = nextCursor }) })
end)

Handlers.add("Get-Auth-Users", "Get-Auth-Users", function(msg)
	Send({ Target = msg.From, Data = json.encode(AuthUsers) })
end)

Handlers.add("Add-Comment", "Add-Comment", function(msg)
	local parentId = getTag(msg, "Parent-Id")
	local content = msg.Data
	if not content or content == "" then
		Send({ Target = msg.From, Action = "Add-Comment-Error", Error = "Empty content" })
		return
	end

	local id = getTag(msg, "Comment-Id") or msg.Id
	if CommentsById[id] then
		Send({ Target = msg.From, Action = "Add-Comment-Error", Error = "Duplicate Id" })
		return
	end
	if parentId and parentId == id then
		Send({ Target = msg.From, Action = "Add-Comment-Error", Error = "Parent-Id cannot equal Comment-Id" })
		return
	end

	local depth = 0
	if parentId then
		local parent = CommentsById[parentId]
		if not parent then
			Send({ Target = msg.From, Action = "Add-Comment-Error", Error = "Invalid Parent-Id" })
			return
		end
		if parent.Status ~= "active" then
			Send({ Target = msg.From, Action = "Add-Comment-Error", Error = "Parent inactive" })
			return
		end
		depth = (parent.Depth or 0) + 1
	end

	local newComment = {
		Id = id,
		Creator = msg.From,
		DateCreated = msg.Timestamp,
		UpdatedAt = msg.Timestamp,
		Status = "active",
		Content = content,
		ParentId = parentId,
		Depth = depth,
		ChildrenCount = 0,
		Metadata = {},
	}

	table.insert(Comments, newComment)
	CommentsById[id] = newComment
	addToIndex(parentId, id)

	if parentId then
		local parent = CommentsById[parentId]
		parent.ChildrenCount = (parent.ChildrenCount or 0) + 1
	end

	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })
	SyncDynamicState("byParent", ByParent, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Add-Comment-Success", Id = id })
end)

Handlers.add("Update-Comment-Status", "Update-Comment-Status", function(msg)
	if not isAuthorized(msg.From) then
		Send({ Target = msg.From, Action = "Update-Comment-Status-Error", Error = "Unauthorized" })
		return
	end

	local id = getTag(msg, "Comment-Id")
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = "Update-Comment-Status-Error",
			Error = "Invalid Id",
			Id = tostring(id or ""),
		})
		return
	end

	local desired = normalizeStatus(getTag(msg, "Status"))
	if not desired then
		desired = (c.Status == "active") and "inactive" or "active"
	end
	c.Status = desired
	c.UpdatedAt = msg.Timestamp
	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })

	Send({ Target = msg.From, Action = "Update-Comment-Status-Success", Id = id, Status = desired })
end)

Handlers.add("Update-Comment-Content", "Update-Comment-Content", function(msg)
	local id = getTag(msg, "Comment-Id")
	local comment = id and CommentsById[id]
	if not comment then
		Send({
			Target = msg.From,
			Action = "Update-Comment-Content-Error",
			Error = "Invalid Id",
			Id = tostring(id or ""),
		})
		return
	end
	if comment.Creator ~= msg.From then
		Send({ Target = msg.From, Action = "Update-Comment-Content-Error", Error = "Unauthorized" })
		return
	end
	if not msg.Data or msg.Data == "" then
		Send({ Target = msg.From, Action = "Update-Comment-Content-Error", Error = "Content cannot be empty", Id = id })
		return
	end
	comment.Content = msg.Data
	comment.UpdatedAt = msg.Timestamp
	comment.Metadata = comment.Metadata or {}
	comment.Metadata.EditedAt = msg.Timestamp

	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Update-Comment-Content-Success", Id = id })
end)

Handlers.add("Remove-Comment", "Remove-Comment", function(msg)
	if not isAuthorized(msg.From) then
		Send({ Target = msg.From, Action = "Remove-Comment-Error", Error = "Unauthorized" })
		return
	end
	local id = getTag(msg, "Comment-Id")
	local c = id and CommentsById[id]
	if not c then
		Send({ Target = msg.From, Action = "Remove-Comment-Error", Error = "Invalid Id", Id = tostring(id or "") })
		return
	end

	-- soft delete
	c.Status = "inactive"
	c.UpdatedAt = msg.Timestamp

	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Remove-Comment-Success", Id = id })
end)

local isInitialized = false

Handlers.add("Pin-Comment", "Pin-Comment", function(msg)
	if not isAuthorized(msg.From) then
		Send({ Target = msg.From, Action = "Pin-Comment-Error", Error = "Unauthorized" })
		return
	end
	local id = getTag(msg, "Comment-Id")
	local c = id and CommentsById[id]
	if not c then
		Send({ Target = msg.From, Action = "Pin-Comment-Error", Error = "Invalid Id", Id = tostring(id or "") })
		return
	end
	if c.Status ~= "active" then
		Send({ Target = msg.From, Action = "Pin-Comment-Error", Error = "Cannot pin inactive comment" })
		return
	end
	c.Metadata = c.Metadata or {}
	if c.Depth ~= -1 then
		c.Metadata.PinnedOriginalDepth = c.Metadata.PinnedOriginalDepth or c.Depth -- NEW
		c.Depth = -1 -- pin by depth
		c.Metadata.PinnedAt = msg.Timestamp -- NEW
		c.UpdatedAt = msg.Timestamp
	end

	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Pin-Comment-Success", Id = id })
end)

Handlers.add("Unpin-Comment", "Unpin-Comment", function(msg)
	if not isAuthorized(msg.From) then
		Send({ Target = msg.From, Action = "Unpin-Comment-Error", Error = "Unauthorized" })
		return
	end
	local id = getTag(msg, "Comment-Id")
	local c = id and CommentsById[id]
	if not c then
		Send({ Target = msg.From, Action = "Unpin-Comment-Error", Error = "Invalid Id", Id = tostring(id or "") })
		return
	end

	c.Metadata = c.Metadata or {}
	if c.Depth == -1 then
		c.Depth = c.Metadata.PinnedOriginalDepth or 0 -- restore
		c.Metadata.PinnedOriginalDepth = nil -- clear
		c.Metadata.PinnedAt = nil -- clear
		c.UpdatedAt = msg.Timestamp
	end

	SyncDynamicState("comments", Comments, { jsonEncode = true })
	SyncDynamicState("commentsById", CommentsById, { jsonEncode = true })
	Send({ Target = msg.From, Action = "Unpin-Comment-Success", Id = id })
end)

-- Boot Initialization
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

	SyncDynamicState("users", AuthUsers, { jsonEncode = true })
end

Handlers.add("Bootstrap", "Bootstrap", function(Msg)
	if isInitialized then
		Send({ Target = Msg.From, Action = "Bootstrap-Error", Error = "Already initialized" })
		return
	end
	isInitialized = true
	table.insert(AuthUsers, Msg.From)
	SyncDynamicState("users", AuthUsers, { jsonEncode = true })
end)
