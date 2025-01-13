declare module 'yfinance' {
  interface NewsItem {
    title: string;
    description?: string;
    link: string;
    publisher?: string;
    providerPublishTime: number;
  }

  interface Ticker {
    news: NewsItem[];
  }

  function Ticker(symbol: string): Promise<Ticker>;
  
  const yfinance = { Ticker };
  export { Ticker };
  export default yfinance;
} 