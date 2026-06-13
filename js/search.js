/**
 * SKINSCI 商品名検索 (F-001)
 * Fuse.js を使ったリアルタイムサジェスト + 検索結果ページ遷移
 */
(function () {
  'use strict';

  let fuse = null;
  let products = [];

  async function loadProducts() {
    if (products.length > 0) return products;
    try {
      const res = await fetch('/data/products.json?v=' + Date.now());
      const data = await res.json();
      products = data.products || [];
      fuse = new Fuse(products, {
        keys: [
          { name: 'name', weight: 0.4 },
          { name: 'brand', weight: 0.2 },
          { name: 'keywords', weight: 0.3 },
          { name: 'concerns', weight: 0.1 }
        ],
        threshold: 0.4,
        distance: 100,
        minMatchCharLength: 2
      });
      return products;
    } catch (e) {
      console.error('商品データの読み込みに失敗しました:', e);
      return [];
    }
  }

  function search(query) {
    if (!fuse || query.length < 2) return [];
    return fuse.search(query, { limit: 5 });
  }

  // === サジェスト UI ===
  function initSearchBar() {
    const input = document.getElementById('skinsci-search-input');
    const suggestBox = document.getElementById('skinsci-suggest');
    if (!input || !suggestBox) return;

    let selectedIndex = -1;

    input.addEventListener('input', function () {
      const query = this.value.trim();
      selectedIndex = -1;
      if (query.length < 2) {
        suggestBox.classList.add('hidden');
        suggestBox.innerHTML = '';
        return;
      }
      const results = search(query);
      if (results.length === 0) {
        suggestBox.classList.add('hidden');
        suggestBox.innerHTML = '';
        return;
      }
      suggestBox.innerHTML = results.map(function (r, i) {
        return '<a href="' + r.item.page_url + '" class="skinsci-suggest-item block px-4 py-3 hover:bg-accent/10 transition-colors border-b border-gray-100 last:border-b-0" data-index="' + i + '">'
          + '<span class="text-sm font-bold text-navy">' + escapeHTML(r.item.name) + '</span>'
          + '<span class="text-xs text-gray-400 ml-2">' + escapeHTML(r.item.brand) + ' / ' + escapeHTML(r.item.category) + '</span>'
          + '</a>';
      }).join('');
      suggestBox.classList.remove('hidden');
    });

    input.addEventListener('keydown', function (e) {
      var items = suggestBox.querySelectorAll('.skinsci-suggest-item');
      if (items.length === 0) {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToSearch(this.value.trim());
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        highlightItem(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        highlightItem(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          items[selectedIndex].click();
        } else {
          goToSearch(this.value.trim());
        }
      } else if (e.key === 'Escape') {
        suggestBox.classList.add('hidden');
        selectedIndex = -1;
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('#skinsci-search-wrapper')) {
        suggestBox.classList.add('hidden');
        selectedIndex = -1;
      }
    });

    // 検索ボタン
    var searchBtn = document.getElementById('skinsci-search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', function () {
        goToSearch(input.value.trim());
      });
    }
  }

  function highlightItem(items, index) {
    items.forEach(function (item, i) {
      if (i === index) {
        item.classList.add('bg-accent/10');
      } else {
        item.classList.remove('bg-accent/10');
      }
    });
  }

  function goToSearch(query) {
    if (query.length > 0) {
      window.location.href = '/search.html?q=' + encodeURIComponent(query);
    }
  }

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // === 検索結果ページ ===
  async function initSearchResults() {
    var container = document.getElementById('skinsci-search-results');
    var queryDisplay = document.getElementById('skinsci-search-query');
    var countDisplay = document.getElementById('skinsci-search-count');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var query = params.get('q') || '';

    // 検索バーに元のクエリをセット
    var input = document.getElementById('skinsci-search-input');
    if (input) input.value = query;

    if (queryDisplay) queryDisplay.textContent = query;

    if (!query) {
      container.innerHTML = '<p class="text-gray-500 text-center py-12">検索キーワードを入力してください。</p>';
      if (countDisplay) countDisplay.textContent = '';
      return;
    }

    await loadProducts();
    var results = search(query);

    if (countDisplay) {
      countDisplay.textContent = results.length + '件の商品が見つかりました';
    }

    if (results.length === 0) {
      container.innerHTML = '<div class="text-center py-12">'
        + '<p class="text-gray-500 mb-4">「' + escapeHTML(query) + '」に一致する商品が見つかりませんでした。</p>'
        + '<p class="text-gray-400 text-sm">別のキーワードで検索してみてください。</p>'
        + '</div>';
      return;
    }

    container.innerHTML = results.map(function (r) {
      var p = r.item;
      return '<a href="' + p.page_url + '" class="block bg-white rounded-2xl border border-gray-100 p-5 card-hover">'
        + '<div class="flex items-start gap-4">'
        + '<div class="flex-1">'
        + '<p class="text-xs text-gray-400 mb-1">' + escapeHTML(p.brand) + ' / ' + escapeHTML(p.category) + '</p>'
        + '<h3 class="text-lg font-bold text-navy mb-2">' + escapeHTML(p.name) + '</h3>'
        + '<div class="flex flex-wrap gap-1.5 mb-2">'
        + p.concerns.map(function (c) {
            return '<span class="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">' + escapeHTML(c) + '</span>';
          }).join('')
        + '</div>'
        + '<p class="text-sm text-gray-500">' + escapeHTML(p.price_range) + '円</p>'
        + (p.for_beginners ? '<span class="inline-block text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full mt-1">初心者向け</span>' : '')
        + '</div>'
        + '<div class="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center">'
        + '<svg class="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>'
        + '</div>'
        + '</div>'
        + '</a>';
    }).join('');
  }

  // === 初期化 ===
  document.addEventListener('DOMContentLoaded', function () {
    loadProducts().then(function () {
      initSearchBar();
      initSearchResults();
    });
  });
})();
