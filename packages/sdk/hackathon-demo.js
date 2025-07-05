#!/usr/bin/env node

/**
 * 🎯 HACKATHON LIVE DEMO SCRIPT
 * 
 * Perfect for live presentation during hackathon!
 * Shows real-time multi-chain CDN URL generation
 */

const { 
  getWalrusCDNUrl, 
  getAvailableChains, 
  getBlobStatus,
  isSupportedChain,
  getChainEndpoint
} = require('./dist/index.js');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorLog(color, text) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hackathonDemo() {
  console.clear();
  
  // 🎯 Title and Introduction
  colorLog('cyan', '🚀 WCDN HACKATHON LIVE DEMO');
  colorLog('cyan', '==========================');
  colorLog('white', '多鏈 Walrus CDN - 一行 code 搞定三條鏈！');
  
  await sleep(1000);
  
  // 📋 Step 1: Show Available Chains
  colorLog('yellow', '\n📋 STEP 1: 查看支援的區塊鏈');
  colorLog('yellow', '-----------------------------');
  
  const chains = getAvailableChains();
  Object.entries(chains).forEach(([chain, config]) => {
    const statusEmoji = config.status === 'active' ? '🟢' : '🔶';
    colorLog('white', `  ${statusEmoji} ${chain.toUpperCase()}: ${config.primary}`);
    colorLog('white', `     狀態: ${config.status === 'active' ? '真實 Walrus 網路' : 'Hackathon Mock'}`);
  });
  
  await sleep(2000);
  
  // 🔗 Step 2: One-line URL Generation Demo
  colorLog('green', '\n🔗 STEP 2: 一行 code 多鏈 CDN URL 生成');
  colorLog('green', '--------------------------------------');
  
  // Real blob ID from our upload
  const realBlobId = 'XjiDG_QgYacgyaug_Nb9Rk_Q137OhAvDwB6V7jxzqK0';
  colorLog('white', `📄 使用真實 Blob ID: ${realBlobId}`);
  
  await sleep(1000);
  
  // Generate URLs for each chain
  colorLog('blue', '\n💻 Live Code Demo:');
  console.log(`${colors.magenta}import { getWalrusCDNUrl } from 'wcdn-sdk';${colors.reset}`);
  
  await sleep(1000);
  
  // Sui (real)
  colorLog('green', '\n🟢 SUI (Active - Real Walrus Network):');
  console.log(`${colors.magenta}const suiUrl = getWalrusCDNUrl('${realBlobId}', { chain: 'sui' });${colors.reset}`);
  const suiUrl = getWalrusCDNUrl(realBlobId, { chain: 'sui' });
  colorLog('cyan', `   ↳ ${suiUrl}`);
  
  await sleep(1500);
  
  // Ethereum (mock)
  colorLog('yellow', '\n🔶 ETHEREUM (Mock for Hackathon):');
  console.log(`${colors.magenta}const ethUrl = getWalrusCDNUrl('${realBlobId}', { chain: 'ethereum' });${colors.reset}`);
  const ethUrl = getWalrusCDNUrl(realBlobId, { chain: 'ethereum' });
  colorLog('cyan', `   ↳ ${ethUrl}`);
  
  await sleep(1500);
  
  // Solana (mock)
  colorLog('yellow', '\n🔶 SOLANA (Mock for Hackathon):');
  console.log(`${colors.magenta}const solUrl = getWalrusCDNUrl('${realBlobId}', { chain: 'solana' });${colors.reset}`);
  const solUrl = getWalrusCDNUrl(realBlobId, { chain: 'solana' });
  colorLog('cyan', `   ↳ ${solUrl}`);
  
  await sleep(2000);
  
  // 🧪 Step 3: Live URL Testing
  colorLog('blue', '\n🧪 STEP 3: 即時 URL 測試');
  colorLog('blue', '----------------------');
  
  colorLog('white', '測試 Sui URL 是否真的可以存取...');
  
  try {
    const response = await fetch(suiUrl, { method: 'HEAD' });
    if (response.ok) {
      colorLog('green', `✅ SUCCESS! Sui URL 正常運作 (${response.status})`);
      colorLog('green', `   Content-Type: ${response.headers.get('content-type')}`);
      colorLog('green', `   Content-Length: ${response.headers.get('content-length')} bytes`);
    } else {
      colorLog('red', `❌ Sui URL 回應異常: ${response.status}`);
    }
  } catch (error) {
    colorLog('red', `❌ 網路錯誤: ${error.message}`);
  }
  
  await sleep(2000);
  
  // 📊 Step 4: Multi-chain Status Demo
  colorLog('magenta', '\n📊 STEP 4: 多鏈狀態查詢 (Mock Demo)');
  colorLog('magenta', '------------------------------------');
  
  colorLog('white', '查詢 Blob 在各鏈的可用性...');
  
  try {
    const status = await getBlobStatus(realBlobId);
    colorLog('cyan', `\n📄 Blob ID: ${status.blobId}`);
    colorLog('cyan', `🌐 可用的鏈: ${status.summary.availableChains.join(', ')}`);
    colorLog('cyan', `⚡ 最佳鏈: ${status.summary.bestChain}`);
    
    Object.entries(status.chains).forEach(([chain, info]) => {
      const emoji = info.exists ? '✅' : '❌';
      const latency = info.latency ? `${info.latency}ms` : 'N/A';
      colorLog('white', `   ${emoji} ${chain.toUpperCase()}: ${latency}`);
    });
  } catch (error) {
    colorLog('red', `❌ 狀態查詢錯誤: ${error.message}`);
  }
  
  await sleep(2000);
  
  // 🎯 Step 5: Use Cases Demo
  colorLog('yellow', '\n🎯 STEP 5: 實際應用場景');
  colorLog('yellow', '------------------------');
  
  const useCases = [
    { name: 'NFT 圖片', blob: 'nft_image_abc123' },
    { name: '遊戲素材', blob: 'game_texture_def456' },
    { name: '文件備份', blob: 'document_backup_ghi789' }
  ];
  
  useCases.forEach((useCase, index) => {
    colorLog('cyan', `\n${index + 1}. ${useCase.name}:`);
    ['sui', 'ethereum', 'solana'].forEach(chain => {
      const url = getWalrusCDNUrl(useCase.blob, { chain });
      const shortUrl = url.split('/').pop();
      colorLog('white', `   ${chain}: .../${shortUrl}`);
    });
  });
  
  await sleep(2000);
  
  // 🏆 Step 6: Hackathon Highlights
  colorLog('green', '\n🏆 HACKATHON 亮點總結');
  colorLog('green', '=====================');
  
  const highlights = [
    '✅ 一行 code 支援三條鏈 (Sui/Ethereum/Solana)',
    '✅ TypeScript 型別安全',
    '✅ 可擴展架構 (輕鬆新增新鏈)',
    '✅ 真實 Walrus 網路整合 (Sui)',
    '✅ Mock 實作展示未來可能性',
    '✅ 豐富的錯誤處理',
    '✅ 支援自訂 aggregator endpoint'
  ];
  
  highlights.forEach(highlight => {
    colorLog('green', `  ${highlight}`);
  });
  
  await sleep(1000);
  
  colorLog('cyan', '\n📚 技術實作特色:');
  const techFeatures = [
    '🔧 Endpoint 配置管理',
    '🛡️ 鏈支援驗證',
    '⚡ 快速 URL 生成',
    '📊 多鏈狀態追蹤',
    '🎯 面向未來的設計'
  ];
  
  techFeatures.forEach(feature => {
    colorLog('cyan', `  ${feature}`);
  });
  
  await sleep(2000);
  
  // 🚀 Final Call to Action
  colorLog('magenta', '\n🚀 Q&A 時間');
  colorLog('magenta', '============');
  colorLog('white', '想了解更多？問題包括：');
  colorLog('white', '• 如何新增支援新的區塊鏈？');
  colorLog('white', '• 如何確保 URL 的安全性？');
  colorLog('white', '• 實際部署的考量？');
  colorLog('white', '• 與現有 DApp 的整合方式？');
  
  colorLog('yellow', '\n🎯 感謝觀看 WCDN 多鏈 CDN 解決方案！');
}

// 🎬 Run the demo
if (require.main === module) {
  hackathonDemo().catch(console.error);
}

module.exports = { hackathonDemo };