// Extend the Window interface to include the ethereum property for MetaMask and other wallets

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  // Add more properties/methods as needed
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export {};
