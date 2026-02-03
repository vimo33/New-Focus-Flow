#!/usr/bin/env ts-node

/**
 * End-to-End Test Suite for Telegram Bot
 *
 * This script tests the Telegram bot integration without requiring a real Telegram client.
 * It directly tests the API endpoints that the bot uses.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';
const API_KEY = process.env.BACKEND_API_KEY || '';

// Test results storage
interface TestResult {
  testNumber: number;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper function to make API calls
async function apiCall(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: any
): Promise<{ status: number; data: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

// Test runner
async function runTest(
  testNumber: number,
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  console.log(`\n[Test ${testNumber}] ${testName}...`);

  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({
      testNumber,
      testName,
      status: 'PASS',
      duration,
      message: 'Test passed',
    });
    console.log(`✅ PASS (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      testNumber,
      testName,
      status: 'FAIL',
      duration,
      message,
      details: error,
    });
    console.log(`❌ FAIL (${duration}ms): ${message}`);
  }
}

// Helper to assert conditions
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  console.log('==========================================');
  console.log('Focus Flow Telegram Bot - E2E Test Suite');
  console.log('==========================================');
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log('');

  // Test 1: Health check
  await runTest(1, 'Backend API Health Check', async () => {
    const { status, data } = await apiCall('/health');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'healthy', 'Backend is not healthy');
    assert(data.service === 'focus-flow-backend', 'Wrong service name');
  });

  // Test 2: Capture single item
  let itemId1: string;
  await runTest(2, 'Capture Command - Buy groceries', async () => {
    const { status, data } = await apiCall('/api/capture', 'POST', {
      text: 'Buy groceries',
      source: 'telegram',
      metadata: {
        userId: 12345,
        username: 'testuser',
        firstName: 'Test',
      },
    });
    assert(status === 201 || status === 200, `Expected 200 or 201, got ${status}`);
    assert(data.id, 'No item ID returned');
    assert(data.status === 'created', `Expected status 'created', got ${data.status}`);
    itemId1 = data.id;
  });

  // Test 3: Capture another item
  let itemId2: string;
  await runTest(3, 'Capture Command - Remember to call mom', async () => {
    const { status, data } = await apiCall('/api/capture', 'POST', {
      text: 'Remember to call mom tonight',
      source: 'telegram',
      metadata: {
        userId: 12345,
        username: 'testuser',
        firstName: 'Test',
      },
    });
    assert(status === 201 || status === 200, `Expected 200 or 201, got ${status}`);
    assert(data.id, 'No item ID returned');
    itemId2 = data.id;
  });

  // Test 4: Get inbox counts
  await runTest(4, 'Inbox Command - Get Counts', async () => {
    const { status, data } = await apiCall('/api/inbox/counts');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(typeof data.all === 'number', 'All count is not a number');
    assert(typeof data.work === 'number', 'Work count is not a number');
    assert(typeof data.personal === 'number', 'Personal count is not a number');
    assert(typeof data.ideas === 'number', 'Ideas count is not a number');
    assert(data.all >= 2, `Expected at least 2 items, got ${data.all}`);
  });

  // Test 5: Get all inbox items
  await runTest(5, 'Inbox Command - Get All Items', async () => {
    const { status, data } = await apiCall('/api/inbox');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.items), 'Items is not an array');
    assert(data.items.length >= 2, `Expected at least 2 items, got ${data.items.length}`);
    const firstItem = data.items[0];
    assert(firstItem.id, 'Item has no ID');
    assert(firstItem.text, 'Item has no text');
  });

  // Test 6: Get filtered inbox (personal)
  await runTest(6, 'Inbox Command - Filter Personal', async () => {
    const { status, data } = await apiCall('/api/inbox?filter=personal');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.items), 'Items is not an array');
  });

  // Test 7: Get filtered inbox (work)
  await runTest(7, 'Inbox Command - Filter Work', async () => {
    const { status, data } = await apiCall('/api/inbox?filter=work');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.items), 'Items is not an array');
  });

  // Test 8: Get filtered inbox (ideas)
  await runTest(8, 'Inbox Command - Filter Ideas', async () => {
    const { status, data } = await apiCall('/api/inbox?filter=ideas');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.items), 'Items is not an array');
  });

  // Test 9: Get specific item
  await runTest(9, 'Process Command - Get Item Details', async () => {
    console.log(`  Fetching item: ${itemId1}`);
    const { status, data } = await apiCall(`/api/inbox/${itemId1}`);
    assert(status === 200, `Expected 200, got ${status}. Response: ${JSON.stringify(data)}`);
    assert(data.id === itemId1, `Wrong item ID: expected ${itemId1}, got ${data.id}`);
    assert(data.text === 'Buy groceries', `Wrong item text: expected 'Buy groceries', got ${data.text}`);
    assert(data.source === 'telegram', `Wrong source: expected 'telegram', got ${data.source}`);
  });

  // Test 10: Process item as task
  await runTest(10, 'Process Action - Convert to Task', async () => {
    const { status, data } = await apiCall(`/api/inbox/${itemId1}/process`, 'POST', {
      action: 'task',
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'processed' || data.status === 'success', `Wrong status: ${data.status}`);
  });

  // Test 11: Process item as project
  await runTest(11, 'Process Action - Convert to Project', async () => {
    const { status } = await apiCall(`/api/inbox/${itemId2}/process`, 'POST', {
      action: 'project',
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // Test 12: Process item as idea
  let itemId3: string;
  await runTest(12, 'Capture and Process - Save as Idea', async () => {
    const captureRes = await apiCall('/api/capture', 'POST', {
      text: 'Create a time management system',
      source: 'telegram',
      metadata: { userId: 12345 },
    });
    assert(captureRes.status === 201 || captureRes.status === 200, `Capture failed with status ${captureRes.status}: ${JSON.stringify(captureRes.data)}`);
    itemId3 = captureRes.data.id;

    const { status } = await apiCall(`/api/inbox/${itemId3}/process`, 'POST', {
      action: 'idea',
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // Test 13: Archive item
  let itemId4: string;
  await runTest(13, 'Process Action - Archive Item', async () => {
    const captureRes = await apiCall('/api/capture', 'POST', {
      text: 'Old completed task',
      source: 'telegram',
      metadata: { userId: 12345 },
    });
    itemId4 = captureRes.data.id;

    const { status } = await apiCall(`/api/inbox/${itemId4}/process`, 'POST', {
      action: 'archive',
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // Test 14: Delete item
  let itemId5: string;
  await runTest(14, 'Process Action - Delete Item', async () => {
    const captureRes = await apiCall('/api/capture', 'POST', {
      text: 'This will be deleted',
      source: 'telegram',
      metadata: { userId: 12345 },
    });
    itemId5 = captureRes.data.id;

    const { status } = await apiCall(`/api/inbox/${itemId5}/process`, 'POST', {
      action: 'delete',
    });
    assert(status === 200, `Expected 200, got ${status}`);
  });

  // Test 15: Error handling - invalid item ID
  await runTest(15, 'Error Handling - Invalid Item ID', async () => {
    const { status } = await apiCall('/api/inbox/invalid_id_12345');
    assert(status !== 200, 'Expected non-200 status for invalid ID');
  });

  // Test 16: Error handling - invalid filter
  await runTest(16, 'Error Handling - Invalid Filter', async () => {
    const { status, data } = await apiCall('/api/inbox?filter=invalid_filter');
    // API returns 200 with empty items for invalid filter
    assert(status === 200, `Expected 200 status, got ${status}`);
    assert(Array.isArray(data.items), 'Items should be an array');
    assert(data.items.length === 0, 'Invalid filter should return empty items');
  });

  // Test 17: Bulk capture
  await runTest(17, 'Bulk Capture - Multiple Items', async () => {
    for (let i = 1; i <= 3; i++) {
      const { status } = await apiCall('/api/capture', 'POST', {
        text: `Bulk capture item ${i}`,
        source: 'telegram',
        metadata: { userId: 12345 },
      });
      assert(status === 201 || status === 200, `Bulk capture ${i} failed with status ${status}`);
    }
  });

  // Test 18: Verify files created in vault
  await runTest(18, 'Vault Integration - Files Created', async () => {
    const vaultPath = process.env.VAULT_PATH || '/srv/focus-flow';
    const inboxPath = path.join(vaultPath, '00_inbox', 'raw');

    assert(fs.existsSync(inboxPath), `Inbox path does not exist: ${inboxPath}`);

    const files = fs.readdirSync(inboxPath);
    assert(files.length > 0, 'No files created in vault');
  });

  // Test 19: Capture with long text
  await runTest(19, 'Edge Case - Long Text Capture', async () => {
    const longText = 'A'.repeat(1000);
    const { status, data } = await apiCall('/api/capture', 'POST', {
      text: longText,
      source: 'telegram',
      metadata: { userId: 12345 },
    });
    assert(status === 201 || status === 200, `Expected 200 or 201, got ${status}`);
    assert(data.id, 'No item ID returned for long text');
  });

  // Test 20: Capture with special characters
  await runTest(20, 'Edge Case - Special Characters', async () => {
    const specialText = 'Test with émojis 🎉 and spëcial çharacters!';
    const { status, data } = await apiCall('/api/capture', 'POST', {
      text: specialText,
      source: 'telegram',
      metadata: { userId: 12345 },
    });
    assert(status === 201 || status === 200, `Expected 200 or 201, got ${status}`);
    assert(data.id, 'No item ID returned for special characters');
  });

  // Print summary
  console.log('\n\n==========================================');
  console.log('Test Results Summary');
  console.log('==========================================\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Skipped: ${skipped} ⏭️`);
  console.log(`Total Time: ${totalTime}ms\n`);

  // Print failed tests
  if (failed > 0) {
    console.log('Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  [Test ${r.testNumber}] ${r.testName}`);
        console.log(`    Error: ${r.message}\n`);
      });
  }

  // Write results to file
  const reportPath = path.join(__dirname, 'test-results', 'e2e-test-results.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  console.log(`\nTest results saved to: ${reportPath}`);
  console.log('==========================================\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
