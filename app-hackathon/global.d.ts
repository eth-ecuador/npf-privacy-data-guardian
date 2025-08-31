// Extend the Window interface to include the ethereum property for MetaMask and other wallets

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  // puedes añadir otros métodos como on, removeListener, selectedAddress, etc. según necesites
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
