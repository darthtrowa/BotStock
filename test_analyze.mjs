fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stocksData: [{symbol: 'PTT', price: 35}] })
}).then(r => r.json()).then(console.log).catch(console.error);
