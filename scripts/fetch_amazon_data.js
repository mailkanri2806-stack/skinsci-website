/**
 * SKINSCI - Amazon PA-API v5 商品情報取得スクリプト
 *
 * 使用方法:
 *   1. .env にAPI認証情報を設定
 *   2. node scripts/fetch_amazon_data.js
 *
 * 必要な環境変数:
 *   AMAZON_PA_ACCESS_KEY, AMAZON_PA_SECRET_KEY, AMAZON_PA_ASSOCIATE_TAG
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// .env 読み込み
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, ...vals] = line.split('=');
      if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
    });
  }
} catch (e) { /* .env optional */ }

const ACCESS_KEY = process.env.AMAZON_PA_ACCESS_KEY;
const SECRET_KEY = process.env.AMAZON_PA_SECRET_KEY;
const ASSOCIATE_TAG = process.env.AMAZON_PA_ASSOCIATE_TAG || 'skinscilab22-22';
const REGION = process.env.AMAZON_PA_REGION || 'jp';
const HOST = 'webservices.amazon.co.jp';

if (!ACCESS_KEY || !SECRET_KEY) {
  console.error('エラー: .env に AMAZON_PA_ACCESS_KEY と AMAZON_PA_SECRET_KEY を設定してください。');
  console.error('.env.example を参考にしてください。');
  process.exit(1);
}

// PA-API v5 署名生成
function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg).digest();
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = sign('AWS4' + key, dateStamp);
  const kRegion = sign(kDate, regionName);
  const kService = sign(kRegion, serviceName);
  return sign(kService, 'aws4_request');
}

async function fetchAmazonProduct(asin) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.substring(0, 8);

  const payload = JSON.stringify({
    ItemIds: [asin],
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'Offers.Listings.Price'
    ],
    PartnerTag: ASSOCIATE_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.co.jp'
  });

  const canonicalUri = '/paapi5/getitems';
  const canonicalQuerystring = '';
  const contentType = 'application/json; charset=UTF-8';
  const canonicalHeaders = 'content-encoding:amz-1.0\ncontent-type:' + contentType + '\nhost:' + HOST + '\nx-amz-date:' + amzDate + '\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n';
  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';

  const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');
  const canonicalRequest = 'POST\n' + canonicalUri + '\n' + canonicalQuerystring + '\n' + canonicalHeaders + '\n' + signedHeaders + '\n' + payloadHash;

  const credentialScope = dateStamp + '/us-east-1/ProductAdvertisingAPI/aws4_request';
  const stringToSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + credentialScope + '\n' + crypto.createHash('sha256').update(canonicalRequest).digest('hex');

  const signingKey = getSignatureKey(SECRET_KEY, dateStamp, 'us-east-1', 'ProductAdvertisingAPI');
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authHeader = 'AWS4-HMAC-SHA256 Credential=' + ACCESS_KEY + '/' + credentialScope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      path: canonicalUri,
      method: 'POST',
      headers: {
        'content-encoding': 'amz-1.0',
        'content-type': contentType,
        'host': HOST,
        'x-amz-date': amzDate,
        'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
        'Authorization': authHeader
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse error: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function parseAmazonResponse(response, asin) {
  if (!response || !response.ItemsResult || !response.ItemsResult.Items) return null;
  const item = response.ItemsResult.Items.find(i => i.ASIN === asin);
  if (!item) return null;

  const result = {
    url: 'https://www.amazon.co.jp/dp/' + asin + '?tag=' + ASSOCIATE_TAG,
    price: null,
    image_url: '',
    last_fetched: new Date().toISOString()
  };

  if (item.Offers && item.Offers.Listings && item.Offers.Listings[0]) {
    const listing = item.Offers.Listings[0];
    if (listing.Price && listing.Price.Amount) {
      result.price = Math.round(listing.Price.Amount);
    }
  }

  if (item.Images && item.Images.Primary && item.Images.Primary.Large) {
    result.image_url = item.Images.Primary.Large.URL;
  }

  return result;
}

async function main() {
  const productsPath = path.join(__dirname, '..', 'data', 'products.json');
  const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));

  console.log('Amazon PA-API v5 商品情報取得を開始...');
  console.log('対象商品数:', productsData.products.length);

  for (const product of productsData.products) {
    if (!product.asin) {
      console.log('  スキップ: ' + product.id + ' (ASINなし)');
      continue;
    }

    console.log('  取得中: ' + product.id + ' (ASIN: ' + product.asin + ')');

    try {
      const response = await fetchAmazonProduct(product.asin);
      const result = parseAmazonResponse(response, product.asin);

      if (result) {
        if (!product.amazon) product.amazon = {};
        Object.assign(product.amazon, result);
        console.log('    成功: ¥' + (result.price || '不明'));
      } else {
        console.log('    警告: レスポンスからデータを取得できませんでした');
        if (response && response.Errors) {
          response.Errors.forEach(e => console.log('    エラー:', e.Message));
        }
      }
    } catch (e) {
      console.error('    エラー:', e.message);
    }

    // レート制限: 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // lowest_price_source を更新
  productsData.products.forEach(p => {
    const aPrice = p.amazon && p.amazon.price;
    const qPrice = p.qoo10 && p.qoo10.price;
    if (aPrice && qPrice) {
      p.lowest_price_source = aPrice <= qPrice ? 'amazon' : 'qoo10';
    } else if (aPrice) {
      p.lowest_price_source = 'amazon';
    } else if (qPrice) {
      p.lowest_price_source = 'qoo10';
    } else {
      p.lowest_price_source = null;
    }
  });

  fs.writeFileSync(productsPath, JSON.stringify(productsData, null, 2), 'utf-8');
  console.log('products.json を更新しました。');
}

main().catch(e => {
  console.error('致命的エラー:', e);
  process.exit(1);
});
