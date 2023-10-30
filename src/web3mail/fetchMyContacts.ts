import { WorkflowError } from '../utils/errors.js';
import { autoPaginateRequest } from '../utils/paginate.js';
import { getValidContact } from '../utils/subgraphQuery.js';
import { throwIfMissing } from '../utils/validators.js';
import {
  Contact,
  IExecConsumer,
  SubgraphConsumer,
  DappAddressConsumer,
  DppWhitelistAddressConsumer,
} from './types.js';

export const fetchMyContacts = async ({
  graphQLClient = throwIfMissing(),
  iexec = throwIfMissing(),
  dappAddressOrENS = throwIfMissing(),
  dappWhitelistAddress = throwIfMissing(),
}: IExecConsumer &
  SubgraphConsumer &
  DappAddressConsumer &
  DppWhitelistAddressConsumer): Promise<Contact[]> => {
  try {
    const userAddress = await iexec.wallet.getAddress();

    const [ensOrders, scOrders] = await Promise.all([
      fetchAllOrdersByApp({
        iexec,
        userAddress,
        appAddress: dappAddressOrENS,
      }),
      fetchAllOrdersByApp({
        iexec,
        userAddress,
        appAddress: dappWhitelistAddress,
      }),
    ]);

    const orders = ensOrders.concat(scOrders);
    const myContacts: Contact[] = [];
    const web3DappResolvedAddress = await iexec.ens.resolveName(
      dappAddressOrENS
    );

    orders.forEach((order) => {
      if (
        order.order.apprestrict.toLowerCase() ===
          web3DappResolvedAddress.toLowerCase() ||
        order.order.apprestrict.toLowerCase() ===
          dappWhitelistAddress.toLowerCase()
      ) {
        const contact = {
          address: order.order.dataset.toLowerCase(),
          owner: order.signer.toLowerCase(),
          accessGrantTimestamp: order.publicationTimestamp,
        };
        myContacts.push(contact);
      }
    });

    return await getValidContact(graphQLClient, myContacts);
  } catch (error) {
    throw new WorkflowError(
      `Failed to fetch my contacts: ${error.message}`,
      error
    );
  }
};

async function fetchAllOrdersByApp({ iexec, userAddress, appAddress }) {
  const ordersFirstPage = iexec.orderbook.fetchDatasetOrderbook('any', {
    app: appAddress,
    requester: userAddress,
    // Use maxPageSize here to avoid too many round-trips (we want everything anyway)
    pageSize: 1000,
  });
  const { orders: allOrders } = await autoPaginateRequest({
    request: ordersFirstPage,
  });
  return allOrders;
}
