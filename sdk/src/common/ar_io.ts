import { ARIO } from "@ar.io/sdk"
import { NetworkGatewaysProvider, Wayfinder } from '@ar.io/wayfinder-core';

const ario = ARIO.mainnet();

export const wayfinder = new Wayfinder({
  gatewaysProvider: new NetworkGatewaysProvider({
    ario: ARIO.mainnet(),
    sortBy: 'operatorStake',
    sortOrder: 'desc',
    limit: 10,
  }),
});