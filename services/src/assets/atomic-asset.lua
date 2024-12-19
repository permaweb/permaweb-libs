local bint = require('.bint')(256)
local json = require('json')

local unsetPlaceholder = '!UNSET!'

Token = Token or {
	Name = Name or unsetPlaceholder,
	Creator = Creator or unsetPlaceholder,
	Ticker = Ticker or unsetPlaceholder,
	Denomination = Denomination or unsetPlaceholder,
	TotalSupply = TotalSupply or unsetPlaceholder,
	Balances = Balances or {},
	Transferable = true,
}

assetMetadata = assetMetadata or {}

local function checkValidAddress(address)
	if not address or type(address) ~= 'string' then
		return false
	end

	return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

local function checkValidAmount(data)
	return (math.type(tonumber(data)) == 'integer' or math.type(tonumber(data)) == 'float') and bint(data) > 0
end

local function decodeMessageData(data)
	local status, decodedData = pcall(json.decode, data)

	if not status or type(decodedData) ~= 'table' then
		return false, nil
	end

	return true, decodedData
end

-- Read process state
Handlers.add('Info', Handlers.utils.hasMatchingTag('Action', 'Info'), function(msg)
	msg.reply({
		Name = Token.Name,
		Ticker = Token.Ticker,
		Denomination = tostring(Token.Denomination),
		Transferable = tostring(Token.Transferable),
		Data = {
			Name = Token.Name,
			Ticker = Token.Ticker,
			Denomination = tostring(Token.Denomination),
			Balances = Token.Balances,
			Transferable = Token.Transferable,
			Creator = Token.Creator,
			AssetMetadata = assetMetadata
		}
	})
end)

-- Transfer balance to recipient (Data - { Recipient, Quantity })
Handlers.add('Transfer', Handlers.utils.hasMatchingTag('Action', 'Transfer'), function(msg)
	if not Token.Transferable and msg.From ~= ao.id then
		msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Transfers are not allowed' } })
		return
	end

	local data = {
		Recipient = msg.Tags.Recipient,
		Quantity = msg.Tags.Quantity
	}

	if checkValidAddress(data.Recipient) and checkValidAmount(data.Quantity) and bint(data.Quantity) <= bint(Token.Balances[msg.From] or '0') then
		-- Transfer is valid, calculate balances
		if not Token.Balances[msg.From] then
			Token.Balances[msg.From] = '0'
		end

		if not Token.Balances[data.Recipient] then
			Token.Balances[data.Recipient] = '0'
		end

		Token.Balances[msg.From] = tostring(bint(Token.Balances[msg.From]) - bint(data.Quantity))
		Token.Balances[data.Recipient] = tostring(bint(Token.Balances[data.Recipient]) + bint(data.Quantity))

		-- If new balance zeroes out then remove it from the table
		if bint(Token.Balances[msg.From]) <= bint(0) then
			Token.Balances[msg.From] = nil
		end
		if bint(Token.Balances[data.Recipient]) <= bint(0) then
			Token.Balances[data.Recipient] = nil
		end

		local debitNoticeTags = {
			Status = 'Success',
			Message = 'Balance transferred, debit notice issued',
			Recipient = msg.Tags.Recipient,
			Quantity = msg.Tags.Quantity,
		}

		local creditNoticeTags = {
			Status = 'Success',
			Message = 'Balance transferred, credit notice issued',
			Sender = msg.From,
			Quantity = msg.Tags.Quantity,
		}

		for tagName, tagValue in pairs(msg) do
			if string.sub(tagName, 1, 2) == 'X-' then
				debitNoticeTags[tagName] = tagValue
				creditNoticeTags[tagName] = tagValue
			end
		end

		-- Send a debit notice to the sender
		ao.send({
			Target = msg.From,
			Action = 'Debit-Notice',
			Tags = debitNoticeTags,
			Data = json.encode({
				Recipient = data.Recipient,
				Quantity = tostring(data.Quantity)
			})
		})

		-- Send a credit notice to the recipient
		ao.send({
			Target = data.Recipient,
			Action = 'Credit-Notice',
			Tags = creditNoticeTags,
			Data = json.encode({
				Sender = msg.From,
				Quantity = tostring(data.Quantity)
			})
		})
	end
end)

-- Mint new tokens (Data - { Quantity })
Handlers.add('Mint', Handlers.utils.hasMatchingTag('Action', 'Mint'), function(msg)
	local decodeCheck, data = decodeMessageData(msg.Data)

	if decodeCheck and data then
		-- Check if quantity is present
		if not data.Quantity then
			msg.reply({ Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Quantity }' } })
			return
		end

		-- Check if quantity is a valid integer greater than zero
		if not checkValidAmount(data.Quantity) then
			msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Quantity must be an integer greater than zero' } })
			return
		end

		-- Check if owner is sender
		if msg.From ~= Owner then
			msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Only the process owner can mint new tokens' } })
			return
		end

		if not Token.Balances[Owner] then
			Token.Balances[Owner] = '0'
		end

		Token.Balances[Owner] = tostring(bint(Token.Balances[Owner]) + bint(data.Quantity))

		msg.reply({ Action = 'Mint-Success', Tags = { Status = 'Success', Message = 'Tokens minted' } })
	else
		msg.reply({
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
						'Data must be an object - { Quantity }')
			}
		})
	end
end)

-- Read balance ({ Recipient | Target })
Handlers.add('Balance', Handlers.utils.hasMatchingTag('Action', 'Balance'), function(msg)
	local data

	if msg.Tags.Recipient then
		data = { Target = msg.Tags.Recipient }
	elseif msg.Tags.Target then
		data = { Target = msg.Tags.Target }
	else
		data = { Target = msg.From }
	end

	if data then
		-- Check if target is present
		if not data.Target then
			msg.reply({ Action = 'Input-Error', Tags = { Status = 'Error', Message = 'Invalid arguments, required { Target }' } })
			return
		end

		-- Check if target is a valid address
		if not checkValidAddress(data.Target) then
			msg.reply({ Action = 'Validation-Error', Tags = { Status = 'Error', Message = 'Target is not a valid address' } })
			return
		end

		local balance = Token.Balances[data.Target] or '0'

		msg.reply({
			Action = 'Balance-Notice',
			Tags = {
				Status = 'Success',
				Message = 'Balance received',
				Account = data.Target
			},
			Data = balance
		})
	else
		msg.reply({
			Action = 'Input-Error',
			Tags = {
				Status = 'Error',
				Message = string.format('Failed to parse data, received: %s. %s', msg.Data,
						'Data must be an object - { Target }')
			}
		})
	end
end)

-- Read balances
Handlers.add('Balances', Handlers.utils.hasMatchingTag('Action', 'Balances'),
		function(msg)
			msg.reply({ Data = json.encode(Token.Balances) })
		end)

-- Read total supply of token
Handlers.add('Total-Supply', Handlers.utils.hasMatchingTag('Action', 'Total-Supply'), function(msg)
	assert(msg.From ~= ao.id, 'Cannot call Total-Supply from the same process!')

	msg.reply({
		Action = 'Total-Supply',
		Data = tostring(Token.TotalSupply),
		Ticker = Token.Ticker
	})
end)

-- Initialize a request to add to creator zone
Handlers.once('Add-Upload-To-Zone', 'Add-Upload-To-Zone', function(msg)
	if msg.From ~= Token.Creator and msg.From ~= Owner and msg.From ~= ao.id then
		return
	end
	ao.send({
		Target = Token.Creator,
		Action = 'Add-Upload',
		AssetId = ao.id,
		AssetType = msg.AssetType, -- not checked, maybe not needed?
		ContentType = msg.ContentType -- not checked, maybe not needed?
	})
end)

-- setValueInStore
--Parse the key string to determine the nested structure:
--Split the key by . to get each "level".
--For the last part, check if it ends with []. If so, we are dealing with an array field.
--Traverse store according to the split key parts, creating sub-tables as needed.
--At the final level:
--If it’s a normal field (no []), assign the value directly.
--If it ends with [], append the value to an array at that field.
-- examples:
--setValueInStore("User.Name", "Alice")
--setValueInStore("User.Address.City", "New York")
--setValueInStore("Tags[]", "tag1")
--setValueInStore("Tags[]", "tag2")
--setValueInStore("User.Hobbies[]", "gaming")
--setValueInStore("User.Hobbies[]", "chess")
function setStoreValue(key, value)
	-- Split by '.'
	local parts = {}
	for part in string.gmatch(key, "[^%.]+") do
		table.insert(parts, part)
	end

	local lastPart = parts[#parts]

	local isAppend = false
	if string.sub(lastPart, -3) == "+++" then
		isAppend = true
		lastPart = string.sub(lastPart, 1, -4)  -- remove '+++'
	end

	local isArray = false
	if string.sub(lastPart, -2) == "[]" then
		isArray = true
		lastPart = string.sub(lastPart, 1, -3)
	end

	parts[#parts] = lastPart

	-- Traverse the structure in assetMetadata
	local current = assetMetadata
	for i = 1, #parts - 1 do
		local segment = parts[i]
		if current[segment] == nil then
			current[segment] = {}
		end
		current = current[segment]
	end

	local finalKey = parts[#parts]

	if isAppend then
		-- Append mode
		if isArray then
			-- Append to the last array element
			local arr = current[finalKey]
			arr[#arr] = arr[#arr] .. value
		else
			current[finalKey] = current[finalKey] .. value
		end
	else
		-- Normal mode
		if isArray then
			if current[finalKey] == nil then
				current[finalKey] = { value }
			else
				table.insert(current[finalKey], value)
			end
		else
			current[finalKey] = value
		end
	end
end

-- setTokenProps adjusts the Token table based on the bootloader values
function setTokenProps(collectedValues)
	for key, values in pairs(collectedValues) do
		if Token[key] ~= nil then
			if #values == 1 then
				if type(Token[key]) == "table" then
					table.insert(Token[key], values[1])
				else
					Token[key] = values[1]
				end
			else
				if type(Token[key]) == "table" then
					for _, value in ipairs(values) do
						table.insert(Token[key], value)
					end
				else
					Token[key] = values
				end
			end
		end
	end

	-- Replace unset placeholders in Token with nil
	for k, v in pairs(Token) do
		if v == unsetPlaceholder then
			Token[k] = nil
		end
	end
end

-- Boot Initialization
if #Inbox >= 1 and Inbox[1]["On-Boot"] ~= nil then
	local collectedValues = {}
	for _, tag in ipairs(Inbox[1].TagArray) do
		local prefix = "Bootloader-"
		if string.sub(tag.name, 1, string.len(prefix)) == prefix then
			local keyWithoutPrefix = string.sub(tag.name, string.len(prefix) + 1)
			if Token[keyWithoutPrefix] == nil then
				setStoreValue(keyWithoutPrefix, tag.value)
			end

			if not collectedValues[keyWithoutPrefix] then
				collectedValues[keyWithoutPrefix] = { tag.value }
			else
				table.insert(collectedValues[keyWithoutPrefix], tag.value)
			end
		end
	end

	setTokenProps(collectedValues)

	-- Initialize balances if needed
	if Token.Creator and Token.TotalSupply then
		Token.Balances = { [Token.Creator] = tostring(Token.TotalSupply) }
	end

	-- Notify zone of the asset
	ao.send({ Target = Token.Creator, Action = 'Add-Upload', AssetId = ao.id })
end
