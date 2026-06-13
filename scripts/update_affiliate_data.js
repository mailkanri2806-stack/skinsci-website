/**
 * SKINSCI - アフィリエイトデータ一括更新スクリプト
 *
 * 使用方法:
 *   node scripts/update_affiliate_data.js
 *
 * 機能:
 *   1. Amazon PA-API で商品情報を更新
 *   2. Qoo10 メガ割状態を確認
 *   3. lowest_price_source を再計算
 *   4. エラーをログに記録
 *
 * 推奨: タスクスケジューラで毎日朝6時に実行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '..', 'operations', 'reports');
const logFile = path.join(logDir, 'affiliate_errors_' + new Date().toISOString().split('T')[0] + '.log');

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = '[' + timestamp + '] ' + msg;
  console.log(line);
  try {
    fs.appendFileSync(logFile, line + '\n', 'utf-8');
  } catch (e) { /* ignore */ }
}

async function main() {
  log('=== アフィリエイトデータ更新開始 ===');

  // 1. Amazon PA-API
  log('Step 1: Amazon PA-API 実行...');
  try {
    execSync('node ' + path.join(__dirname, 'fetch_amazon_data.js'), {
      stdio: 'inherit',
      timeout: 120000
    });
    log('Amazon PA-API 完了');
  } catch (e) {
    log('Amazon PA-API エラー: ' + (e.message || 'unknown'));
    log('注意: .env にAPIキーが設定されていない場合はスキップされます');
  }

  // 2. Qoo10 メガ割チェック
  log('Step 2: Qoo10 メガ割状態チェック...');
  try {
    const megaSalePath = path.join(__dirname, '..', 'data', 'qoo10_mega_sale.json');
    if (fs.existsSync(megaSalePath)) {
      const megaSale = JSON.parse(fs.readFileSync(megaSalePath, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      if (megaSale.active && megaSale.end_date && megaSale.end_date < today) {
        megaSale.active = false;
        fs.writeFileSync(megaSalePath, JSON.stringify(megaSale, null, 2), 'utf-8');
        log('メガ割期間終了を検出、active を false に更新');
      } else if (megaSale.active) {
        log('メガ割開催中: ' + megaSale.start_date + ' 〜 ' + megaSale.end_date);
      } else {
        log('メガ割は現在開催されていません');
      }
    }
  } catch (e) {
    log('メガ割チェックエラー: ' + e.message);
  }

  log('=== アフィリエイトデータ更新完了 ===');
}

main().catch(e => {
  log('致命的エラー: ' + e.message);
  process.exit(1);
});
