local bint = require('.bint')(256)

local AssetManagerPackageName = '@permaweb/asset-manager'

local AssetManager = {}
AssetManager.__index = AssetManager

function AssetManager.new()
    local self = setmetatable({}, AssetManager)
    self.assets = {}
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
    for i, asset in ipairs(self.assets) do
        if asset.Id == asset_id then
            return i
        end
    end

    return -1
end

function AssetManager:get()
    return json.encode(self.assets)
end

function AssetManager:update(args)
    print('Running asset update...')

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

    print('Reading balance...')
    Send({ Target = args.AssetId, Action = 'Balance', Recipient = ao.id, Data = json.encode({ Target = ao.id }) })

    local balance_result = Receive({ From = args.AssetId })

    print('Balance received')
    print('Balance: ' .. balance_result.Data)

    local asset_index = get_asset_index(self, args.AssetId)

    if asset_index > -1 then
        print('Updating existing asset...')
        if args.Type == 'Add' then
            self.assets[asset_index].Quantity = utils.add(self.assets[asset_index].Quantity, balance_result.Data)
        end
        if args.Type == 'Remove' then
            self.assets[asset_index].Quantity = utils.subtract(self.assets[asset_index].Quantity, balance_result.Data)
        end
        self.assets[asset_index].LastUpdate = args.Timestamp
        print('Asset updated')
    else
        if args.Type == 'Add' and utils.to_number(balance_result.Data) > 0 then
            print('Adding new asset...')

            table.insert(self.assets, {
                id = args.AssetId,
                quantity = utils.to_balance_value(balance_result.Data),
                dateCreated = args.Timestamp,
                lastUpdate = args.Timestamp
            })

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

Handlers.add('Add-Upload', 'Add-Upload', function(msg)
    if not msg.AssetId then return end

    AssetManager:update({
        Type = 'Add',
        AssetId = msg.AssetId,
        Timestamp = msg.Timestamp
    })
end)

package.loaded[AssetManagerPackageName] = AssetManager

return AssetManager
