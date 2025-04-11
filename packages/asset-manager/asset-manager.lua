local bint = require('.bint')(256)

local AssetManagerPackageName = '@permaweb/asset-manager'

local AssetManager = {}
AssetManager.__index = AssetManager

function AssetManager.new()
    local self = setmetatable({}, AssetManager)
    self.Assets = {}
    return self
end

local utils = {
    add = function(a, b)
        return tostring(bint(a) + bint(b))
    end,
    subtract = function(a, b)
        return tostring(bint(a) - bint(b))
    end,
    to_balance_value = function(a)
        return tostring(bint(a))
    end,
    to_number = function(a)
        return bint.tonumber(a)
    end
}

local function check_valid_address(address)
    if not address or type(address) ~= 'string' then
        return false
    end

    return string.match(address, "^[%w%-_]+$") ~= nil and #address == 43
end

local function check_valid_update_type(type)
    return type == 'Add' or type == 'Remove'
end

local function check_required_args(args, required_args)
    print('Checking required args...')

    local required_args_met = true
    for _, arg in ipairs(required_args) do
        if not args[arg] then
            print('Missing required argument: ' .. arg)
            required_args_met = false
        end
    end

    return required_args_met
end

local function get_asset_index(self, asset_id)
    for i, asset in ipairs(self.Assets) do
        if asset.Id == asset_id then
            return i
        end
    end

    return -1
end

function AssetManager:get()
    return json.encode(self.Assets)
end

function AssetManager:update(args)
    print('Running asset update...')

    if not self.Assets then self.Assets = {} end

    if not check_required_args(args, { 'Type', 'AssetId', 'Timestamp' }) then
        return
    end

    if not check_valid_address(args.AssetId) then
        print('Invalid AssetId')
        return
    end

    if not check_valid_update_type(args.Type) then
        print('Invalid Update Type')
        return
    end

    local asset_index = get_asset_index(self, args.AssetId)

    if asset_index > -1 then
        print('Updating existing asset...')
        if args.Type == 'Add' then
            self.Assets[asset_index].Quantity = utils.add(self.Assets[asset_index].Quantity, args.Quantity)
        end
        if args.Type == 'Remove' then
            self.Assets[asset_index].Quantity = utils.subtract(self.Assets[asset_index].Quantity, args.Quantity)
        end
        self.Assets[asset_index].LastUpdate = args.Timestamp

        args.SyncState()
        print('Asset updated')
    else
        if args.Type == 'Add' and utils.to_number(args.Quantity) > 0 then
            print('Adding new asset...')

            table.insert(self.Assets, {
                Id = args.AssetId,
                Quantity = utils.to_balance_value(args.Quantity),
                DateCreated = args.Timestamp,
                LastUpdate = args.Timestamp,
                Type = args.AssetType,
                ContentType = args.ContentType
            })

            args.SyncState()
            print('Asset added')
        else
            print('No asset found to update...')
        end
        if args.Type == 'Remove' then
            print('No asset found to update...')
            return
        end
    end
end

package.loaded[AssetManagerPackageName] = AssetManager

return AssetManager
