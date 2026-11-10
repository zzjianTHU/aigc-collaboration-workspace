/* 未来导演计划 · 第 1–12 课共用课件脚本
   翻页：→ / 空格 / PageDown 下一步，← 上一页，N 讲稿，F 全屏，Home / End。
   每页 data-min 是建议时长，底部时间轴按它分配；带 .practice 的页在时间轴上标绿线。
   媒体位 .slot[data-slot]：每节课在页面里定义 window.SLOTS = { id: {type, label, hint, find, cred} }；
   老师可以拖入或点选本地文件（存在浏览器 IndexedDB），也可以把文件放到 lessons/media/<id>.mp4|jpg|png|webp|mp3 自动加载。 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const key = 'fdp-' + (document.body.dataset.lesson || 'x');
  const toast = msg => { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1700); };
  window.deckToast = toast;

  /* ---------- deck ---------- */
  const slides = [...document.querySelectorAll('.slide')];
  const track = $('#track');
  const mins = slides.map(s => parseFloat(s.dataset.min) || 1);
  const total = mins.reduce((a, b) => a + b, 0);
  let cur = 0;
  const enter = window.onSlideEnter = window.onSlideEnter || new Map();
  const fmt = m => { const s = Math.round(m * 60); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.style.flex = mins[i];
    b.title = `第 ${i + 1} 页 · ${mins[i]} 分钟`; b.setAttribute('aria-label', `跳到第 ${i + 1} 页`);
    if (s.classList.contains('practice')) b.classList.add('prac');
    b.addEventListener('click', () => go(i)); track.appendChild(b);
  });
  const deckWide = () => matchMedia('(min-width: 900px) and (min-height: 600px)').matches;
  function go(i) {
    const prev = slides[cur], fwd = i >= cur;
    cur = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, j) => s.classList.toggle('active', j === cur));
    if (prev !== slides[cur]) slides[cur].querySelectorAll('.step').forEach(st => st.classList.toggle('shown', !fwd));
    [...track.children].forEach((b, j) => { b.classList.toggle('now', j === cur); b.classList.toggle('done', j < cur); });
    $('#clock').textContent = `${fmt(mins.slice(0, cur).reduce((a, b) => a + b, 0))} / ${fmt(total)}`;
    $('#notes').innerHTML = `<b>讲稿 · 第 ${cur + 1}/${slides.length} 页 · 约 ${mins[cur]} 分钟</b><br>${slides[cur].dataset.note || ''}`;
    if (prev !== slides[cur]) prev.querySelectorAll('video, audio').forEach(m => m.pause());
    if (!deckWide()) slides[cur].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    const fn = enter.get(slides[cur].id); if (fn) fn();
    try { localStorage.setItem(key, cur); } catch (e) {}
  }
  function next() {
    const st = deckWide() && slides[cur].querySelector('.step:not(.shown)');
    if (st) st.classList.add('shown'); else go(cur + 1);
  }
  document.body.classList.add('deck-on', 'boot');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('boot')));
  $('#prevBtn').addEventListener('click', () => go(cur - 1));
  $('#nextBtn').addEventListener('click', next);
  $('#notesBtn').addEventListener('click', () => { $('#notes').hidden = !$('#notes').hidden; });
  addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (['ArrowRight', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.target.matches('button, video, audio, a'))) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(cur - 1); }
    else if (e.key === 'n' || e.key === 'N') $('#notes').hidden = !$('#notes').hidden;
    else if (e.key === 'f' || e.key === 'F') { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); else document.exitFullscreen?.(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(slides.length - 1);
  });

  /* ---------- media slots ---------- */
  const SLOTS = window.SLOTS || {};
  const idb = (() => {
    let p;
    const open = () => p || (p = new Promise((res, rej) => { const r = indexedDB.open(key + '-slots', 1); r.onupgradeneeded = () => r.result.createObjectStore('m'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
    const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('m', mode); const q = fn(t.objectStore('m')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
    return { get: k => tx('readonly', s => s.get(k)), put: (k, v) => tx('readwrite', s => s.put(v, k)), del: k => tx('readwrite', s => s.delete(k)) };
  })();
  function renderEmpty(el, id) {
    const s = SLOTS[id] || { label: id, hint: '' };
    el.classList.remove('filled');
    const find = s.find ? `<a class="btn" href="${s.find}" target="_blank" rel="noopener">去哪里找 ↗</a>` : '';
    el.innerHTML = `<div class="ph"><span class="label">${s.label}</span><p>${s.hint || ''}</p><div class="row">${find}<button class="btn" type="button" data-act="pick">放入${s.type === 'audio' ? '音频' : '视频或图片'}</button></div></div>`;
  }
  function renderMedia(el, id, src, kind) {
    const s = SLOTS[id] || {};
    el.classList.add('filled');
    let media;
    if (kind === 'audio') media = `<div class="ph"><span class="label">♪ ${s.label}</span></div><audio src="${src}" controls></audio>`;
    else if (kind === 'video') media = `<video src="${src}" playsinline controls></video>`;
    else media = `<img src="${src}" alt="${s.label || ''}">`;
    el.innerHTML = media + (s.cred ? `<span class="cred">${s.cred}</span>` : '') + `<div class="tools"><button type="button" data-act="pick">更换</button><button type="button" data-act="clear">移除</button></div>`;
  }
  const kindOf = t => t.startsWith('video') ? 'video' : t.startsWith('audio') ? 'audio' : 'img';
  const blobURLs = {};
  function setBlob(el, id, blob) { if (blobURLs[id]) URL.revokeObjectURL(blobURLs[id]); blobURLs[id] = URL.createObjectURL(blob); renderMedia(el, id, blobURLs[id], kindOf(blob.type || '')); }
  function tryPublished(el, id) {
    const s = SLOTS[id] || {};
    const list = s.type === 'audio' ? [['mp3', 'audio'], ['m4a', 'audio']] : [['mp4', 'video'], ['jpg', 'img'], ['png', 'img'], ['webp', 'img']];
    const step = i => {
      if (i >= list.length) return;
      const [ext, kind] = list[i], url = `media/${id}.${ext}`;
      if (kind === 'img') { const im = new Image(); im.onload = () => renderMedia(el, id, url, 'img'); im.onerror = () => step(i + 1); im.src = url; }
      else { const m = document.createElement(kind); m.preload = 'metadata'; m.onloadedmetadata = () => renderMedia(el, id, url, kind); m.onerror = () => step(i + 1); m.src = url; }
    };
    step(0);
  }
  let pickTarget = null;
  const fileIn = $('#slotFile');
  fileIn.addEventListener('change', () => { const f = fileIn.files[0]; if (f && pickTarget) storeFile(pickTarget, f); fileIn.value = ''; });
  function storeFile(el, f) { const id = el.dataset.slot; setBlob(el, id, f); idb.put(id, f).catch(() => toast('这个浏览器没能保存，刷新后需要重新放入')); }
  document.querySelectorAll('.slot').forEach(el => {
    const id = el.dataset.slot; renderEmpty(el, id);
    try { idb.get(id).then(b => b ? setBlob(el, id, b) : tryPublished(el, id)).catch(() => tryPublished(el, id)); } catch (e) { tryPublished(el, id); }
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const s = SLOTS[id] || {};
      if (a.dataset.act === 'pick') { pickTarget = el; fileIn.accept = s.type === 'audio' ? 'audio/*' : 'video/*,image/*'; fileIn.click(); }
      else if (a.dataset.act === 'clear') { idb.del(id).catch(() => {}); renderEmpty(el, id); tryPublished(el, id); }
    });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag'));
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drag'); const f = e.dataTransfer.files[0]; if (f) storeFile(el, f); });
  });

  let start = 0;
  try { start = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) {}
  go(Math.min(start, slides.length - 1));
})();
