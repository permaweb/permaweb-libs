local json = require('json')

Comments = Comments or {}

AuthUsers = AuthUsers or {}

Rules = Rules or {
	ProfileAgeRequired = 0, -- minimum profile age in milliseconds (0 = disabled)
	MutedWords = {}, -- list of blocked words/phrases
	RequireProfileThumbnail = false, -- whether profile must have a thumbnail
	EnableTipping = false, -- whether tipping features are enabled
	RequireTipToComment = false, -- whether comments require an attached tip receipt
	TipAssetId = nil, -- token process allowed to create tip receipts
	MinTipAmount = '1', -- minimum tip amount (base units) required for paid comment
	HighlightPaidComments = false, -- UI hint for highlighting paid comments
	ShowPaidTab = false, -- UI hint for showing paid comments tab
}

CommentsById = CommentsById or {} -- id -> comment
ByParent = ByParent or {} -- parentKey -> { childIds in append order }
TipReceiptsById = TipReceiptsById or {} -- receiptId -> receipt object
TipReceiptToCommentId = TipReceiptToCommentId or {} -- receiptId -> commentId

local function normalizeAmount(value)
	if value == nil then
		return nil
	end
	local n = tonumber(value)
	if not n or n < 0 then
		return nil
	end
	return tostring(math.floor(n))
end

local function toNumber(value)
	local n = tonumber(value)
	if not n then
		return 0
	end
	return n
end

local function parentKey(pid)
	return pid or 'NULL'
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
		if c and c.Status == 'active' then
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
			local aPin = (a.Metadata and a.Metadata.PinnedAt)
				or a.UpdatedAt
				or a.DateCreated
				or 0
			local bPin = (b.Metadata and b.Metadata.PinnedAt)
				or b.UpdatedAt
				or b.DateCreated
				or 0
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
	if s == 'active' or s == 'inactive' then
		return s
	end
	return nil
end

local function containsMutedWord(content)
	if not content or not Rules.MutedWords or #Rules.MutedWords == 0 then
		return false, nil
	end
	local lowerContent = string.lower(content)
	for _, word in ipairs(Rules.MutedWords) do
		if string.find(lowerContent, string.lower(word), 1, true) then
			return true, word
		end
	end
	return false, nil
end

local function validateCommentRules(msg, content)
	-- Check muted words
	local hasMuted, mutedWord = containsMutedWord(content)
	if hasMuted then
		return false, 'Content contains blocked word: ' .. mutedWord
	end

	-- Check profile age requirement
	if Rules.ProfileAgeRequired and Rules.ProfileAgeRequired > 0 then
		local profileCreatedAt = getTag(msg, 'Profile-Created-At')
		if profileCreatedAt then
			profileCreatedAt = tonumber(profileCreatedAt)
			if profileCreatedAt then
				local profileAge = msg.Timestamp - profileCreatedAt
				if profileAge < Rules.ProfileAgeRequired then
					return false, 'Profile age requirement not met'
				end
			end
		else
			return false, 'Profile age verification required'
		end
	end

	-- Check profile thumbnail requirement
	if Rules.RequireProfileThumbnail then
		local hasThumbnail = getTag(msg, 'Has-Profile-Thumbnail')
		if hasThumbnail ~= 'true' then
			return false, 'Profile thumbnail required'
		end
	end

	return true, nil
end

local function validateTipReceipt(msg, tipReceiptId)
	if
		not Rules.EnableTipping
		or not Rules.RequireTipToComment
	then
		return true, nil
	end

	if not Rules.TipAssetId or Rules.TipAssetId == '' then
		return false, 'Tipping enabled but TipAssetId is not configured'
	end

	if not tipReceiptId or tipReceiptId == '' then
		return false, 'Tip-Receipt-Id is required'
	end

	local receipt = TipReceiptsById[tipReceiptId]
	if not receipt then
		return false, 'Invalid Tip-Receipt-Id'
	end

	if receipt.Payer ~= msg.From then
		return false, 'Tip receipt does not belong to sender'
	end

	if receipt.AssetId ~= Rules.TipAssetId then
		return false, 'Tip receipt asset does not match rules'
	end

	if receipt.Used == true then
		return false, 'Tip receipt already used'
	end

	local minTipAmount = toNumber(Rules.MinTipAmount or '1')
	local tipAmount = toNumber(receipt.Amount or '0')
	if tipAmount < minTipAmount then
		return false, 'Tip amount below minimum'
	end

	return true, receipt
end

function SyncState()
	Send({ device = 'patch@1.0', zone = GetState() })
end

function SyncDynamicState(key, value, opts)
	opts = opts or {}

	local data = value
	if opts.jsonEncode then
		data = json.encode(value)
	end

	Send({ device = 'patch@1.0', [key] = data })
end

Handlers.add('Get-Comments', 'Get-Comments', function(msg)
	Send({ Target = msg.From, Data = json.encode(Comments) })
end)

-- expects collectVisibleSorted(parentId) defined:
--   - returns visible children of parentId, sorted with pinned (Depth == -1) first
-- cursor semantics:
--   - Cursor is 1-based index into the ROOT list for the given Parent-Id
--   - We expand each root by also including its immediate children (depth +1)
--   - Limit applies to the TOTAL number of returned comments (roots + their child rows)

Handlers.add('Get-Comments-Pagination', 'Get-Comments-Pagination', function(msg)
	local parentId = getTag(msg, 'Parent-Id') -- nil => top-level
	local limit = tonumber(getTag(msg, 'Limit')) or 20
	local cursor = tonumber(getTag(msg, 'Cursor')) or 1 -- 1-based

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
		if not p or p.Status ~= 'active' then
			Send({
				Target = msg.From,
				Data = json.encode({
					items = {},
					nextCursor = nil,
					totalRootItems = 0,
				}),
			})
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
			Data = json.encode({
				items = {},
				nextCursor = nil,
				totalRootItems = totalRootItems,
			}),
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

Handlers.add('Get-Auth-Users', 'Get-Auth-Users', function(msg)
	Send({ Target = msg.From, Data = json.encode(AuthUsers) })
end)

Handlers.add('Get-Tip-Receipt', 'Get-Tip-Receipt', function(msg)
	local receiptId = getTag(msg, 'Tip-Receipt-Id')
	if not receiptId or receiptId == '' then
		Send({
			Target = msg.From,
			Action = 'Get-Tip-Receipt-Error',
			Error = 'Tip-Receipt-Id required',
		})
		return
	end
	Send({ Target = msg.From, Data = json.encode(TipReceiptsById[receiptId]) })
end)

Handlers.add('Get-Paid-Comments', 'Get-Paid-Comments', function(msg)
	local paid = {}
	for _, c in ipairs(Comments) do
		if c and c.Status == 'active' and c.TipReceiptId and c.TipAmount then
			table.insert(paid, c)
		end
	end

	table.sort(paid, function(a, b)
		local aTip = toNumber(a.TipAmount)
		local bTip = toNumber(b.TipAmount)
		if aTip ~= bTip then
			return aTip > bTip
		end
		local aDate = a.DateCreated or 0
		local bDate = b.DateCreated or 0
		return aDate > bDate
	end)

	Send({ Target = msg.From, Data = json.encode(paid) })
end)

Handlers.add('Credit-Notice', 'Credit-Notice', function(msg)
	if not Rules.EnableTipping then
		return
	end

	if not Rules.TipAssetId or Rules.TipAssetId == '' then
		return
	end

	if msg.From ~= Rules.TipAssetId then
		return
	end

	local sender = getTag(msg, 'Sender')
	local quantity = getTag(msg, 'Quantity')
	local receiptId = getTag(msg, 'X-Tip-Receipt-Id') or getTag(msg, 'Tip-Receipt-Id') or msg.Id
	local amount = normalizeAmount(quantity)

	if not sender or sender == '' or not amount then
		return
	end

	if TipReceiptsById[receiptId] then
		return
	end

	local receipt = {
		Id = receiptId,
		Payer = sender,
		Amount = amount,
		AssetId = msg.From,
		TipTxId = msg.Id,
		DateCreated = msg.Timestamp,
		Used = false,
	}

	TipReceiptsById[receiptId] = receipt
	SyncDynamicState('tipReceiptsById', TipReceiptsById)
end)

Handlers.add('Add-Comment', 'Add-Comment', function(msg)
	local parentId = getTag(msg, 'Parent-Id')
	local content = msg.Data

	if content and type(content) == 'string' then
		local success, decoded = pcall(json.decode, content)
		if success and type(decoded) == 'string' then
			content = decoded
		end
	end

	if not content or content == '' then
		Send({
			Target = msg.From,
			Action = 'Add-Comment-Error',
			Error = 'Empty content',
		})
		return
	end

	-- Validate comment rules
	local isValid, ruleError = validateCommentRules(msg, content)
	if not isValid then
		Send({
			Target = msg.From,
			Action = 'Add-Comment-Error',
			Error = ruleError,
		})
		return
	end

	local tipReceiptId = getTag(msg, 'Tip-Receipt-Id')
	local tipValid, tipResult = validateTipReceipt(msg, tipReceiptId)
	if not tipValid then
		Send({
			Target = msg.From,
			Action = 'Add-Comment-Error',
			Error = tipResult,
		})
		return
	end

	local id = getTag(msg, 'Comment-Id') or msg.Id
	if CommentsById[id] then
		Send({
			Target = msg.From,
			Action = 'Add-Comment-Error',
			Error = 'Duplicate Id',
		})
		return
	end
	if parentId and parentId == id then
		Send({
			Target = msg.From,
			Action = 'Add-Comment-Error',
			Error = 'Parent-Id cannot equal Comment-Id',
		})
		return
	end

	local depth = 0
	if parentId then
		local parent = CommentsById[parentId]
		if not parent then
			Send({
				Target = msg.From,
				Action = 'Add-Comment-Error',
				Error = 'Invalid Parent-Id',
			})
			return
		end
		if parent.Status ~= 'active' then
			Send({
				Target = msg.From,
				Action = 'Add-Comment-Error',
				Error = 'Parent inactive',
			})
			return
		end
		depth = (parent.Depth or 0) + 1
	end

	local metadata = {}
	local metadataRaw = getTag(msg, 'Metadata')
	if metadataRaw and metadataRaw ~= '' then
		local success, decoded = pcall(json.decode, metadataRaw)
		if success and type(decoded) == 'table' then
			metadata = decoded
		end
	end

	local newComment = {
		Id = id,
		Creator = msg.From,
		DateCreated = msg.Timestamp,
		UpdatedAt = msg.Timestamp,
		Status = 'active',
		Content = content,
		ParentId = parentId,
		Depth = depth,
		ChildrenCount = 0,
		Metadata = metadata,
	}

	if type(tipResult) == 'table' then
		newComment.TipReceiptId = tipResult.Id
		newComment.TipAmount = tipResult.Amount
		newComment.TipAssetId = tipResult.AssetId
		newComment.TipTxId = tipResult.TipTxId
		newComment.TipPayer = tipResult.Payer

		tipResult.Used = true
		tipResult.UsedBy = id
		tipResult.UsedAt = msg.Timestamp
		TipReceiptsById[tipResult.Id] = tipResult
		TipReceiptToCommentId[tipResult.Id] = id
		SyncDynamicState('tipReceiptsById', TipReceiptsById)
		SyncDynamicState('tipReceiptToCommentId', TipReceiptToCommentId)
	end

	table.insert(Comments, newComment)
	CommentsById[id] = newComment
	addToIndex(parentId, id)

	if parentId then
		updateParentChildCount(parentId, 1)
	end

	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	SyncDynamicState('byParent', ByParent)
	Send({ Target = msg.From, Action = 'Add-Comment-Success', Id = id })
end)

Handlers.add('Update-Comment-Status', 'Update-Comment-Status', function(msg)
	if not isAuthorized(msg.From) then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Status-Error',
			Error = 'Unauthorized',
		})
		return
	end

	local id = getTag(msg, 'Comment-Id')
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Status-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end
	local prev = c.Status
	local desired = normalizeStatus(getTag(msg, 'Status'))
	if not desired then
		desired = (c.Status == 'active') and 'inactive' or 'active'
	end
	if desired == c.Status then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Status-Error',
			Error = 'No status change',
			Id = id,
		})
		return
	end
	if prev ~= desired then
		if desired == 'inactive' and prev == 'active' then
			updateParentChildCount(c.ParentId, -1)
		elseif desired == 'active' and prev == 'inactive' then
			updateParentChildCount(c.ParentId, 1)
		end
	end
	c.Status = desired
	c.UpdatedAt = msg.Timestamp
	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)

	Send({
		Target = msg.From,
		Action = 'Update-Comment-Status-Success',
		Id = id,
		Status = desired,
	})
end)

Handlers.add('Update-Comment-Content', 'Update-Comment-Content', function(msg)
	local id = getTag(msg, 'Comment-Id')
	local comment = id and CommentsById[id]
	if not comment then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Content-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end
	if comment.Creator ~= msg.From then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Content-Error',
			Error = 'Unauthorized',
		})
		return
	end
	if not msg.Data or msg.Data == '' then
		Send({
			Target = msg.From,
			Action = 'Update-Comment-Content-Error',
			Error = 'Content cannot be empty',
			Id = id,
		})
		return
	end
	comment.Content = msg.Data
	comment.UpdatedAt = msg.Timestamp
	comment.Metadata = comment.Metadata or {}
	comment.Metadata.EditedAt = msg.Timestamp

	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	Send({
		Target = msg.From,
		Action = 'Update-Comment-Content-Success',
		Id = id,
	})
end)

Handlers.add('Remove-Comment', 'Remove-Comment', function(msg)
	if not isAuthorized(msg.From) then
		Send({
			Target = msg.From,
			Action = 'Remove-Comment-Error',
			Error = 'Unauthorized',
		})
		return
	end
	local id = getTag(msg, 'Comment-Id')
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = 'Remove-Comment-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end
	if c.Status ~= 'inactive' then
		updateParentChildCount(c.ParentId, -1)
	end
	-- soft delete
	c.Status = 'inactive'
	c.UpdatedAt = msg.Timestamp
	c.Content = ''

	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	Send({ Target = msg.From, Action = 'Remove-Comment-Success', Id = id })
end)

Handlers.add('Pin-Comment', 'Pin-Comment', function(msg)
	if not isAuthorized(msg.From) then
		Send({
			Target = msg.From,
			Action = 'Pin-Comment-Error',
			Error = 'Unauthorized',
		})
		return
	end
	local id = getTag(msg, 'Comment-Id')
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = 'Pin-Comment-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end
	if c.Status ~= 'active' then
		Send({
			Target = msg.From,
			Action = 'Pin-Comment-Error',
			Error = 'Cannot pin inactive comment',
		})
		return
	end
	if c.Depth ~= 0 then
		Send({
			Target = msg.From,
			Action = 'Pin-Comment-Error',
			Error = 'Can only pin top-level comments',
		})
		return
	end
	c.Metadata = c.Metadata or {}
	if c.Depth ~= -1 then
		c.Metadata.PinnedOriginalDepth = c.Metadata.PinnedOriginalDepth
			or c.Depth -- NEW
		c.Depth = -1
		c.Metadata.PinnedAt = msg.Timestamp
	end

	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	Send({ Target = msg.From, Action = 'Pin-Comment-Success', Id = id })
end)

Handlers.add('Remove-Own-Comment', 'Remove-Own-Comment', function(msg)
	local id = getTag(msg, 'Comment-Id')
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = 'Remove-Own-Comment-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end
	if c.Creator ~= msg.From then
		Send({
			Target = msg.From,
			Action = 'Remove-Own-Comment-Error',
			Error = 'Unauthorized',
		})
		return
	end
	if c.Status ~= 'inactive' then
		updateParentChildCount(c.ParentId, -1)
	end
	c.Status = 'inactive'
	c.UpdatedAt = msg.Timestamp
	c.Content = ''
	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	Send({ Target = msg.From, Action = 'Remove-Own-Comment-Success', Id = id })
end)

Handlers.add('Unpin-Comment', 'Unpin-Comment', function(msg)
	if not isAuthorized(msg.From) then
		Send({
			Target = msg.From,
			Action = 'Unpin-Comment-Error',
			Error = 'Unauthorized',
		})
		return
	end
	local id = getTag(msg, 'Comment-Id')
	local c = id and CommentsById[id]
	if not c then
		Send({
			Target = msg.From,
			Action = 'Unpin-Comment-Error',
			Error = 'Invalid Id',
			Id = tostring(id or ''),
		})
		return
	end

	c.Metadata = c.Metadata or {}
	if c.Depth == -1 then
		c.Depth = c.Metadata.PinnedOriginalDepth or 0 -- restore
		c.Metadata.PinnedOriginalDepth = nil -- clear
		c.Metadata.PinnedAt = nil -- clear
	end

	SyncDynamicState('comments', Comments)
	SyncDynamicState('commentsById', CommentsById)
	Send({ Target = msg.From, Action = 'Unpin-Comment-Success', Id = id })
end)

Handlers.add('Get-Rules', 'Get-Rules', function(msg)
	Send({ Target = msg.From, Data = json.encode(Rules) })
end)

Handlers.add('Update-Rules', 'Update-Rules', function(msg)
	if not isAuthorized(msg.From) then
		Send({
			Target = msg.From,
			Action = 'Update-Rules-Error',
			Error = 'Unauthorized',
		})
		return
	end

	local updates = {}
	if msg.Data and msg.Data ~= '' then
		local success, decoded = pcall(json.decode, msg.Data)
		if success and type(decoded) == 'table' then
			updates = decoded
		end
	end

	-- Update ProfileAgeRequired
	if updates.ProfileAgeRequired ~= nil then
		local age = tonumber(updates.ProfileAgeRequired)
		if age and age >= 0 then
			Rules.ProfileAgeRequired = age
		end
	end

	-- Update MutedWords
	if updates.MutedWords ~= nil then
		if type(updates.MutedWords) == 'table' then
			Rules.MutedWords = updates.MutedWords
		end
	end

	-- Update RequireProfileThumbnail
	if updates.RequireProfileThumbnail ~= nil then
		Rules.RequireProfileThumbnail = updates.RequireProfileThumbnail == true
	end

	-- Update tipping flags
	if updates.EnableTipping ~= nil then
		Rules.EnableTipping = updates.EnableTipping == true
	end
	if updates.RequireTipToComment ~= nil then
		Rules.RequireTipToComment = updates.RequireTipToComment == true
	end
	if updates.TipAssetId ~= nil then
		Rules.TipAssetId = tostring(updates.TipAssetId)
	end
	if updates.MinTipAmount ~= nil then
		local normalized = normalizeAmount(updates.MinTipAmount)
		if normalized then
			Rules.MinTipAmount = normalized
		end
	end
	if updates.HighlightPaidComments ~= nil then
		Rules.HighlightPaidComments = updates.HighlightPaidComments == true
	end
	if updates.ShowPaidTab ~= nil then
		Rules.ShowPaidTab = updates.ShowPaidTab == true
	end

	SyncDynamicState('rules', Rules)
	Send({ Target = msg.From, Action = 'Update-Rules-Success', Data = json.encode(Rules) })
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
		if tag.name == 'Rules' then
			local success, rulesData = pcall(json.decode, tag.value)
			if success and type(rulesData) == 'table' then
				if rulesData.ProfileAgeRequired ~= nil then
					Rules.ProfileAgeRequired = tonumber(rulesData.ProfileAgeRequired) or 0
				end
				if rulesData.MutedWords ~= nil and type(rulesData.MutedWords) == 'table' then
					Rules.MutedWords = rulesData.MutedWords
				end
				if rulesData.RequireProfileThumbnail ~= nil then
					Rules.RequireProfileThumbnail = rulesData.RequireProfileThumbnail == true
				end
				if rulesData.EnableTipping ~= nil then
					Rules.EnableTipping = rulesData.EnableTipping == true
				end
				if rulesData.RequireTipToComment ~= nil then
					Rules.RequireTipToComment = rulesData.RequireTipToComment == true
				end
				if rulesData.TipAssetId ~= nil then
					Rules.TipAssetId = tostring(rulesData.TipAssetId)
				end
				if rulesData.MinTipAmount ~= nil then
					local normalized = normalizeAmount(rulesData.MinTipAmount)
					if normalized then
						Rules.MinTipAmount = normalized
					end
				end
				if rulesData.HighlightPaidComments ~= nil then
					Rules.HighlightPaidComments = rulesData.HighlightPaidComments == true
				end
				if rulesData.ShowPaidTab ~= nil then
					Rules.ShowPaidTab = rulesData.ShowPaidTab == true
				end
			end
		end
	end

	SyncDynamicState('users', AuthUsers)
	SyncDynamicState('rules', Rules)
	SyncDynamicState('tipReceiptsById', TipReceiptsById)
	SyncDynamicState('tipReceiptToCommentId', TipReceiptToCommentId)
end
