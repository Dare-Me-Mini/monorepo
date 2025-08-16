export interface Token {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
}

export const SUPPORTED_TOKENS: Record<string, Token> = {
  USDC: {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    icon: "💵"
  },
  WETH: {
    address: "0x4200000000000000000000000000000000000006", 
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    icon: "🔷"
  }
};

export const DEFAULT_TOKEN = SUPPORTED_TOKENS.USDC;

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return SUPPORTED_TOKENS[symbol.toUpperCase()];
};

export const getTokenByAddress = (address: string): Token | undefined => {
  return Object.values(SUPPORTED_TOKENS).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  );
};

export const formatTokenAmount = (amount: bigint | string | number, token: Token): string => {
  const amountBigInt = typeof amount === 'bigint' ? amount : BigInt(amount.toString());
  const divisor = BigInt(10 ** token.decimals);
  const quotient = amountBigInt / divisor;
  const remainder = amountBigInt % divisor;
  
  if (remainder === BigInt(0)) {
    return quotient.toString();
  }
  
  // Handle decimal places
  const decimalStr = remainder.toString().padStart(token.decimals, '0');
  const trimmedDecimal = decimalStr.replace(/0+$/, '');
  
  if (trimmedDecimal === '') {
    return quotient.toString();
  }
  
  return `${quotient.toString()}.${trimmedDecimal}`;
};

export const parseTokenAmount = (amount: string | number, token: Token): bigint => {
  const amountStr = amount.toString();
  const multiplier = BigInt(10 ** token.decimals);
  
  if (amountStr.includes('.')) {
    const [whole, decimal] = amountStr.split('.');
    const paddedDecimal = decimal.padEnd(token.decimals, '0').slice(0, token.decimals);
    return BigInt(whole || '0') * multiplier + BigInt(paddedDecimal);
  }
  
  return BigInt(amountStr) * multiplier;
};

export const getTokenList = (): Token[] => {
  return Object.values(SUPPORTED_TOKENS);
};