import https from 'https';

const symbols = ['TTB.BK', 'SIRI.BK', 'IRPC.BK', 'WHA.BK', 'BANPU.BK', 'TRUE.BK', 'BDMS.BK', 'DELTA.BK', '^SET.BK'];

symbols.forEach(symbol => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.chart && json.chart.result && json.chart.result[0]) {
          const result = json.chart.result[0];
          console.log(`${symbol}: Price = ${result.meta.regularMarketPrice}, PrevClose = ${result.meta.chartPreviousClose}`);
        } else {
          console.log(`${symbol}: Failed to get result`);
        }
      } catch (e) {
        console.log(`${symbol}: Error parsing`, e.message);
      }
    });
  }).on('error', (e) => {
    console.log(`${symbol}: Error fetching`, e.message);
  });
});
