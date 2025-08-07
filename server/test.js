import { io } from 'socket.io-client';

// Test script for the video chat server
async function testServer() {
  console.log('🧪 Testing Video Chat Server...\n');

  try {
    // Test 1: Connect to server
    console.log('1. Testing server connection...');
    const socket = io('http://localhost:3001');
    
    await new Promise((resolve, reject) => {
      socket.on('connect', () => {
        console.log('✅ Connected to server successfully');
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        console.log('❌ Connection failed:', error.message);
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Test 2: Check user data
    console.log('\n2. Testing user data...');
    await new Promise((resolve) => {
      socket.on('userData', (data) => {
        console.log('✅ Received user data:', data);
        resolve();
      });
    });

    // Test 3: Test search functionality
    console.log('\n3. Testing search functionality...');
    socket.emit('startSearch');
    
    await new Promise((resolve) => {
      socket.on('searchStarted', () => {
        console.log('✅ Search started successfully');
        resolve();
      });
    });

    // Test 4: Test chat message
    console.log('\n4. Testing chat message...');
    socket.emit('sendMessage', { text: 'Hello from test!' });
    console.log('✅ Message sent');

    // Test 5: Test stop functionality
    console.log('\n5. Testing stop functionality...');
    socket.emit('stop');
    
    await new Promise((resolve) => {
      socket.on('stopped', () => {
        console.log('✅ Stop functionality working');
        resolve();
      });
    });

    // Test 6: Disconnect
    console.log('\n6. Testing disconnect...');
    socket.disconnect();
    console.log('✅ Disconnected successfully');

    console.log('\n🎉 All tests passed! Server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testServer(); 