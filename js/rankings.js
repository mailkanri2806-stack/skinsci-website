/**
 * SKINSCI 悩み別ランキング (F-007)
 * data/rankings.json + products.json + voices を読み込みページを動的描画
 */
(function () {
  'use strict';

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s || ''));
    return d.innerHTML;
  }

  var categoryMap = {
    'ranking-acne': 'acne',
    'ranking-oily': 'oily',
    'ranking-shave': 'shave',
    'ranking-pores': 'pores',
    'ranking-dryness': 'dryness',
    'ranking-acne-scar': 'acne_scar'
  };

  var categoryLabels = {
    acne: 'ニキビ', oily: 'テカリ・皮脂', shave: 'ヒゲ剃り後',
    pores: '毛穴の黒ずみ', dryness: '乾燥', acne_scar: 'ニキビ跡'
  };

  window.initRankingPage = async function () {
    var container = document.getElementById('ranking-content');
    if (!container) return;

    var filename = window.location.pathname.split('/').pop().replace('.html', '');
    var categoryId = categoryMap[filename];
    if (!categoryId) { container.innerHTML = '<p class="text-gray-500 text-center py-12">カテゴリが見つかりません。</p>'; return; }

    try {
      var [rankRes, prodRes] = await Promise.all([
        fetch('/data/rankings.json?v=' + Date.now()),
        fetch('/data/products.json?v=' + Date.now())
      ]);
      var rankData = await rankRes.json();
      var prodData = await prodRes.json();
      var ranking = rankData.rankings[categoryId];
      if (!ranking) { container.innerHTML = '<p class="text-gray-500 text-center py-12">ランキングデータがありません。</p>'; return; }

      var productMap = {};
      (prodData.products || []).forEach(function (p) { productMap[p.id] = p; });

      // Load voice data
      var voiceData = {};
      await Promise.all(ranking.products.map(async function (rp) {
        try {
          var vr = await fetch('/data/voices/' + rp.product_id + '.json?v=' + Date.now());
          if (vr.ok) { var vd = await vr.json(); if (vd.status !== 'data_collection_pending') voiceData[rp.product_id] = vd; }
        } catch (e) {}
      }));

      // Set page meta
      document.title = ranking.seo_title || ranking.title + ' — SKINSCI';
      var descEl = document.querySelector('meta[name="description"]');
      if (descEl) descEl.setAttribute('content', ranking.seo_description || '');

      // Schema
      var schemaEl = document.getElementById('ranking-schema');
      if (schemaEl) {
        schemaEl.textContent = JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": ranking.title,
          "numberOfItems": ranking.products.length,
          "itemListElement": ranking.products.map(function (rp) {
            var p = productMap[rp.product_id];
            return { "@type": "ListItem", "position": rp.rank, "name": p ? p.name : '', "url": p ? 'https://skinsci.jp/products/' + p.id + '.html' : '' };
          })
        });
      }

      renderRanking(container, ranking, productMap, voiceData, categoryId);
    } catch (e) {
      container.innerHTML = '<p class="text-gray-500 text-center py-12">データの読み込みに失敗しました。</p>';
    }
  };

  function getScore(voiceData, id) {
    var v = voiceData[id];
    return v && v.skinsci_score ? v.skinsci_score : null;
  }

  function renderScoreBadge(score) {
    if (!score) return '<span class="text-sm text-gray-300">--点</span>';
    var color = score.total >= 90 ? 'bg-yellow-400 text-yellow-900' : score.total >= 80 ? 'bg-gray-300 text-gray-700' : score.total >= 70 ? 'bg-orange-200 text-orange-800' : 'bg-gray-100 text-gray-500';
    return '<span class="inline-block text-sm font-bold px-2.5 py-1 rounded-full ' + color + '">' + score.total + '点</span>';
  }

  function buildCTASmall(p) {
    var h = '';
    var aUrl = (p.amazon && p.amazon.url) || p.amazon_url || '';
    var qUrl = (p.qoo10 && p.qoo10.url) || p.qoo10_url || '';
    if (aUrl) h += '<a href="' + esc(aUrl) + '" target="_blank" rel="noopener noreferrer sponsored" class="flex items-center justify-center gap-1 bg-accent hover:bg-accent-muted text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"><span class="bg-white/20 text-[9px] px-1 py-0.5 rounded">PR</span>Amazon</a>';
    if (qUrl) h += '<a href="' + esc(qUrl) + '" target="_blank" rel="noopener noreferrer sponsored" class="flex items-center justify-center bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors">Qoo10</a>';
    if (!aUrl && !qUrl) h = '<span class="text-xs text-gray-300">リンク準備中</span>';
    return h;
  }

  function renderRanking(container, ranking, productMap, voiceData, categoryId) {
    var html = '';

    // Header
    html += '<div class="mb-8">'
      + '<h1 class="text-2xl md:text-3xl font-bold text-navy mb-2">' + esc(ranking.title) + '</h1>'
      + '<p class="text-gray-500 text-sm mb-2">' + esc(ranking.subtitle) + '</p>'
      + '<p class="text-xs text-gray-400">SKINSCIスコアと使用者の声を集約した独自評価に基づくランキングです</p>'
      + '<p class="text-xs text-gray-400 mt-1">※ 商品リンクにはアフィリエイト広告が含まれます（PR）</p>'
      + '</div>';

    // Products
    ranking.products.forEach(function (rp, i) {
      var p = productMap[rp.product_id];
      if (!p) return;
      var score = getScore(voiceData, rp.product_id);

      if (rp.rank === 1) {
        // 1st place - large card
        html += '<div class="bg-white border-2 border-accent rounded-3xl p-6 md:p-8 mb-6 relative">'
          + '<div class="absolute -top-4 left-6 bg-accent text-white text-sm font-bold px-4 py-1.5 rounded-full">★ 1位</div>'
          + '<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">'
          + '<div class="bg-pearl rounded-2xl flex items-center justify-center h-48 border border-gray-100">'
          + (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" class="max-h-full max-w-full object-contain p-4" />' : '<div class="text-gray-300 text-sm">画像準備中</div>')
          + '</div>'
          + '<div>'
          + '<p class="text-xs text-gray-400 mb-1">' + esc(p.brand) + '</p>'
          + '<h2 class="text-xl font-bold text-navy mb-2"><a href="/products/' + p.id + '.html" class="hover:text-accent transition-colors">' + esc(p.name) + '</a></h2>'
          + '<div class="flex items-center gap-2 mb-2">' + renderScoreBadge(score)
          + '<span class="inline-block bg-accent/10 text-accent text-xs font-bold px-2 py-0.5 rounded-full">★ ' + esc(p.verdict_badge || '') + '</span>'
          + '</div>'
          + '<p class="text-xl font-bold text-accent mb-2">' + esc(p.price_range) + '円</p>'
          + '<p class="text-sm text-gray-600 leading-relaxed mb-4">' + esc(rp.reason) + '</p>'
          + '<div class="flex flex-col sm:flex-row gap-2">' + buildCTASmall(p) + '</div>'
          + '<button onclick="addToCompare(\'' + p.id + '\', this)" class="mt-3 text-xs text-gray-400 hover:text-accent transition-colors">☐ 比較に追加</button>'
          + '</div></div></div>';
      } else {
        // 2-5 place
        html += '<div class="bg-white border border-gray-100 rounded-2xl p-5 mb-4 flex items-start gap-4">'
          + '<div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ' + (rp.rank === 2 ? 'bg-gray-400' : rp.rank === 3 ? 'bg-orange-300' : 'bg-gray-300') + '">' + rp.rank + '</div>'
          + '<div class="flex-1 min-w-0">'
          + '<div class="flex items-start justify-between gap-2 mb-1">'
          + '<div><p class="text-xs text-gray-400">' + esc(p.brand) + '</p>'
          + '<h3 class="text-base font-bold text-navy"><a href="/products/' + p.id + '.html" class="hover:text-accent transition-colors">' + esc(p.name) + '</a></h3></div>'
          + '<div class="flex-shrink-0 text-right">' + renderScoreBadge(score) + '<p class="text-sm font-bold text-accent mt-1">' + esc(p.price_range) + '円</p></div>'
          + '</div>'
          + '<p class="text-sm text-gray-500 mb-3">' + esc(rp.reason) + '</p>'
          + '<div class="flex items-center gap-2 flex-wrap">' + buildCTASmall(p)
          + '<button onclick="addToCompare(\'' + p.id + '\', this)" class="text-xs text-gray-400 hover:text-accent transition-colors ml-auto">☐ 比較に追加</button>'
          + '</div></div></div>';
      }
    });

    // Alternative picks
    if (ranking.alternative_picks) {
      html += '<div class="bg-pearl rounded-2xl p-6 mt-8 mb-8">'
        + '<h2 class="text-base font-bold text-navy mb-4">迷ったらこれ</h2>'
        + '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">';
      ['best_cost', 'best_for_sensitive', 'best_for_beginner'].forEach(function (key) {
        var pick = ranking.alternative_picks[key];
        if (!pick) return;
        var p = productMap[pick.product_id];
        if (!p) return;
        html += '<a href="/products/' + p.id + '.html" class="bg-white rounded-xl p-4 border border-gray-100 hover:border-accent transition-colors block">'
          + '<p class="text-xs text-accent font-bold mb-1">' + esc(pick.label) + '</p>'
          + '<p class="text-sm font-bold text-navy">' + esc(p.name) + '</p>'
          + '<p class="text-xs text-gray-400 mt-1">' + esc(p.price_range) + '円</p>'
          + '</a>';
      });
      html += '</div></div>';
    }

    // Related rankings
    html += '<div class="border-t border-gray-100 pt-8 mt-8">'
      + '<h2 class="text-base font-bold text-navy mb-4">他の悩みから探す</h2>'
      + '<div class="flex flex-wrap gap-2 mb-6">';
    Object.keys(categoryLabels).forEach(function (key) {
      if (key === categoryId) return;
      var file = 'ranking-' + key.replace('_', '-');
      html += '<a href="/' + file + '.html" class="text-sm bg-white border border-gray-200 hover:border-accent text-gray-600 hover:text-accent px-4 py-2 rounded-full transition-colors">' + categoryLabels[key] + '</a>';
    });
    html += '</div>'
      + '<div class="flex flex-col sm:flex-row gap-3">'
      + '<a href="/skin-types.html#quiz" class="text-center bg-navy hover:bg-navy-light text-white text-sm font-bold py-3 px-6 rounded-full transition-colors">30秒肌タイプ診断</a>'
      + '<a href="/skincare-for-beginners.html" class="text-center border-2 border-navy/20 hover:border-navy/40 text-navy text-sm font-medium py-3 px-6 rounded-full transition-colors">初心者ガイド</a>'
      + '</div></div>';

    // Disclaimer
    html += '<p class="text-xs text-gray-400 mt-8">※ ランキングはSKINSCIスコアと使用者の声を集約した独自評価に基づいています。効果には個人差があります。順位は定期的に見直されます。</p>';

    container.innerHTML = html;
  };

  // Compare integration
  window.addToCompare = function (id, btn) {
    var KEY = 'skinsci_compare_list';
    var list = [];
    try { list = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) {}
    var idx = list.indexOf(id);
    if (idx >= 0) {
      list.splice(idx, 1);
      if (btn) btn.textContent = '☐ 比較に追加';
    } else {
      if (list.length >= 3) list.shift();
      list.push(id);
      if (btn) btn.textContent = '✓ 追加済み';
    }
    localStorage.setItem(KEY, JSON.stringify(list));

    // Show floating button if >= 2
    var existing = document.getElementById('compare-floating-ranking');
    if (list.length >= 2) {
      if (!existing) {
        var el = document.createElement('div');
        el.id = 'compare-floating-ranking';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:40;padding:12px 16px;background:#0d1f3c;border-top:1px solid rgba(255,255,255,0.1);text-align:center;';
        el.innerHTML = '<a href="/compare.html" style="display:inline-flex;align-items:center;gap:8px;background:#5b9cc4;color:#fff;font-weight:700;padding:12px 24px;border-radius:9999px;font-size:14px;text-decoration:none;">比較する（<span id="rc-count">' + list.length + '</span>件）</a>';
        document.body.appendChild(el);
      } else {
        var cnt = existing.querySelector('#rc-count');
        if (cnt) cnt.textContent = list.length;
        existing.style.display = '';
      }
    } else if (existing) {
      existing.style.display = 'none';
    }
  };
})();
