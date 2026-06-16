import type { Stock, Portfolio, TradeSignal, Transaction } from './types';

export const INITIAL_STOCKS: Stock[] = [
  {
    symbol: 'TTB',
    name: 'ธนาคารทหารไทยธนชาต จำกัด (มหาชน)',
    currentPrice: 2.34,
    bidPrice: 2.32,
    offerPrice: 2.36,
    openPrice: 2.32,
    highPrice: 2.36,
    lowPrice: 2.30,
    change: 0.02,
    changePercent: 0.86,
    volume: 120450000,
    history: [2.26, 2.28, 2.30, 2.28, 2.32, 2.34, 2.32, 2.34, 2.32, 2.34],
    theme: 'Finance'
  },
  {
    symbol: 'SIRI',
    name: 'บริษัท แสนสิริ จำกัด (มหาชน)',
    currentPrice: 1.43,
    bidPrice: 1.42,
    offerPrice: 1.44,
    openPrice: 1.43,
    highPrice: 1.45,
    lowPrice: 1.41,
    change: 0.00,
    changePercent: 0.00,
    volume: 85200000,
    history: [1.46, 1.45, 1.44, 1.45, 1.43, 1.43, 1.42, 1.44, 1.43, 1.43],
    theme: 'Property & Construction'
  },
  {
    symbol: 'IRPC',
    name: 'บริษัท ไออาร์พีซี จำกัด (มหาชน)',
    currentPrice: 1.94,
    bidPrice: 1.93,
    offerPrice: 1.95,
    openPrice: 2.02,
    highPrice: 2.04,
    lowPrice: 1.93,
    change: -0.08,
    changePercent: -3.96,
    volume: 45800000,
    history: [2.06, 2.04, 2.02, 2.04, 2.00, 1.98, 1.96, 1.96, 1.94, 1.94],
    theme: 'Energy & Resources'
  },
  {
    symbol: 'WHA',
    name: 'บริษัท ดับบลิวเอชเอ คอร์ปอเรชั่น จำกัด (มหาชน)',
    currentPrice: 5.10,
    bidPrice: 5.05,
    offerPrice: 5.15,
    openPrice: 5.00,
    highPrice: 5.15,
    lowPrice: 4.98,
    change: 0.10,
    changePercent: 2.00,
    volume: 38400000,
    history: [4.86, 4.90, 4.92, 4.96, 4.94, 4.98, 5.00, 5.05, 5.00, 5.10],
    theme: 'Property & Construction'
  },
  {
    symbol: 'BANPU',
    name: 'บริษัท บ้านปู จำกัด (มหาชน)',
    currentPrice: 5.95,
    bidPrice: 5.90,
    offerPrice: 6.00,
    openPrice: 5.95,
    highPrice: 6.05,
    lowPrice: 5.90,
    change: 0.00,
    changePercent: 0.00,
    volume: 52100000,
    history: [6.10, 6.05, 6.00, 5.95, 6.00, 5.95, 5.90, 5.95, 5.95, 5.95],
    theme: 'Energy & Resources'
  },
  {
    symbol: 'TRUE',
    name: 'บริษัท ทรู คอร์ปอเรชั่น จำกัด (มหาชน)',
    currentPrice: 13.90,
    bidPrice: 13.80,
    offerPrice: 14.00,
    openPrice: 13.80,
    highPrice: 14.10,
    lowPrice: 13.70,
    change: 0.10,
    changePercent: 0.72,
    volume: 64100000,
    history: [13.20, 13.40, 13.50, 13.60, 13.50, 13.70, 13.80, 13.90, 13.80, 13.90],
    theme: 'ICT'
  },
  {
    symbol: 'BDMS',
    name: 'บริษัท กรุงเทพดุสิตเวชการ จำกัด(มหาชน)',
    currentPrice: 18.30,
    bidPrice: 18.20,
    offerPrice: 18.40,
    openPrice: 18.10,
    highPrice: 18.50,
    lowPrice: 18.00,
    change: 0.20,
    changePercent: 1.10,
    volume: 24500000,
    history: [18.50, 18.40, 18.20, 18.30, 18.10, 18.00, 18.20, 18.30, 18.10, 18.30],
    theme: 'Health Care Services'
  },
  {
    symbol: 'DELTA',
    name: 'บริษัท เดลต้า อีเลคโทรนิคส์ (ประเทศไทย) จำกัด (มหาชน)',
    currentPrice: 337.00,
    bidPrice: 336.00,
    offerPrice: 338.00,
    openPrice: 332.00,
    highPrice: 340.00,
    lowPrice: 330.00,
    change: 5.00,
    changePercent: 1.51,
    volume: 18900000,
    history: [320.00, 325.00, 322.00, 328.00, 330.00, 332.00, 335.00, 337.00, 332.00, 337.00],
    theme: 'Electronic Components'
  }
];

const todayStr = new Date().toISOString().split('T')[0];

export const INITIAL_BOT_PORTFOLIO: Portfolio = {
  cash: 2000.00, 
  startingCapital: 2000.00,
  tradesToday: 0,
  lastTradeDate: todayStr,
  positions: [],
  pendingOrders: []
};

export const INITIAL_USER_PORTFOLIO: Portfolio = {
  cash: 2000.00,
  startingCapital: 2000.00,
  tradesToday: 0,
  lastTradeDate: todayStr,
  positions: [],
  pendingOrders: []
};

export const INITIAL_BOT_SIGNALS: TradeSignal[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];
