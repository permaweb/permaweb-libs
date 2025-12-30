local json = require('json')

Name = Name or '<NAME>'
Description = Description or '<DESCRIPTION>'
Creator = Creator or '<CREATOR>'
Banner = Banner or '<BANNER>'
Thumbnail = Thumbnail or '<THUMBNAIL>'

DateCreated = DateCreated or '<DATECREATED>'
LastUpdate = LastUpdate or '<LASTUPDATE>'

Assets = Assets or {}
ActivityIds = ActivityIds or {}
ActivityProcess = ActivityProcess or '<ACTIVITY_ID>'

local function decodeMessageData(data)
	local status, decodedData = pcall(json.decode, data)

	if not status or type(decodedData) ~= 'table' then
		return false, nil
	end

	return true, decodedData
end

local function assetExists(assetId)
	for _, id in ipairs(Assets) do
		if id == assetId then
			return true
		end
	end
	return false
end

local function checkValidAddress(address)
	if not address or type(address) ~= 'string' then
		return false
	end

	return string.match(address, '^[%w%-_]+$') ~= nil and #address == 43
end

local function getState()
	return {
		Name = Name,
		Description = Description,
		Creator = Creator,
		Banner = Banner,
		Thumbnail = Thumbnail,
		DateCreated = DateCreated,
		Assets = Assets,
		ActivityProcess = ActivityProcess,
	}
end

local function syncState()
	Send({ device = 'patch@1.0', collection = getState() })
end

Handlers.add(
	'Info',
	Handlers.utils.hasMatchingTag('Action', 'Info'),
	function(msg)
		ao.send({
			Target = msg.From,
			Data = json.encode(getState()),
		})
	end
)

-- Add or remove assets
Handlers.add(
	'Update-Assets',
	Handlers.utils.hasMatchingTag('Action', 'Update-Assets'),
	function(msg)
		-- Check if message is from authorized sender (Owner, Creator, or ao.id)
		-- Also allow zone-forwarded messages if original sender is Creator
		local originalSender = msg.Tags and msg.Tags['Original-Sender']
		local isAuthorized = (msg.From == Owner)
			or (msg.From == ao.id)
			or (msg.From == Creator)
			or (originalSender and originalSender == Creator)

		if not isAuthorized then
			ao.send({
				Target = msg.From,
				Action = 'Authorization-Error',
				Tags = {
					Status = 'Error',
					Message = 'Unauthorized to access this handler',
				},
			})
			return
		end

		local decodeCheck, data = decodeMessageData(msg.Data)

		if decodeCheck and data then
			if
				not data.AssetIds
				or type(data.AssetIds) ~= 'table'
				or #data.AssetIds == 0
			then
				ao.send({
					Target = msg.From,
					Action = 'Action-Response',
					Tags = {
						Status = 'Error',
						Message = 'Invalid or empty AssetIds list',
					},
				})
				return
			end

			if
				not data.UpdateType
				or (data.UpdateType ~= 'Add' and data.UpdateType ~= 'Remove')
			then
				ao.send({
					Target = msg.From,
					Action = 'Action-Response',
					Tags = {
						Status = 'Error',
						Message = 'UpdateType argument required (Add | Remove)',
					},
				})
				return
			end

			if data.UpdateType == 'Add' then
				for _, assetId in ipairs(data.AssetIds) do
					if not assetExists(assetId) then
						table.insert(Assets, assetId)
					end
				end
			end

			if data.UpdateType == 'Remove' then
				for _, assetId in ipairs(data.AssetIds) do
					for i, id in ipairs(Assets) do
						if id == assetId then
							table.remove(Assets, i)
							break
						end
					end
				end
			end

			LastUpdate = msg.Timestamp

			ao.send({
				Target = msg.From,
				Action = 'Action-Response',
				Tags = {
					Status = 'Success',
					Message = 'Assets updated successfully',
				},
			})

			syncState()
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = string.format(
						'Failed to parse data, received: %s. %s',
						msg.Data,
						'Data must be an object - { AssetIds: [], UpdateType }'
					),
				},
			})
		end
	end
)

-- Initialize a request to add a new orderbook to collection activity
Handlers.add(
	'Update-Collection-Activity',
	Handlers.utils.hasMatchingTag('Action', 'Update-Collection-Activity'),
	function(msg)
		if msg.From ~= Owner and msg.From ~= Creator and msg.From ~= ao.id then
			ao.send({
				Target = msg.From,
				Action = 'Authorization-Error',
				Tags = {
					Status = 'Error',
					Message = 'Unauthorized to access this handler',
				},
			})
			return
		end

		if msg.Tags.ActivityId and msg.Tags.UpdateType then
			if msg.Tags.UpdateType == 'Add' then
				local exists = false
				for _, existingId in ipairs(ActivityIds) do
					if existingId == msg.Tags.ActivityId then
						exists = true
						break
					end
				end
				if not exists then
					table.insert(ActivityIds, msg.Tags.ActivityId)
				end
			end

			if msg.Tags.UpdateType == 'Remove' then
				for _, id in ipairs(ActivityIds) do
					for i, existingId in ipairs(ActivityIds) do
						if existingId == id then
							table.remove(ActivityIds, i)
							break
						end
					end
				end
			end

			syncState()
		end
	end
)

Handlers.add(
	'Forward-Order',
	Handlers.utils.hasMatchingTag('Action', 'Forward-Order'),
	function(msg)
		local isAllowed = false
		for _, allowedActivityId in ipairs(ActivityIds) do
			if msg.From == allowedActivityId then
				isAllowed = true
			end
		end

		if not isAllowed then
			return
		end

		ao.send({
			Target = ActivityProcess,
			Action = msg.Tags.UpdateType,
			Data = msg.Data,
		})
	end
)

-- Initialize a request to add the collection to a profile
Handlers.add(
	'Add-Collection-To-Profile',
	Handlers.utils.hasMatchingTag('Action', 'Add-Collection-To-Profile'),
	function(msg)
		if msg.From ~= Owner and msg.From ~= Creator and msg.From ~= ao.id then
			ao.send({
				Target = msg.From,
				Action = 'Authorization-Error',
				Tags = {
					Status = 'Error',
					Message = 'Unauthorized to access this handler',
				},
			})
			return
		end
		if checkValidAddress(Creator) then
			ao.assign({ Processes = { Creator }, Message = ao.id })
		else
			ao.send({
				Target = msg.From,
				Action = 'Input-Error',
				Tags = {
					Status = 'Error',
					Message = 'ProfileProcess tag not specified or not a valid Process ID',
				},
			})
		end
	end
)

Initialized = Initialized or false

if not Initialized then
	syncState()
	Initialized = true
end
