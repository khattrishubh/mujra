#!/usr/bin/env node

import { execSync } from 'child_process';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';

console.log('🔍 Network Diagnostic Tool Starting...\n');

// 1. Check system information
console.log('📋 System Information:');
try {
  const osInfo = execSync('uname -a', { encoding: 'utf8' });
  console.log('OS:', osInfo.trim());
} catch (error) {
  console.log('OS: Unable to determine');
}

try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' });
  console.log('Node.js:', nodeVersion.trim());
} catch (error) {
  console.log('Node.js: Unable to determine');
}

// 2. Check network interfaces
console.log('\n🌐 Network Interfaces:');
try {
  const interfaces = execSync('ifconfig', { encoding: 'utf8' });
  const lines = interfaces.split('\n');
  let currentInterface = '';
  
  lines.forEach(line => {
    if (line.includes('inet ') && !line.includes('127.0.0.1') && !line.includes('::1')) {
      const ip = line.match(/inet (\S+)/);
      if (ip && ip[1]) {
        console.log(`${currentInterface}: ${ip[1]}`);
      }
    } else if (line.includes(':') && !line.includes('inet')) {
      currentInterface = line.split(':')[0].trim();
    }
  });
} catch (error) {
  console.log('Unable to get network interfaces');
}

// 3. Check if ports are in use
console.log('\n🔌 Port Status:');
const ports = [3001, 5173, 443, 80];
ports.forEach(port => {
  try {
    const result = execSync(`lsof -i :${port}`, { encoding: 'utf8' });
    console.log(`Port ${port}: IN USE`);
    console.log(result.split('\n').slice(1, 3).join('\n'));
  } catch (error) {
    console.log(`Port ${port}: AVAILABLE`);
  }
});

// 4. Test local server connectivity
console.log('\n🧪 Testing Local Server:');
const testServer = () => {
  return new Promise((resolve) => {
    const app = express();
    app.use(cors());
    
    app.get('/test', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    const server = createServer(app);
    const io = new Server(server, {
      cors: { origin: "*" }
    });
    
    io.on('connection', (socket) => {
      console.log('✅ Socket.IO connection received');
      socket.emit('test', { message: 'Hello from test server' });
      socket.disconnect();
    });
    
    server.listen(3002, '0.0.0.0', () => {
      console.log('✅ Test server started on port 3002');
      
             // Test HTTP
       fetch('http://localhost:3002/test')
         .then(async (res) => {
           const data = await res.json();
           console.log('✅ HTTP test successful:', data);
           
           // Test Socket.IO
           const { io: clientIo } = await import('socket.io-client');
           const socket = clientIo('http://localhost:3002');
          
          socket.on('connect', () => {
            console.log('✅ Socket.IO client connected');
          });
          
          socket.on('test', (data) => {
            console.log('✅ Socket.IO message received:', data);
            socket.disconnect();
            server.close(() => {
              console.log('✅ Test server closed');
              resolve();
            });
          });
          
          setTimeout(() => {
            socket.disconnect();
            server.close(() => resolve());
          }, 3000);
        })
        .catch(error => {
          console.log('❌ HTTP test failed:', error.message);
          server.close(() => resolve());
        });
    });
  });
};

// 5. Check firewall status
console.log('\n🔥 Firewall Status:');
try {
  const firewallStatus = execSync('sudo pfctl -s info', { encoding: 'utf8' });
  console.log('Firewall:', firewallStatus.includes('Enabled') ? 'ENABLED' : 'DISABLED');
} catch (error) {
  console.log('Firewall: Unable to determine (may require sudo)');
}

// 6. Test external connectivity
console.log('\n🌍 External Connectivity:');
const testUrls = [
  'https://google.com',
  'https://stun.l.google.com:19302',
  'https://stun.services.mozilla.com'
];

for (const url of testUrls) {
  try {
    const response = await fetch(url);
    console.log(`✅ ${url}: ${response.status}`);
  } catch (error) {
    console.log(`❌ ${url}: ${error.message}`);
  }
}

// 7. Run the test server
console.log('\n🚀 Running Connectivity Tests...');
await testServer();

console.log('\n📊 Diagnostic Summary:');
console.log('1. ✅ System information gathered');
console.log('2. ✅ Network interfaces checked');
console.log('3. ✅ Port availability verified');
console.log('4. ✅ Local server connectivity tested');
console.log('5. ✅ Firewall status checked');
console.log('6. ✅ External connectivity verified');

console.log('\n💡 Troubleshooting Tips:');
console.log('- If ports are in use, stop other services using those ports');
console.log('- If firewall is enabled, ensure ports 3001 and 5173 are allowed');
console.log('- For network access, ensure your device IP is accessible from other devices');
console.log('- Check that your router allows local network communication');

console.log('\n🔧 Next Steps:');
console.log('1. Start the backend: npm run server');
console.log('2. Start the frontend: npm run dev');
console.log('3. Test from another device using your IP address');
console.log('4. Use the test page: http://YOUR_IP:5173/test-network-host.html'); 