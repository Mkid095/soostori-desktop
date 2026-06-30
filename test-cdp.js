const http = require('http');

// CDP WebSocket connection using Node's built-in net module
const net = require('net');
const WebSocket = net.createConnection({ host: 'localhost', port: 9222 }, () => {
  console.log('Connected to CDP port');
});

let id = 1;
const pending = {};
let buffer = '';

WebSocket.on('data', (chunk) => {
  buffer += chunk.toString();
  // Try to parse complete JSON messages (separated by newlines)
  const lines = buffer.split('\n');
  buffer = lines.pop() || '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending[msg.id]) {
        pending[msg.id](msg);
        delete pending[msg.id];
      }
    } catch(e) {}
  }
});

WebSocket.on('error', (e) => console.error('Net error:', e.message));

function send(method, params = {}) {
  return new Promise((resolve) => {
    const mid = id++;
    pending[mid] = resolve;
    WebSocket.write(JSON.stringify({ id: mid, method, params }) + '\n');
    setTimeout(() => { if (pending[mid]) { delete pending[mid]; resolve(null); } }, 5000);
  });
}

async function run() {
  // First, get the page list
  const pageList = await send('Http.get', { path: '/json' });
  console.log('Page list:', pageList ? pageList.substring(0, 500) : 'null');
  
  // Try to evaluate in the page
  const result = await send('Runtime.evaluate', { 
    expression: 'typeof window.electronAPI',
    returnByValue: true 
  });
  console.log('electronAPI type:', result?.result?.value);
  
  if (result?.result?.value === 'object') {
    const createResult = await send('Runtime.evaluate', {
      expression: `JSON.stringify(await window.electronAPI.db.createProduct({ name: "Test", sellingPrice: 100, costPrice: 50, unit: "piece", stockQuantity: 5 }).catch(e => e.message))`,
      returnByValue: true
    });
    console.log('createProduct:', createResult?.result?.value);
  }
  
  WebSocket.end();
  process.exit(0);
}

setTimeout(() => { console.log('Timeout'); process.exit(1); }, 10000);
run();
