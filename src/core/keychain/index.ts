import {
  Provider,
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/abstract-provider';
import {
  MessageTypeProperty,
  SignTypedDataVersion,
  TypedMessage,
  signTypedData as signTypedDataSigUtil,
} from '@metamask/eth-sig-util';
import { Signer, Wallet } from 'ethers';
import { Address } from 'wagmi';

import {
  SignMessageArguments,
  SignTypedDataArguments,
} from '~/entries/background/handlers/handleWallets';

import { KeychainType } from '../types/keychainTypes';
import { EthereumWalletType } from '../types/walletTypes';
import {
  EthereumWalletSeed,
  addHexPrefix,
  identifyWalletType,
} from '../utils/ethereum';

import { keychainManager } from './KeychainManager';

interface TypedDataTypes {
  EIP712Domain: MessageTypeProperty[];
  [additionalProperties: string]: MessageTypeProperty[];
}

export const setVaultPassword = async (
  password: string,
  newPassword: string,
) => {
  if (!verifyPassword(password)) {
    throw new Error('Invalid password');
  }
  return keychainManager.setPassword(newPassword);
};
export const verifyPassword = (password: string) => {
  return keychainManager.verifyPassword(password);
};

export const unlockVault = async (password: string) => {
  try {
    await keychainManager.unlock(password);
    return keychainManager.state.isUnlocked;
  } catch (e) {
    return false;
  }
};

export const wipeVault = async (password: string) => {
  return keychainManager.wipe(password);
};

export const lockVault = () => {
  return keychainManager.lock();
};
export const hasVault = () => {
  return !!keychainManager.state.vault;
};

export const isVaultUnlocked = (): boolean => {
  return keychainManager.state.isUnlocked;
};

export const createWallet = async (): Promise<Address> => {
  const keychain = await keychainManager.addNewKeychain();
  const accounts = await keychain.getAccounts();
  return accounts[0];
};

export const importWallet = async (
  secret: EthereumWalletSeed,
): Promise<Address> => {
  const walletType = identifyWalletType(secret);
  switch (walletType) {
    case EthereumWalletType.mnemonic: {
      const keychain = await keychainManager.importKeychain({
        type: KeychainType.HdKeychain,
        mnemonic: secret,
      });
      const address = (await keychain.getAccounts())[0];
      return address;
    }
    case EthereumWalletType.privateKey: {
      const keychain = await keychainManager.importKeychain({
        type: KeychainType.KeyPairKeychain,
        privateKey: secret,
      });
      const address = (await keychain.getAccounts())[0];
      return address;
    }
    case EthereumWalletType.readOnly: {
      const keychain = await keychainManager.importKeychain({
        type: KeychainType.ReadOnlyKeychain,
        address: secret as Address,
      });
      const address = (await keychain.getAccounts())[0];
      return address;
    }
    default:
      throw new Error('Wallet type not recognized.');
  }
};

export const addNewAccount = async (
  silbingAddress: Address,
): Promise<Address> => {
  const keychain = await keychainManager.getKeychain(silbingAddress);
  const newAccount = await keychainManager.addNewAccount(keychain);
  return newAccount;
};

export const removeAccount = async (address: Address): Promise<void> => {
  return keychainManager.removeAccount(address);
};

export const getWallets = async () => {
  return keychainManager.getWallets();
};
export const getAccounts = async (): Promise<Address[]> => {
  return keychainManager.getAccounts();
};

export const getSigner = async (address: Address): Promise<Signer> => {
  return keychainManager.getSigner(address);
};

export const exportKeychain = async (
  address: Address,
  password: string,
): Promise<string> => {
  return keychainManager.exportKeychain(address, password);
};

export const exportAccount = async (
  address: Address,
  password: string,
): Promise<string> => {
  return keychainManager.exportAccount(address, password);
};

export const sendTransaction = async (
  txPayload: TransactionRequest,
  provider: Provider,
): Promise<TransactionResponse> => {
  if (typeof txPayload.from === 'undefined') {
    throw new Error('Missing from address');
  }
  const signer = await keychainManager.getSigner(txPayload.from as Address);
  const wallet = signer.connect(provider);
  return wallet.sendTransaction(txPayload);
};

export const signMessage = async ({
  address,
  msgData,
}: SignMessageArguments): Promise<string> => {
  const signer = await keychainManager.getSigner(address);
  return signer.signMessage(msgData);
};

export const signTypedData = async ({
  address,
  msgData,
}: SignTypedDataArguments): Promise<string> => {
  const signer = (await keychainManager.getSigner(address)) as Wallet;

  const pkeyBuffer = Buffer.from(
    addHexPrefix(signer.privateKey).substring(2),
    'hex',
  );
  const parsedData = msgData;

  // There are 3 types of messages
  // v1 => basic data types
  // v3 =>  has type / domain / primaryType
  // v4 => same as v3 but also supports which supports arrays and recursive structs.
  // Because v4 is backwards compatible with v3, we're supporting only v4

  let version = 'v1';
  if (
    typeof parsedData === 'object' &&
    (parsedData.types || parsedData.primaryType || parsedData.domain)
  ) {
    version = 'v4';
  }
  return signTypedDataSigUtil({
    data: parsedData as unknown as TypedMessage<TypedDataTypes>,
    privateKey: pkeyBuffer,
    version: version.toUpperCase() as SignTypedDataVersion,
  });
};