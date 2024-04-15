import { getAddress } from '@ethersproject/address';
import { motion } from 'framer-motion';
import { fetchAddresses } from 'gridplus-sdk';
import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Address } from 'wagmi';

import { i18n } from '~/core/languages';
import { SessionStorage } from '~/core/storage';
import { truncateAddress } from '~/core/utils/address';
import { Box, Button, Text } from '~/design-system';
import { Checkbox } from '~/entries/popup/components/Checkbox/Checkbox';
import { Link } from '~/entries/popup/components/Link/Link';
import { Spinner } from '~/entries/popup/components/Spinner/Spinner';
import { HARDWARE_WALLETS } from '~/entries/popup/handlers/walletVariables';
import { useAccounts } from '~/entries/popup/hooks/useAccounts';
import { ROUTES } from '~/entries/popup/urls';

export type AddressesData = {
  addresses: Address[];
};

export const AddressChoice = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { sortedAccounts } = useAccounts();
  const [formData, setFormData] = useState({
    selectedAddresses: [] as string[],
  });
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addresses, setAddresses] = useState<AddressesData['addresses']>([]);
  const disabled = loadingAddresses || formData.selectedAddresses.length === 0;
  const toggleAddress = (address: string) => {
    const selected = formData.selectedAddresses.includes(address);
    if (selected)
      return setFormData({
        selectedAddresses: formData.selectedAddresses.filter(
          (currentAddress) => currentAddress !== address,
        ),
      });
    return setFormData({
      selectedAddresses: [...formData.selectedAddresses, address],
    });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const accountsToImport = formData.selectedAddresses.map((address, i) => ({
      address,
      index: i,
    }));
    navigate(ROUTES.HW_WALLET_LIST, {
      state: {
        accountsToImport,
        deviceId: 'GridPlus',
        accountsEnabled: accountsToImport.length,
        vendor: 'GridPlus',
        direction: state?.direction,
        navbarIcon: state?.navbarIcon,
      },
    });
  };
  useEffect(() => {
    const fetchWalletAddresses = async () => {
      setLoadingAddresses(true);
      let fetchedAddresses: Address[];
      if (process.env.IS_TESTING === 'true') {
        fetchedAddresses = HARDWARE_WALLETS.MOCK_ACCOUNT.accountsToImport.map(
          (account) => account.address,
        );
      } else {
        fetchedAddresses = (await fetchAddresses()) as Address[];
      }
      const nonExistingAddresses = fetchedAddresses
        .map((address) => getAddress(address))
        .filter(
          (address) =>
            !sortedAccounts.map((account) => account.address).includes(address),
        );
      setAddresses(nonExistingAddresses);
      setLoadingAddresses(false);
    };
    const setPersistedFormData = async () => {
      const persistedAddresses = JSON.parse(
        (await SessionStorage.get('gridplusPersistedAddresses')) ?? '[]',
      ) as string[];
      if (persistedAddresses.length < 1) return;
      setFormData({ selectedAddresses: persistedAddresses });
    };
    fetchWalletAddresses();
    setPersistedFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    SessionStorage.set(
      'gridplusPersistedAddresses',
      JSON.stringify(formData.selectedAddresses),
    );
  }, [formData.selectedAddresses]);
  return (
    <Box
      as={motion.form}
      display="flex"
      flexDirection="column"
      onSubmit={onSubmit}
      flexGrow="1"
      flexShrink="1"
      width="full"
      paddingBottom="16px"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        flexGrow="1"
        flexShrink="1"
        gap="24px"
      >
        <Text size="20pt" weight="semibold" align="center">
          {i18n.t('hw.gridplus_choose_addresses')}
        </Text>
        {loadingAddresses && <Spinner size={24} />}
        <Box display="flex" flexDirection="column" gap="16px">
          <Text size="16pt" weight="bold" align="center" color="labelSecondary">
            {i18n.t('hw.available_addresses')}
          </Text>
          {addresses.map((address, i) => (
            <Box key={address} display="flex" gap="16px" alignItems="center">
              <Checkbox
                borderColor="blue"
                onClick={() => toggleAddress(address)}
                selected={formData.selectedAddresses.includes(address)}
                testId={`gridplus-address-${i}`}
              />
              <Text size="16pt" weight="medium">
                #{i}:
              </Text>
              <Link to="#" onClick={() => toggleAddress(address)} color="">
                <Text size="16pt" weight="medium">
                  {truncateAddress(address)}
                </Text>
              </Link>
            </Box>
          ))}
        </Box>
      </Box>
      <Button
        color={disabled ? 'labelQuaternary' : 'blue'}
        variant={disabled ? 'disabled' : 'flat'}
        disabled={disabled}
        testId="gridplus-submit"
        width="full"
        height="44px"
        symbol="checkmark.circle.fill"
        tabIndex={0}
      >
        {i18n.t('hw.gridplus_export_addresses')}
      </Button>
    </Box>
  );
};