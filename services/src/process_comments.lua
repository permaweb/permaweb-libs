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

local function updateParentChildCount(parentId, delta)
	if not parentId then
		return
	end
	local p = CommentsById[parentId]
	if not p then
		return
	end
	p.ChildrenCount = math.max(0, (p.ChildrenCount or 0) + delta)
end

local function collectVisibleSorted(parentId)
	local k = parentKey(parentId)
	local arr = ByParent[k] or {}

	local items = {}
	for _, id in ipairs(arr) do
		local c = CommentsById[id]
		if c and c.Status == "active" then
			table.insert(items, c)
		end
	end

	table.sort(items, function(a, b)
		-- Pinned first (Depth == -1)
		local ap = (a.Depth == -1)
		local bp = (b.Depth == -1)
		if ap ~= bp then
			return ap
		end

		-- Among pinned: newest pin first (PinnedAt desc), fallback UpdatedAt desc
		if ap and bp then
			local aPin = (a.Metadata and a.Metadata.PinnedAt) or a.UpdatedAt or a.DateCreated or 0
			local bPin = (b.Metadata and b.Metadata.PinnedAt) or b.UpdatedAt or b.DateCreated or 0
			if aPin ~= bPin then
				return aPin > bPin
			end
		end

		-- Among unpinned: oldest first by DateCreated (stable), fallback Id
		local ad = a.DateCreated or 0
		local bd = b.DateCreated or 0
		if ad ~= bd then
			return ad < bd
		end
		return tostring(a.Id) < tostring(b.Id)
	end)

	return items
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
	Send({ device = "patch@1.0", zone = GetState() })
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

-- expects collectVisibleSorted(parentId) defined:
--   - returns visible children of parentId, sorted with pinned (Depth == -1) first
-- cursor semantics:
--   - Cursor is 1-based index into the ROOT list for the given Parent-Id
--   - We expand each root by also including its immediate children (depth +1)
--   - Limit applies to the TOTAL number of returned comments (roots + their child rows)

Handlers.add("Get-Comments-Pagination", "Get-Comments-Pagination", function(msg)
	local parentId = getTag(msg, "Parent-Id") -- nil => top-level
	local limit = tonumber(getTag(msg, "Limit")) or 20
	local cursor = tonumber(getTag(msg, "Cursor")) or 1 -- 1-based

	-- clamp page size
	if limit < 1 then
		limit = 1
	end
	if limit > 200 then
		limit = 200
	end

	-- validate parent (if provided)
	if parentId then
		local p = CommentsById[parentId]
		if not p or p.Status ~= "active" then
			Send({ Target = msg.From, Data = json.encode({ items = {}, nextCursor = nil, totalRootItems = 0 }) })
			return
		end
	end

	-- ROOTS = visible, sorted children of Parent-Id
	local roots = collectVisibleSorted(parentId)
	local totalRootItems = #roots

	-- guard empty or out-of-range cursor
	local rootIdx = math.max(1, cursor)
	if rootIdx > totalRootItems then
		Send({
			Target = msg.From,
			Data = json.encode({ items = {}, nextCursor = nil, totalRootItems = totalRootItems }),
		})
		return
	end

	local items = {}
	local count = 0
	local i = rootIdx

	while i <= totalRootItems and count < limit do
		local root = roots[i]

		-- add the root itself
		items[#items + 1] = root
		count = count + 1
		if count >= limit then
			break
		end

		-- add depth-1 children of this root
		local children = collectVisibleSorted(root.Id) -- immediate children list
		for _, child in ipairs(children) do
			if count >= limit then
				break
			end
			items[#items + 1] = child
			count = count + 1
		end

		i = i + 1
	end

	-- nextCursor: next root index if we didn't exhaust roots
	local nextCursor = (i <= totalRootItems) and i or nil

	Send({
		Target = msg.From,
		Data = json.encode({
			items = items,
			nextCursor = nextCursor,
			totalRootItems = totalRootItems, -- count of roots under Parent-Id
			depthIncluded = 1, -- we included up to depth 1 relative to Parent-Id
		}),
	})
end)

Handlers.add("Get-Auth-Users", "Get-Auth-Users", function(msg)
	Send({ Target = msg.From, Data = json.encode(AuthUsers) })
end)

Handlers.add("Add-Comment", "Add-Comment", function(msg)
	local parentId = getTag(msg, "Parent-Id")
	local content = msg.Data

	if content and type(content) == "string" then
		local success, decoded = pcall(json.decode, content)
		if success and type(decoded) == "string" then
			content = decoded
		end
	end

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
		Metadata = msg.Metadata or {},
	}

	table.insert(Comments, newComment)
	CommentsById[id] = newComment
	addToIndex(parentId, id)

	if parentId then
		updateParentChildCount(parentId, 1)
	end

	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
	SyncDynamicState("byParent", ByParent)
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
	local prev = c.Status
	local desired = normalizeStatus(getTag(msg, "Status"))
	if not desired then
		desired = (c.Status == "active") and "inactive" or "active"
	end
	if desired == c.Status then
		Send({ Target = msg.From, Action = "Update-Comment-Status-Error", Error = "No status change", Id = id })
		return
	end
	if prev ~= desired then
		if desired == "inactive" and prev == "active" then
			updateParentChildCount(c.ParentId, -1)
		elseif desired == "active" and prev == "inactive" then
			updateParentChildCount(c.ParentId, 1)
		end
	end
	c.Status = desired
	c.UpdatedAt = msg.Timestamp
	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)

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

	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
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
	if c.Status ~= "inactive" then
		updateParentChildCount(c.ParentId, -1)
	end
	-- soft delete
	c.Status = "inactive"
	c.UpdatedAt = msg.Timestamp
	c.Content = ""

	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
	Send({ Target = msg.From, Action = "Remove-Comment-Success", Id = id })
end)

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
	if c.Depth ~= 0 then
		Send({ Target = msg.From, Action = "Pin-Comment-Error", Error = "Can only pin top-level comments" })
		return
	end
	c.Metadata = c.Metadata or {}
	if c.Depth ~= -1 then
		c.Metadata.PinnedOriginalDepth = c.Metadata.PinnedOriginalDepth or c.Depth -- NEW
		c.Depth = -1
		c.Metadata.PinnedAt = msg.Timestamp
	end

	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
	Send({ Target = msg.From, Action = "Pin-Comment-Success", Id = id })
end)

Handlers.add("Remove-Own-Comment", "Remove-Own-Comment", function(msg)
	local id = getTag(msg, "Comment-Id")
	local c = id and CommentsById[id]
	if not c then
		Send({ Target = msg.From, Action = "Remove-Own-Comment-Error", Error = "Invalid Id", Id = tostring(id or "") })
		return
	end
	if c.Creator ~= msg.From then
		Send({ Target = msg.From, Action = "Remove-Own-Comment-Error", Error = "Unauthorized" })
		return
	end
	if c.Status ~= "inactive" then
		updateParentChildCount(c.ParentId, -1)
	end
	c.Status = "inactive"
	c.UpdatedAt = msg.Timestamp
	c.Content = ""
	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
	Send({ Target = msg.From, Action = "Remove-Own-Comment-Success", Id = id })
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
	end

	SyncDynamicState("comments", Comments)
	SyncDynamicState("commentsById", CommentsById)
	Send({ Target = msg.From, Action = "Unpin-Comment-Success", Id = id })
end)

local isInitialized = false

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

	SyncDynamicState("users", AuthUsers)
end
