/**
 * SKINSCI 使用者の声まとめ + SKINSCIスコア (F-005)
 * data/voices/{product_id}.json を読み込み、商品ページに描画
 */
(function () {
  'use strict';

  function esc(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
  }

  function freqBadge(freq) {
    var colors = { '高': 'bg-navy text-white', '中': 'bg-gray-200 text-gray-600', '低': 'bg-gray-100 text-gray-400' };
    return '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded ' + (colors[freq] || colors['低']) + '">' + esc(freq) + '</span>';
  }

  window.loadVoices = async function (productId) {
    var scoreEl = document.getElementById('skinsci-score-area');
    var voiceEl = document.getElementById('skinsci-voice-area');
    if (!scoreEl || !voiceEl) return;

    try {
      var res = await fetch('/data/voices/' + productId + '.json?v=' + Date.now());
      if (!res.ok) throw new Error('not found');
      var data = await res.json();

      if (data.status === 'data_collection_pending') {
        renderPending(scoreEl, voiceEl, data.message);
        return;
      }

      renderScore(scoreEl, data.skinsci_score);
      renderVoices(voiceEl, data);

    } catch (e) {
      renderPending(scoreEl, voiceEl, '使用者の声を収集中です。今しばらくお待ちください。');
    }
  };

  function renderPending(scoreEl, voiceEl, message) {
    scoreEl.innerHTML = '<div class="border border-gray-100 rounded-2xl p-6">'
      + '<h2 class="text-base font-bold text-navy mb-3">SKINSCIスコア</h2>'
      + '<div class="grid grid-cols-2 gap-3">'
      + ['初心者向き度', 'コスパ', '効果実感', '入手のしやすさ'].map(function (a) {
          return '<div class="bg-pearl rounded-xl p-3 text-center">'
            + '<p class="text-xs text-gray-400 mb-1">' + a + '</p>'
            + '<p class="text-lg font-bold text-gray-300">--</p></div>';
        }).join('')
      + '</div>'
      + '<p class="text-xs text-gray-400 mt-3 text-center">スコアは近日公開予定です</p>'
      + '</div>';

    voiceEl.innerHTML = '<div class="border border-gray-100 rounded-2xl p-6">'
      + '<h2 class="text-base font-bold text-navy mb-3">使用者の声まとめ</h2>'
      + '<div class="text-center py-6">'
      + '<div class="w-14 h-14 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">'
      + '<svg class="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>'
      + '</div>'
      + '<p class="text-sm text-gray-500">' + esc(message) + '</p>'
      + '</div></div>';
  }

  function renderScore(el, score) {
    if (!score) { el.innerHTML = ''; return; }

    var axisLabels = {
      beginner_friendly: '初心者向き度',
      cost_performance: 'コスパ',
      effect_satisfaction: '効果実感',
      availability: '入手のしやすさ'
    };

    var totalLabel = '';
    if (score.total >= 70) totalLabel = '<span class="ml-2 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">おすすめ</span>';

    var axesHTML = Object.keys(axisLabels).map(function (key) {
      var val = (score.axes && score.axes[key]) || 0;
      var pct = Math.round((val / 25) * 100);
      var rationale = (score.rationale && score.rationale[key]) || '';
      return '<div class="mb-3">'
        + '<div class="flex items-center justify-between mb-1">'
        + '<span class="text-sm text-navy font-medium">' + axisLabels[key] + '</span>'
        + '<span class="text-sm font-bold text-navy">' + val + '<span class="text-xs text-gray-400 font-normal"> / 25</span></span>'
        + '</div>'
        + '<div class="h-2 bg-gray-100 rounded-full overflow-hidden">'
        + '<div class="h-2 rounded-full ' + (pct >= 80 ? 'bg-accent' : pct >= 50 ? 'bg-accent/60' : 'bg-gray-300') + '" style="width:' + pct + '%"></div>'
        + '</div>'
        + (rationale ? '<p class="text-xs text-gray-400 mt-1">' + esc(rationale) + '</p>' : '')
        + '</div>';
    }).join('');

    el.innerHTML = '<div class="border border-gray-100 rounded-2xl p-6">'
      + '<div class="flex items-center justify-between mb-4">'
      + '<h2 class="text-base font-bold text-navy">SKINSCIスコア</h2>'
      + '<button onclick="document.getElementById(\'score-info\').classList.toggle(\'hidden\')" class="text-xs text-gray-400 hover:text-accent transition-colors">？スコアとは</button>'
      + '</div>'
      + '<div id="score-info" class="hidden bg-pearl rounded-xl p-4 mb-4 text-xs text-gray-500 leading-relaxed">'
      + 'SKINSCIスコアは、Amazon・Qoo10・X等の複数情報源から収集した使用者の声を集約し、4つの軸で相対的に評価した指標です。主観的評価ではなく、データに基づく参考値としてご覧ください。'
      + '</div>'
      + '<div class="flex items-center gap-4 mb-6">'
      + '<div class="text-center">'
      + '<p class="text-4xl font-bold text-navy">' + score.total + '</p>'
      + '<p class="text-xs text-gray-400">/ 100</p>'
      + '</div>'
      + '<div class="flex-1">' + totalLabel + '</div>'
      + '</div>'
      + axesHTML
      + '</div>';
  }

  function renderVoices(el, data) {
    var sourcesHTML = '';
    if (data.sources) {
      var parts = [];
      if (data.sources.amazon && data.sources.amazon.review_count_total != null) parts.push('Amazonレビュー ' + data.sources.amazon.review_count_total + '件（平均★' + data.sources.amazon.average_rating + '）');
      if (data.sources.qoo10 && data.sources.qoo10.review_count_total != null) parts.push('Qoo10レビュー ' + data.sources.qoo10.review_count_total + '件（平均★' + data.sources.qoo10.average_rating + '）');
      if (data.sources.x_twitter && data.sources.x_twitter.post_count_collected) parts.push('X投稿 ' + data.sources.x_twitter.post_count_collected + '件');
      if (parts.length) sourcesHTML = '<p class="text-xs text-gray-400 mb-1">複数の口コミサイト（' + parts.join(' / ') + 'など）を分析</p>';
    }
    if (data.collected_at) {
      sourcesHTML += '<p class="text-xs text-gray-400 mb-4">最終更新：' + esc(data.collected_at) + '</p>';
    }

    var goodHTML = renderPointList(data.summary.good_points, '良い点', 'bg-green-50', 'text-green-600', '○');
    var badHTML = renderPointList(data.summary.bad_points, '気になる点', 'bg-red-50', 'text-red-500', '△');
    var neutralHTML = renderPointList(data.summary.neutral_points, '中立的な意見', 'bg-gray-50', 'text-gray-500', '−');

    var relativeHTML = '';
    if (data.relative_evaluation) {
      relativeHTML = '<div class="bg-pearl rounded-xl p-4 mt-4">'
        + '<p class="text-xs font-bold text-navy mb-1">他商品との比較</p>'
        + '<p class="text-sm text-gray-600 leading-relaxed">' + esc(data.relative_evaluation) + '</p>'
        + '</div>';
    }

    el.innerHTML = '<div class="border border-gray-100 rounded-2xl p-6">'
      + '<h2 class="text-base font-bold text-navy mb-3">使用者の声まとめ</h2>'
      + sourcesHTML
      + goodHTML
      + badHTML
      + neutralHTML
      + relativeHTML
      + '<p class="text-xs text-gray-400 mt-4">※ 個人の感想を集約したものです。効果には個人差があります。口コミ原文の転載ではなく、要約・再構成した内容です。</p>'
      + '</div>';
  }

  function renderPointList(points, title, bgClass, textClass, icon) {
    if (!points || points.length === 0) return '';
    return '<div class="' + bgClass + ' rounded-xl p-4 mt-3">'
      + '<p class="text-sm font-bold ' + textClass + ' mb-2">' + title + '</p>'
      + '<ul class="space-y-2">'
      + points.map(function (p) {
          return '<li class="text-sm text-gray-700">'
            + '<div class="flex items-start gap-2">'
            + '<span class="' + textClass + ' mt-0.5 flex-shrink-0">' + icon + '</span>'
            + '<div class="flex-1">'
            + '<span class="font-medium">' + esc(p.point) + '</span> '
            + freqBadge(p.frequency)
            + (p.context ? '<p class="text-xs text-gray-400 mt-0.5">' + esc(p.context) + '</p>' : '')
            + '</div></div></li>';
        }).join('')
      + '</ul></div>';
  }

})();
