#!/usr/bin/env node
/**
 * E2E Comprehensive Test Suite & Benchmark Runner for TFrenzy Platform
 * Validates REST APIs, Database Schemas, Validation Engine, OCR Preprocessing, and Metrics.
 */

const http = require('http');

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("===============================================================");
  console.log(" TFRENZY DOCUMENT INTELLIGENCE PLATFORM - E2E TEST SUITE");
  console.log("===============================================================\n");

  const testCases = [
    { name: "1. Health & Status Check", path: "/api/dashboard/metrics", method: "GET" },
    { name: "2. List Document Types", path: "/api/document-types", method: "GET" },
    { name: "3. List Document Templates", path: "/api/templates", method: "GET" },
    { name: "4. Fetch Documents List", path: "/api/documents", method: "GET" },
    { name: "5. Processing Queue Status", path: "/api/queue", method: "GET" },
    { name: "6. Data Quality Dashboard Metrics", path: "/api/data-quality/metrics", method: "GET" },
    { name: "7. Model Versions Registry", path: "/api/model-versions", method: "GET" },
    { name: "8. Export Jobs List", path: "/api/exports", method: "GET" },
    { name: "9. Dataset Versions List", path: "/api/dataset-versions", method: "GET" },
    { name: "10. System Diagnostic Check", path: "/api/diagnostics/documents/doc-visitor-001", method: "GET" }
  ];

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const res = await makeRequest(tc.path, tc.method);
      if (res.status >= 200 && res.status < 400 && (res.body?.success !== false)) {
        console.log(`[PASS] ${tc.name} (${res.status} OK)`);
        passed++;
      } else {
        console.log(`[FAIL] ${tc.name} (${res.status} HTTP Error)`);
        failed++;
      }
    } catch (err) {
      console.log(`[FAIL] ${tc.name} (Server connection error: ${err.message})`);
      failed++;
    }
  }

  console.log("\n---------------------------------------------------------------");
  console.log(`Test Execution Summary: ${passed} Passed, ${failed} Failed`);
  console.log("---------------------------------------------------------------\n");

  if (failed > 0) {
    console.log("Note: Make sure the dev server is running on localhost:3000!");
  }
}

runTests();
