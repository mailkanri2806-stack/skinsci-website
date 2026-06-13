/**
 * SKINSCI お任せセット (F-008)
 * omakase_sets.json + products.json でセットカードを動的描画
 */
(function () {
  'use strict';

  var allSets = [];
  var productMap = {};

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s || ''));
    return d.innerHTML;
  }

  window.initOmakasePage = async function () {
    var container = document.getElementById('omakase-results');
    if (!container) return;

    try {
      var [setsRes, prodRes] = await Promise.all([
        fetch('/data/omakase_sets.json?v=' + Date.now()),
        fetch('/data/products.json?v=' + Date.now())
      ]);
      var setsData = await setsRes.json();
      var prodData = await prodRes.json();

      allSets = setsData.sets || [];
      (prodData.products || []).forEach(function (p) { productMap[p.id] = p; });

      // Auto-select skin type from URL or localStorage
      var params = new URLSearchParams(window.location.search);
      var skinParam = params.get('skin_type');
      if (skinParam) {
        var skinSelect = document.getElementById('filter-skin');
        if (skinSelect) skinSelect.value = skinParam;
      }

      applyFilters();
      setupFilterListeners();
    } catch (e) {
      container.innerHTML = '<p class="text-gray-500 text-center py-12">データの読み込みに失敗しました。</p>';
    }
  };

  function setupFilterListeners() {
    ['filter-skin', 'filter-budget'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', applyFilters);
    });
  }

  function applyFilters() {
    var skinType = document.getElementById('filter-skin').value;
    var budget = document.getElementById('filter-budget').value;

    var filtered = allSets.filter(function (s) {
      if (skinType && s.skin_type !== skinType) return false;
      if (budget && s.budget_tier !== budget) return false;
      return true;
    });

    var container = document.getElementById('omakase-results');
    var countEl = document.getElementById('omakase-count');
    if (countEl) countEl.textContent = filtered.length + '件のセットが見つかりました';

    if (filtered.length === 0) {
      container.innerHTML = '<div class="text-center py-12"><p class="text-gray-500 mb-2">条件に合うセットがありません。</p><p class="text-sm text-gray-400">フィルターを変更してみてください。</p></div>';
      return;
    }

    container.innerHTML = filtered.map(renderSetCard).join('');
  }

  function renderSetCard(set) {
    var productsHTML = set.products.map(function (item) {
      var product = item.product_id ? productMap[item.product_id] : null;
      var name = product ? product.name : item.fallback_name;
      var brand = product ? product.brand : '';
      var price = product ? product.price_range + '円' : '';
      var isPlaceholder = !product;

      var linkHTML = '';
      var aUrl = product ? ((product.amazon && product.amazon.url) || product.amazon_url || '') : '';
      if (aUrl) {
        linkHTML = '<a href="' + esc(aUrl) + '" target="_blank" rel="noopener noreferrer sponsored" class="text-xs text-accent hover:text-accent-muted font-bold"><span class="bg-accent/10 text-[9px] px-1 py-0.5 rounded mr-0.5">PR</span>Amazon</a>';
      }

      return '<div class="flex items-center gap-3 py-2.5 ' + (isPlaceholder ? '' : 'border-b border-gray-50') + '">'
        + '<span class="text-xs text-gray-400 w-20 flex-shrink-0">' + esc(item.category) + '</span>'
        + '<div class="flex-1 min-w-0">'
        + '<p class="text-sm font-medium text-navy truncate">' + esc(name) + '</p>'
        + (brand ? '<p class="text-xs text-gray-400">' + esc(brand) + '</p>' : '')
        + (isPlaceholder ? '<p class="text-[10px] text-gray-300">商品は近日選定予定</p>' : '')
        + '</div>'
        + '<div class="flex-shrink-0 text-right">'
        + (price ? '<p class="text-xs font-bold text-accent">' + esc(price) + '</p>' : '')
        + linkHTML
        + '</div></div>';
    }).join('');

    var featuresHTML = (set.features || []).map(function (f) {
      return '<span class="inline-block text-[11px] bg-accent/10 text-accent px-2 py-0.5 rounded-full">' + esc(f) + '</span>';
    }).join(' ');

    return '<div class="bg-white rounded-2xl border border-gray-100 p-6 mb-5">'
      + '<div class="flex items-start justify-between mb-3">'
      + '<div>'
      + '<h3 class="text-lg font-bold text-navy mb-1">' + esc(set.name) + '</h3>'
      + '<div class="flex flex-wrap gap-1 mb-2">' + featuresHTML + '</div>'
      + '</div>'
      + '<div class="text-right flex-shrink-0 ml-4">'
      + '<p class="text-2xl font-bold text-accent">' + esc(set.total_price_estimate) + '</p>'
      + '<p class="text-[10px] text-gray-400">総額目安</p>'
      + '</div></div>'
      + '<div class="divide-y divide-gray-50">' + productsHTML + '</div>'
      + '<p class="text-sm text-gray-500 mt-3 leading-relaxed">' + esc(set.skinsci_pick_reason) + '</p>'
      + '<div class="mt-4 flex flex-col sm:flex-row gap-2">'
      + '<a href="coming-soon.html" class="flex-1 text-center bg-navy hover:bg-navy-light text-white text-sm font-bold py-3 rounded-lg transition-colors">使用順序ガイドを見る</a>'
      + '</div></div>';
  }

  // Top page preview
  window.renderOmakasePreview = async function () {
    var container = document.getElementById('omakase-preview');
    if (!container) return;

    try {
      var [setsRes, prodRes] = await Promise.all([
        fetch('/data/omakase_sets.json?v=' + Date.now()),
        fetch('/data/products.json?v=' + Date.now())
      ]);
      var setsData = await setsRes.json();
      var prodData = await prodRes.json();
      var sets = setsData.sets || [];
      (prodData.products || []).forEach(function (p) { productMap[p.id] = p; });

      // Show 3 representative sets
      var preview = sets.filter(function (s) {
        return s.id === 'set-001' || s.id === 'set-004' || s.id === 'set-010';
      });

      container.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">'
        + preview.map(function (set) {
            var skinLabels = { oily: '脂性肌', dry: '乾燥肌', combo: '混合肌', sensitive: '敏感肌' };
            return '<a href="omakase.html?skin_type=' + set.skin_type + '" class="bg-white rounded-2xl border border-gray-100 p-5 card-hover block">'
              + '<p class="text-xs text-accent font-bold mb-1">' + esc(skinLabels[set.skin_type] || '') + '向け</p>'
              + '<p class="text-base font-bold text-navy mb-2">' + esc(set.name) + '</p>'
              + '<p class="text-xl font-bold text-accent mb-2">' + esc(set.total_price_estimate) + '</p>'
              + '<p class="text-xs text-gray-500">5商品セット</p>'
              + '</a>';
          }).join('')
        + '</div>';
    } catch (e) {
      container.innerHTML = '';
    }
  };
})();
