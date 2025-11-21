local json = require('json')

-- Collections { Id, Name, Description, Creator, DateCreated, Banner, Thumbnail }[]
if not Collections then
	Collections = {}
end

InitialSync = InitialSync or 'INCOMPLETE'
if InitialSync == 'INCOMPLETE' then
	Send({
		device = 'patch@1.0',
		cache = json.encode({ Collections = Collections }),
	})
	InitialSync = 'COMPLETE'
end

-- Add collection to registry
Handlers.add(
	'Add-Collection',
	Handlers.utils.hasMatchingTag('Action', 'Add-Collection'),
	function(msg)
		local data = {
			Id = msg.Tags.CollectionId,
			Name = msg.Tags.Name,
			Description = msg.Tags.Description,
			Creator = msg.Tags.Creator,
			DateCreated = msg.Tags.DateCreated,
			Banner = msg.Tags.Banner,
			Thumbnail = msg.Tags.Thumbnail,
		}

		local requiredFields = {
			{ key = 'Id', name = 'CollectionId' },
			{ key = 'Name', name = 'Name' },
			{ key = 'Creator', name = 'Creator' },
		}

		for _, field in ipairs(requiredFields) do
			if not data[field.key] or data[field.key] == '' then
				ao.send({
					Target = msg.From,
					Action = 'Action-Response',
					Tags = {
						Status = 'Error',
						Message = 'Invalid or missing ' .. field.name,
					},
				})
				return
			end
		end

		for _, collection in ipairs(Collections) do
			if collection.Id == data.Id then
				ao.send({
					Target = msg.From,
					Action = 'Action-Response',
					Tags = {
						Status = 'Error',
						Message = 'Collection with this ID already exists',
					},
				})
				return
			end
		end

		table.insert(Collections, {
			Id = data.Id,
			Name = data.Name,
			Description = data.Description,
			Creator = data.Creator,
			DateCreated = data.DateCreated,
			Banner = data.Banner,
			Thumbnail = data.Thumbnail,
		})

		Send({
			device = 'patch@1.0',
			cache = json.encode({ Collections = Collections }),
		})

		ao.send({
			Target = msg.From,
			Action = 'Action-Response',
			Tags = {
				Status = 'Success',
				Message = 'Collection added successfully',
			},
		})
	end
)

Handlers.add(
	'Get-Collections',
	Handlers.utils.hasMatchingTag('Action', 'Get-Collections'),
	function(msg)
		ao.send({
			Target = msg.From,
			Action = 'Action-Response',
			Tags = {
				Status = 'Success',
				Message = 'Collections fetched successfully',
			},
			Data = json.encode({ Collections = Collections }),
		})
	end
)

Handlers.add(
	'Remove-Collection',
	Handlers.utils.hasMatchingTag('Action', 'Remove-Collection'),
	function(msg)
		local collectionId = msg.Tags.CollectionId

		local collectionIndex = nil
		local collectionOwner = nil

		for index, collection in ipairs(Collections) do
			if collection.Id == collectionId then
				collectionIndex = index
				collectionOwner = collection.Creator
				break
			end
		end

		if
			msg.From ~= Owner
			and msg.From ~= ao.id
			and msg.From ~= collectionOwner
		then
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

		if not collectionId or collectionId == '' then
			ao.send({
				Target = msg.From,
				Action = 'Action-Response',
				Tags = {
					Status = 'Error',
					Message = 'Invalid or missing CollectionId',
				},
			})
			return
		end

		if not collectionIndex then
			ao.send({
				Target = msg.From,
				Action = 'Action-Response',
				Tags = {
					Status = 'Error',
					Message = 'Collection not found',
				},
			})
			return
		end

		table.remove(Collections, collectionIndex)

		Send({
			device = 'patch@1.0',
			cache = json.encode({ Collections = Collections }),
		})

		ao.send({
			Target = msg.From,
			Action = 'Action-Response',
			Tags = {
				Status = 'Success',
				Message = 'Collection removed successfully',
			},
		})
	end
)

Handlers.add(
	'Filter-Inactive-Collections',
	Handlers.utils.hasMatchingTag('Action', 'Filter-Inactive-Collections'),
	function(msg)
		if msg.From ~= ao.id and msg.From ~= Owner then
			return
		end

		local stampProcess = 'LaC2VtxqGekpRPuJh-TkI_ByAqCS2_KB3YuhMJ5yBtc'

		local collections = {
			{ Id = 'fRHIxUYl8Z3v8_j7s9P80XZ1K0iAVqnFTMC1HeTRp18' },
			{ Id = 'e0pAZzSfBzHiIOVzJsz5qOpGeZM2wPMu4qD-t0z8FEM' },
			{ Id = 'JAHF1fo4MECRZZFKGcT0B6XM94Lqe-3FtB4Ht_kTEK0' },
		}

		for _, collection in ipairs(collections) do
			print('Running stamp lookup on (' .. collection.Id .. ')')
			ao.send({
				Target = stampProcess,
				Action = 'Read-Stamps-By-Asset',
				['Data-Source'] = collection.Id,
			})

			local result = Receive({ From = stampProcess })

			if
				result
				and result.Data
				and result.Data.stampsByAsset
				and #result.Data.stampsByAsset > 1
			then
				print(
					'Stamp count on collection ('
						.. collection.Id
						.. ') - '
						.. #result.Data.stampsByAsset
				)
			else
				print(
					'No stamps on collection ('
						.. collection.Id
						.. ') Removing...'
				)
			end
		end
	end
)
