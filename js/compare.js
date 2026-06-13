/**
 * SKINSCI 商品比較機能 (F-006)
 * localStorage + URLパラメータで比較対象を管理
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'skinsci_compare_list';
  var MAX_ITEMS = 3;

  function getList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
  }

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  // === 商品ページ用：「比較に追加」ボタン + フローティングボタン ===
  window.initCompareButton = function (productId) {
    var btn = document.getElementById('compare-add-btn');
    if (!btn) return;

    function update() {
      var list = getList();
      var inList = list.indexOf(productId) >= 0;
      btn.textContent = inList ? '✓ 比較リストに追加済み' : '☐ 比較に追加';
      btn.className = inList
        ? 'w-full text-sm font-medium py-2.5 px-4 rounded-lg border-2 border-accent bg-accent/10 text-accent transition-colors'
        : 'w-full text-sm font-medium py-2.5 px-4 rounded-lg border-2 border-gray-200 text-gray-600 hover:border-accent hover:text-accent transition-colors';
      updateFloating();
    }

    btn.addEventListener('click', function () {
      var list = getList();
      var idx = list.indexOf(productId);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        if (list.length >= MAX_ITEMS) { list.shift(); }
        list.push(productId);
      }
      saveList(list);
      update();
    });

    update();
  };

  function updateFloating() {
    var list = getList();
    var existing = document.getElementById('compare-floating');
    if (list.length >= 2) {
      if (!existing) {
        var el = document.createElement('div');
        el.id = 'compare-floating';
        el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:40;padding:12px 16px;background:#0d1f3c;border-top:1px solid rgba(255,255,255,0.1);text-align:center;';
        el.innerHTML = '<a href="/compare.html" style="display:inline-flex;align-items:center;gap:8px;background:#5b9cc4;color:#fff;font-weight:700;padding:12px 24px;border-radius:9999px;font-size:14px;text-decoration:none;min-height:44px;">比較する（<span id="compare-count">' + list.length + '</span>件）<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></a>';
        document.body.appendChild(el);
      } else {
        var cnt = existing.querySelector('#compare-count');
        if (cnt) cnt.textContent = list.length;
        existing.style.display = '';
      }
    } else if (existing) {
      existing.style.display = 'none';
    }
  }

  // === compare.html 用：比較テーブル描画 ===
  window.initComparePage = async function () {
    var container = document.getElementById('compare-content');
    if (!container) return;

    // Get IDs from URL or localStorage
    var params = new URLSearchParams(window.location.search);
    var idsParam = params.get('ids');
    var ids = idsParam ? idsParam.split(',').slice(0, MAX_ITEMS) : getList();

    if (ids.length === 0) {
      container.innerHTML = '<div class="text-center py-16"><p class="text-gray-500 mb-4">比較する商品が選ばれていません。</p><a href="/index.html" class="text-accent hover:text-accent-muted font-medium">トップページで商品を探す</a></div>';
      return;
    }

    try {
      var res = await fetch('/data/products.json?v=' + Date.now());
      var data = await res.json();
      var allProducts = data.products || [];
      var products = ids.map(function (id) { return allProducts.find(function (p) { return p.id === id; }); }).filter(Boolean);

      if (products.length === 0) {
        container.innerHTML = '<div class="text-center py-16"><p class="text-gray-500">該当する商品が見つかりませんでした。</p></div>';
        return;
      }

      // Load voice data for scores
      var voiceData = {};
      await Promise.all(products.map(async function (p) {
        try {
          var vRes = await fetch('/data/voices/' + p.id + '.json?v=' + Date.now());
          if (vRes.ok) { voiceData[p.id] = await vRes.json(); }
        } catch (e) {}
      }));

      renderCompareTable(container, products, voiceData);
    } catch (e) {
      container.innerHTML = '<div class="text-center py-16"><p class="text-gray-500">データの読み込みに失敗しました。</p></div>';
    }
  };

  function getScore(voiceData, productId) {
    var v = voiceData[productId];
    if (!v || v.status === 'data_collection_pending' || !v.skinsci_score) return null;
    return v.skinsci_score;
  }

  function renderCompareTable(container, products, voiceData) {
    var colW = Math.max(140, Math.floor(300 / products.length));

    // Header
    var headerHTML = '<div class="flex items-center justify-between mb-6">'
      + '<div><h1 class="text-2xl font-bold text-navy">商品比較</h1>'
      + '<p class="text-sm text-gray-500">' + products.length + '件を比較中</p></div>'
      + '<button onclick="clearCompare()" class="text-sm text-gray-400 hover:text-red-500 transition-colors">リセット</button>'
      + '</div>';

    // Table rows
    var rows = [
      { label: '', render: function (p) {
        return '<div class="relative">'
          + '<button onclick="removeFromCompare(\'' + p.id + '\')" class="absolute -top-1 -right-1 w-6 h-6 bg-gray-200 hover:bg-red-400 hover:text-white text-gray-500 rounded-full text-xs flex items-center justify-center transition-colors" title="削除">×</button>'
          + '<div class="bg-pearl rounded-xl flex items-center justify-center h-28 border border-gray-100">'
          + (p.image_url ? '<img src="' + esc(p.image_url) + '" alt="' + esc(p.name) + '" class="max-h-full max-w-full object-contain p-2" />' : '<div class="text-gray-300 text-xs">画像準備中</div>')
          + '</div></div>';
      }},
      { label: '商品名', render: function (p) { return '<a href="/products/' + p.id + '.html" class="text-sm font-bold text-navy hover:text-accent transition-colors">' + esc(p.name) + '</a>'; }},
      { label: 'ブランド', render: function (p) { return '<span class="text-xs text-gray-400">' + esc(p.brand) + '</span>'; }},
      { label: '価格', render: function (p) { return '<span class="text-sm font-bold text-accent">' + esc(p.price_range) + '円</span>'; }},
      { label: '結論', render: function (p) { return '<span class="inline-block bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">★ ' + esc(p.verdict_badge || '') + '</span>'; }},
      { label: 'SKINSCIスコア', render: function (p) {
        var s = getScore(voiceData, p.id);
        if (!s) return '<span class="text-sm text-gray-300">--</span>';
        return '<span class="text-2xl font-bold text-navy">' + s.total + '</span><span class="text-xs text-gray-400"> / 100</span>';
      }},
      { label: '初心者向き度', render: function (p) { return renderAxis(voiceData, p.id, 'beginner_friendly'); }},
      { label: 'コスパ', render: function (p) { return renderAxis(voiceData, p.id, 'cost_performance'); }},
      { label: '効果実感', render: function (p) { return renderAxis(voiceData, p.id, 'effect_satisfaction'); }},
      { label: '入手しやすさ', render: function (p) { return renderAxis(voiceData, p.id, 'availability'); }},
      { label: '対象', render: function (p) {
        return (p.concerns || []).map(function (c) { return '<span class="inline-block text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full mr-1 mb-1">' + esc(c) + '</span>'; }).join('');
      }},
      { label: '主要成分', render: function (p) {
        return (p.key_ingredients || []).map(function (i) { return '<span class="text-xs text-gray-600">・' + esc(i) + '</span>'; }).join('<br>');
      }},
      { label: '購入', render: function (p) {
        var html = '';
        var aUrl = (p.amazon && p.amazon.url) || p.amazon_url || '';
        var qUrl = (p.qoo10 && p.qoo10.url) || p.qoo10_url || '';
        if (aUrl) html += '<a href="' + esc(aUrl) + '" target="_blank" rel="noopener noreferrer sponsored" class="block text-center bg-accent text-white text-xs font-bold py-2 px-2 rounded-lg mb-1"><span class="bg-white/20 text-[9px] px-1 py-0.5 rounded">PR</span> Amazon</a>';
        if (qUrl) html += '<a href="' + esc(qUrl) + '" target="_blank" rel="noopener noreferrer sponsored" class="block text-center bg-red-500 text-white text-xs font-bold py-2 px-2 rounded-lg">Qoo10</a>';
        if (!aUrl && !qUrl) html = '<span class="text-xs text-gray-300">準備中</span>';
        return html;
      }}
    ];

    var tableHTML = '<div class="overflow-x-auto -mx-4 px-4"><table class="w-full" style="min-width:' + (120 + products.length * colW) + 'px">'
      + rows.map(function (row) {
          return '<tr class="border-b border-gray-50">'
            + '<td class="py-3 pr-3 text-xs text-gray-400 font-medium align-top whitespace-nowrap" style="width:90px">' + row.label + '</td>'
            + products.map(function (p) { return '<td class="py-3 px-2 align-top" style="min-width:' + colW + 'px">' + row.render(p) + '</td>'; }).join('')
            + '</tr>';
        }).join('')
      + '</table></div>';

    // Suggestion
    var suggestionHTML = renderSuggestion(products, voiceData);

    container.innerHTML = headerHTML + tableHTML + suggestionHTML
      + '<p class="text-xs text-gray-400 mt-6">※ 商品リンクにはアフィリエイト広告が含まれます（PR）。スコアはSKINSCI独自の集約評価であり、効果には個人差があります。</p>';
  }

  function renderAxis(voiceData, productId, key) {
    var s = getScore(voiceData, productId);
    if (!s || !s.axes) return '<span class="text-xs text-gray-300">--</span>';
    var val = s.axes[key] || 0;
    var pct = Math.round((val / 25) * 100);
    return '<div class="flex items-center gap-2"><div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div class="h-1.5 rounded-full ' + (pct >= 80 ? 'bg-accent' : pct >= 50 ? 'bg-accent/60' : 'bg-gray-300') + '" style="width:' + pct + '%"></div></div><span class="text-xs font-bold text-navy w-8 text-right">' + val + '</span></div>';
  }

  function renderSuggestion(products, voiceData) {
    var suggestions = [];

    // Best score
    var bestScore = null, bestProduct = null;
    products.forEach(function (p) {
      var s = getScore(voiceData, p.id);
      if (s && (!bestScore || s.total > bestScore.total)) { bestScore = s; bestProduct = p; }
    });
    if (bestProduct) {
      suggestions.push({ icon: '🏆', label: '迷ったらコレ', product: bestProduct, reason: 'SKINSCIスコア ' + bestScore.total + '点で最高評価' });
    }

    // Best cost performance
    var bestCp = null, bestCpProduct = null;
    products.forEach(function (p) {
      var s = getScore(voiceData, p.id);
      if (s && s.axes && (!bestCp || s.axes.cost_performance > bestCp)) { bestCp = s.axes.cost_performance; bestCpProduct = p; }
    });
    if (bestCpProduct && bestCpProduct !== bestProduct) {
      suggestions.push({ icon: '💰', label: 'コスパ重視ならコレ', product: bestCpProduct, reason: 'コスパ評価 ' + bestCp + '/25 で最高' });
    }

    // Skin type match
    var skinType = null;
    try { skinType = localStorage.getItem('skinsci_skin_type'); } catch (e) {}

    if (!suggestions.length && !skinType) return '';

    return '<div class="mt-8 bg-pearl rounded-2xl p-6">'
      + '<h2 class="text-base font-bold text-navy mb-4">あなたへの提案</h2>'
      + (suggestions.length ? '<div class="space-y-3">'
        + suggestions.map(function (s) {
            return '<div class="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-100">'
              + '<span class="text-2xl">' + s.icon + '</span>'
              + '<div class="flex-1">'
              + '<p class="text-sm font-bold text-navy">' + s.label + '</p>'
              + '<p class="text-xs text-gray-500">' + esc(s.product.name) + ' — ' + esc(s.reason) + '</p>'
              + '</div>'
              + '<a href="/products/' + s.product.id + '.html" class="text-accent text-xs font-bold">詳細 →</a>'
              + '</div>';
          }).join('')
        + '</div>' : '')
      + '<p class="text-xs text-gray-400 mt-3">※ あくまでSKINSCI独自の集約評価に基づく提案です。効果には個人差があります。</p>'
      + '</div>';
  }

  // Global functions for compare page
  window.clearCompare = function () {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/compare.html';
  };

  window.removeFromCompare = function (id) {
    var list = getList();
    list = list.filter(function (x) { return x !== id; });
    saveList(list);
    if (list.length > 0) {
      window.location.href = '/compare.html?ids=' + list.join(',');
    } else {
      window.location.href = '/compare.html';
    }
  };

})();
