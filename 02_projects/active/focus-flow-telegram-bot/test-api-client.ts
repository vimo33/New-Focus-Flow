/**
 * Quick test script for API client
 * Run with: ts-node test-api-client.ts
 */

import apiClient from './src/services/api-client';
import dotenv from 'dotenv';

dotenv.config();

async function testApiClient() {
  console.log('==========================================');
  console.log('Testing API Client');
  console.log('==========================================');
  console.log('');

  try {
    // Test 1: Send Capture
    console.log('Test 1: Sending capture...');
    const captureResult = await apiClient.sendCapture({
      text: 'Test capture from Telegram bot',
      source: 'telegram',
      metadata: {
        test: true,
        userId: 123456,
        username: 'testuser'
      }
    });
    console.log('✅ Capture successful!');
    console.log('   Item ID:', captureResult.id);
    console.log('   Status:', captureResult.status);
    console.log('');

    // Test 2: Get Inbox Counts
    console.log('Test 2: Fetching inbox counts...');
    const counts = await apiClient.getInboxCounts();
    console.log('✅ Inbox counts retrieved!');
    console.log('   All:', counts.all);
    console.log('   Work:', counts.work);
    console.log('   Personal:', counts.personal);
    console.log('   Ideas:', counts.ideas);
    console.log('');

    // Test 3: Fetch All Inbox Items
    console.log('Test 3: Fetching all inbox items...');
    const items = await apiClient.fetchInbox();
    console.log('✅ Inbox items retrieved!');
    console.log('   Count:', items.length);
    if (items.length > 0) {
      console.log('   First item:', items[0].text.substring(0, 50) + '...');
    }
    console.log('');

    // Test 4: Fetch Work Items
    console.log('Test 4: Fetching work items...');
    const workItems = await apiClient.fetchInbox('work');
    console.log('✅ Work items retrieved!');
    console.log('   Count:', workItems.length);
    console.log('');

    // Test 5: Get Specific Item (if we have one)
    if (items.length > 0) {
      console.log('Test 5: Fetching specific item...');
      const item = await apiClient.getInboxItem(items[0].id);
      console.log('✅ Item retrieved!');
      console.log('   ID:', item.id);
      console.log('   Text:', item.text);
      console.log('   Category:', item.category || 'none');
      console.log('');
    }

    console.log('==========================================');
    console.log('All tests passed! ✅');
    console.log('==========================================');
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error('');
    console.error('Make sure the backend API is running on localhost:3001');
    console.error('Start it with: cd ../focus-flow-backend && npm run dev');
    process.exit(1);
  }
}

testApiClient();
