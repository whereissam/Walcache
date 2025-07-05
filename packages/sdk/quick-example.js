/**
 * Quick example showing the exact usage pattern requested
 */
import { getWalrusCDNUrl } from './dist/index.mjs';

// Example 1: The exact pattern you requested
const url = getWalrusCDNUrl("sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0", {
  baseUrl: "http://localhost:4500",
  secure: false
});

console.log('🎯 Exact usage pattern:');
console.log('import { getWalrusCDNUrl } from "@walrus/cdn";');
console.log('const url = getWalrusCDNUrl("bafy...", { baseUrl: "https://cdn.yoursite.com" });');
console.log('');
console.log('Result:', url);
console.log('');

// Example 2: Production usage
const prodUrl = getWalrusCDNUrl("sibZ297_DArzpYdVbxFegC3WYMLPwglE_ml0v3c8am0", {
  baseUrl: "https://cdn.yoursite.com"
});

console.log('📦 Production example:');
console.log('Result:', prodUrl);