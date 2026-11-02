'use strict';
const api = window.scanner;
const $ = selector => document.querySelector(selector);
const icons = {
  'scan-image': '<path d="M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4"/><rect x="7" y="7" width="10" height="10" rx="2"/><path d="m7 15 3-4 3 3 2-2 2 3"/>',
  scan: '<path d="M4 8V4h4m8 0h4v4m0 8v4h-4m-8 0H4v-4M3 12h18"/>',
  images: '<rect x="7" y="3" width="14" height="15" rx="2"/><path d="M4 7H3v13a1 1 0 0 0 1 1h13v-1m-9-6 4-4 3 3 2-2 3 4"/><circle cx="16.5" cy="7.5" r="1"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 17 6-7 5 5 3-3 4 5"/><circle cx="16" cy="7.5" r="1"/>',
  history: '<path d="M3 11a9 9 0 1 1 2 7m-2-14v7h7m2-4v5l3 2"/>',
  settings: '<path d="m10 3-.5 2-2 .9-1.8-.6-2 3.4 1.5 1.4v2.8l-1.5 1.5 2 3.4 2-.6 1.9 1 .5 2h4l.5-2 1.9-1 2 .6 2-3.4-1.5-1.5v-2.8L21 8.7l-2-3.4-1.8.6-2-.9L14 3Z"/><circle cx="12" cy="12" r="3"/>',
  'shield-check': '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  square: '<rect x="5" y="5" width="14" height="14" rx="1"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H4m6-6-6 6 6 6"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  download: '<path d="M12 3v13m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  compare: '<path d="M12 3v18M8 7H3v10h5m8-10h5v10h-5m-1-5h6M3 12h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-10v.01"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Zm7-1v4m-2-2h4"/>',
  'external-link': '<path d="M14 3h7v7m0-7-11 11M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  sliders: '<path d="M5 3v6m0 4v8m7-18v12m0 4v2m7-18v2m0 4v12M2 9h6m1 6h6m1-10h6"/>',
  loader: '<path d="M21 12a9 9 0 1 1-9-9"/>',
  file: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h8"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/>',
  warning: '<path d="m12 3 10 18H2Zm0 6v5m0 3v.01"/>',
  monitor: '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M12 16v5m-5 0h10"/>'
};
function icon(name, className = '') {
  return `<i class="${className}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.image}</svg></i>`;
}
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); el.removeAttribute('data-icon'); });
}
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const n = value => Number(value || 0).toLocaleString('tr-TR');
function bytes(value) { return value >= 1048576 ? `${(value / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(value / 1024))} KB`; }
function duration(value) { return value < 1000 ? `${n(value)} ms` : `${(value / 1000).toFixed(1).replace('.', ',')} sn`; }
function date(value) { return new Intl.DateTimeFormat('tr-TR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' }).format(new Date(value)); }
const labels = { exact:'Birebir kopya', similar:'Benzer kopya', edited:'Hafif kırpılmış' };
const model = { page:'compare', data:{ library:[], queries:[], history:[], settings:{} }, threshold:88,
  activeRecord:null, selectedQuery:null, resultFilter:'all', resultSort:'score', busy:false,
  librarySearch:'', librarySort:'newest', libraryPage:1, selected:new Set(), progress:null, cancelling:false };
let overlayContext = null;
let settingsTimer = null;
let pendingSettings = null;
let settingsWrite = Promise.resolve();
function imageById(id) { return model.data.queries.find(i => i.id === id) || model.data.library.find(i => i.id === id); }
function applyState(data) {
  model.data = data;
  model.selected = new Set([...model.selected].filter(id => data.library.some(i => i.id === id)));
  if (!data.queries.some(q => q.id === model.selectedQuery)) model.selectedQuery = data.queries[0]?.id || null;
  if (model.activeRecord) model.activeRecord = data.history.find(h => h.id === model.activeRecord.id) || null;
  document.documentElement.classList.toggle('reduce-motion', Boolean(data.settings.reducedMotion));
}
function latestRecord() { return model.activeRecord; }
function selectedGroup() { return latestRecord()?.groups.find(g => g.queryId === model.selectedQuery); }
function matchCount(record) { return record?.groups.reduce((sum, g) => sum + g.matches.length, 0) || 0; }
function validMatches(group) { return (group?.matches || []).filter(match => imageById(match.imageId)); }
function render() {
  $('#nav-library-count').textContent = n(model.data.library.length);
  document.querySelectorAll('.nav-item[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === model.page));
  $('#page-label').textContent = { compare:'Karşılaştır', library:'Koleksiyonum', history:'Geçmiş', settings:'Gizlilik ve ayarlar' }[model.page];
  $('#view').innerHTML = ({ compare:renderCompare, library:renderLibrary, history:renderHistory, settings:renderSettings })[model.page]();
  document.querySelectorAll('[data-action="add-library"], [data-action="demo"]').forEach(el => { el.disabled = model.busy; });
  $('#view').setAttribute('aria-busy', String(model.busy));
  renderProgress();
}
function renderCompare() {
  const record = latestRecord(), totalMatches = matchCount(record);
  return `<section class="hero"><div><div class="eyebrow"><span></span>GÖRSEL KARŞILAŞTIRMA</div><h1>Aynı görsel.<br><em>Farklı kopyalar.</em></h1><p>Bir görsel seçin, kendi koleksiyonunuzdaki aynı ve düzenlenmiş kopyalarını tek bir yerde keşfedin.</p></div><div class="hero-art" aria-hidden="true"><div class="art-backdrop"></div><div class="art-card back"><img src="scanner://assets/coast.svg" alt=""><span>${icon('image')}orijinal.png</span></div><span class="art-link">${icon('copy')}</span><div class="art-card front"><img src="scanner://assets/coast.svg" alt=""><span>${icon('check-circle')}Eşleşme bulundu</span></div><span class="art-spark">${icon('sparkles')}</span></div></section>
  <section class="stats-row" aria-label="Koleksiyon özeti">
    ${stat('images',model.data.library.length,'Koleksiyondaki görsel','Karşılaştırmaya hazır','')}
    ${stat('scan',model.data.queries.length,'Referans görsel','Sizin seçtiğiniz görüntüler','amber')}
    ${stat('check-circle',totalMatches,'Bulunan kopya',record ? `Son karşılaştırma · ${duration(record.durationMs)}` : 'İlk karşılaştırmanızı bekliyor','green')}
  </section>
  <section class="compare-layout"><div class="panel query-panel"><div class="panel-title"><span class="step-number">01</span><h2>Referans görseller</h2></div><p class="panel-description">Koleksiyonunuzda hangi görseli arayalım?</p>${renderQueries()}
  <div class="query-actions"><button class="button button-secondary button-small" data-action="add-query" ${model.busy?'disabled':''}>${icon('plus')} Görsel seç</button><button class="icon-button" data-action="query-folder" title="Referans klasörü ekle" aria-label="Referans klasörü ekle" ${model.busy?'disabled':''}>${icon('folder')}</button></div>
  <div class="threshold-control"><label class="field-label" for="threshold">Eşleşme eşiği <span class="threshold-value" id="threshold-label">${n(model.threshold)} / 100</span></label><input id="threshold" class="range-input" type="range" min="80" max="100" value="${model.threshold}" style="--range:${(model.threshold-80)*5}%" ${model.busy?'disabled':''}><div class="range-labels"><span>Daha esnek</span><span>Daha sıkı</span></div><p class="field-help">Yüksek değer, görsel kopyalar için daha sıkı bir eşleştirme yapar.</p></div>
  <button class="button button-primary scan-button" data-action="scan" ${model.busy || !model.data.queries.length || !model.data.library.length?'disabled':''}>${icon(model.busy?'loader':'scan',model.busy?'spinner':'')}${model.busy?'İşlem sürüyor…':'Benzer kopyaları bul'}</button>
  <p class="scan-note ${model.data.library.length&&model.data.queries.length?'ready':''}">${!model.data.library.length?'Başlamak için koleksiyonunuza görsel ekleyin.':!model.data.queries.length?'Bir veya daha fazla referans görsel seçin.':`${n(model.data.library.length)} görsel, ${n(model.data.queries.length)} referansla karşılaştırılacak.`}</p></div>
  <div class="panel results-panel">${renderResults()}</div></section>
  <section class="demo-banner">${icon('sparkles')}<div><strong>Önce küçük bir keşif?</strong><p>Hazır örneklerle boyut, renk ve kırpma farklarını deneyin.</p></div><button class="button button-secondary button-small" data-action="demo" ${model.busy?'disabled':''}>Örneklerle dene ${icon('arrow-right')}</button></section>`;
}
function stat(name,value,label,desc,color) {
  return `<div class="stat-card"><span class="stat-icon ${color}">${icon(name)}</span><div><div class="stat-meta"><b>${n(value)}</b><span>${label}</span></div><p class="stat-desc">${esc(desc)}</p></div><span class="stat-tail">${icon('chevron-right')}</span></div>`;
}
function renderQueries() {
  const query = imageById(model.selectedQuery);
  if (!query || !model.data.queries.length) return `<div class="dropzone" data-drop="queries" role="button" tabindex="0" aria-label="Referans görsel seç veya buraya sürükle"><span class="drop-icon">${icon('upload')}</span><strong>Görsellerinizi buraya bırakın</strong><p>veya aşağıdan dosya seçin.<br>Tek görsel ya da birden fazla görsel.</p><small>JPG · PNG · WEBP · GIF · AVIF · TIFF</small></div>`;
  return `<div data-drop="queries"><div class="query-preview"><img src="${query.thumbUrl}" alt="${esc(query.name)}"><button class="remove-query" data-action="remove-query" data-id="${query.id}" aria-label="Referans görseli kaldır" ${model.busy?'disabled':''}>${icon('close')}</button><span class="query-image-caption" title="${esc(query.name)}">${esc(query.name)}</span></div>${model.data.queries.length>1?`<div class="query-thumbs" aria-label="Referans görseller">${model.data.queries.map(q => `<button class="${q.id===query.id?'active':''}" data-action="select-query" data-id="${q.id}" aria-label="${esc(q.name)}" title="${esc(q.name)}"><img src="${q.thumbUrl}" alt=""></button>`).join('')}</div>`:''}<p class="query-drop-hint">Yeni görselleri bu alana sürükleyebilirsiniz.</p></div>`;
}
function renderResults() {
  const record = latestRecord(), group = selectedGroup(), matches = validMatches(group);
  const filtered = matches.filter(m => model.resultFilter === 'all' || (model.resultFilter === 'exact' ? m.kind==='exact' : m.kind!=='exact'));
  filtered.sort(model.resultSort==='name' ? (a,b)=>imageById(a.imageId).name.localeCompare(imageById(b.imageId).name,'tr') : (a,b)=>b.score-a.score);
  const exact = matches.filter(m=>m.kind==='exact').length;
  return `<div class="results-heading"><div><div class="panel-title"><span class="step-number">02</span><h2>Bulunan kopyalar</h2></div><p class="panel-description">${record?`${n(matches.length)} eşleşme · ${n(record.libraryCount)} görsel karşılaştırıldı`:'Kendi görsel arşivinizdeki eşleşmeler.'}</p></div><button class="button button-secondary button-small" data-action="export" ${!record||model.busy?'disabled':''}>${icon('download')} Dışa aktar</button></div>
    <div class="results-tools"><div class="filter-tabs" role="group" aria-label="Eşleşme türü">${[['all','Tümü',matches.length],['exact','Birebir',exact],['similar','Benzer',matches.length-exact]].map(([key,label,count])=>`<button class="filter-tab ${model.resultFilter===key?'active':''}" data-action="filter" data-value="${key}" aria-pressed="${model.resultFilter===key}">${label}<b>${n(count)}</b></button>`).join('')}</div><select class="sort-select" id="result-sort" aria-label="Sonuç sıralaması"><option value="score" ${model.resultSort==='score'?'selected':''}>Benzerliğe göre</option><option value="name" ${model.resultSort==='name'?'selected':''}>Dosya adına göre</option></select></div>
    ${filtered.length?`<div class="result-grid">${filtered.map(resultCard).join('')}</div><p class="results-footnote">${icon('info')}Puan görsel kopya benzerliğidir; olasılık veya kişi kimliği değildir.${group.totalMatches>200?' Her referans için en iyi 200 sonuç gösterilir.':''}</p>`:emptyResults(record,group,matches.length)}
  `;
}
function emptyResults(record,group,count) {
  let heading = 'Eşleşmeler burada görünecek', text = 'Önce koleksiyonunuzu ekleyin, ardından bir referans görsel seçerek karşılaştırmayı başlatın.';
  if (record && !group) { heading='Bu görsel henüz karşılaştırılmadı'; text='Yeni eklediğiniz referans için karşılaştırmayı tekrar başlatın.'; }
  else if (record && !count) { heading='Bu eşikte kopya bulunamadı'; text='Koleksiyonunuzda aynı görselin bir kopyası olmayabilir. Eşiği biraz düşürerek tekrar deneyebilirsiniz.'; }
  else if (count) { heading='Bu filtrede sonuç yok'; text='Diğer eşleşmeleri görmek için “Tümü” filtresini seçin.'; }
  return `<div class="empty-results"><div class="empty-result-icon">${icon(record?'search':'images')}</div><h3>${heading}</h3><p>${text}</p>${!model.data.library.length?`<button class="button button-secondary button-small" data-action="library-folder" ${model.busy?'disabled':''}>${icon('folder')} Koleksiyon klasörü seç</button>`:''}</div>`;
}
function resultCard(match) {
  const image = imageById(match.imageId);
  return `<article class="result-card"><button class="result-image" data-action="compare" data-id="${image.id}" aria-label="${esc(image.name)} dosyasını karşılaştır"><img src="${image.thumbUrl}" alt="${esc(image.name)}" loading="lazy"><span class="match-tag ${match.kind}">${icon(match.kind==='exact'?'check-circle':'copy')}${labels[match.kind]}</span><span class="score-badge">${n(match.score)}<small>/ 100</small></span><span class="image-hover"><span>${icon('compare')} Karşılaştır</span></span></button><div class="result-body"><button class="result-filename" data-action="compare" data-id="${image.id}" title="${esc(image.name)}">${esc(image.name)}</button>${fileMeta(image)}<div class="result-bottom"><button data-action="compare" data-id="${image.id}">Yan yana incele ${icon('arrow-right')}</button><button class="reveal-button" data-action="reveal" data-id="${image.id}" aria-label="${esc(image.name)} dosyasını klasörde göster" title="Klasörde göster">${icon('folder')}</button></div></div></article>`;
}
function fileMeta(image) {
  return `<div class="file-meta"><span>${n(image.width)} × ${n(image.height)}</span><span class="dot">•</span><span>${bytes(image.size)}</span><span class="dot">•</span><span>${esc(image.format.toUpperCase())}</span></div>`;
}
function filteredLibrary() {
  const term = model.librarySearch.toLocaleLowerCase('tr-TR');
  return model.data.library.filter(i => i.name.toLocaleLowerCase('tr-TR').includes(term))
    .sort(model.librarySort==='name' ? (a,b)=>a.name.localeCompare(b.name,'tr') : model.librarySort==='size' ? (a,b)=>b.size-a.size : (a,b)=>b.addedAt.localeCompare(a.addedAt));
}
function renderLibrary() {
  return `<section class="page-heading"><div><div class="eyebrow"><span></span>KİŞİSEL GÖRSEL ARŞİVİ</div><h1>Koleksiyonum</h1><p>${n(model.data.library.length)} görsel · ${bytes(model.data.library.reduce((sum,i)=>sum+i.size,0))} kaynak dosya · Orijinaller yerinde kalır.</p></div><div class="heading-actions"><button class="button button-secondary" data-action="library-folder" ${model.busy?'disabled':''}>${icon('folder')} Klasör ekle</button><button class="button button-primary" data-action="add-library" ${model.busy?'disabled':''}>${icon('plus')} Görsel ekle</button></div></section>
  ${!model.data.library.length?`<div class="empty-full" data-drop="library">${icon('images')}<h2>Her arşiv bir görselle başlar.</h2><p>Görsellerinizi veya bir klasörü buraya sürükleyin. Koleksiyonunuz karşılaştırma için bilgisayarınızda hazırlanır.</p><div class="heading-actions"><button class="button button-dark" data-action="library-folder" ${model.busy?'disabled':''}>${icon('folder')} Klasör seç</button><button class="button button-secondary" data-action="demo" ${model.busy?'disabled':''}>Örneklerle dene</button></div></div>`:`<div class="library-toolbar"><div class="search-input-wrap">${icon('search')}<input id="library-search" class="search-input" placeholder="Dosya adına göre ara…" aria-label="Koleksiyonda dosya adına göre ara" value="${esc(model.librarySearch)}"></div><div id="selection-tools">${selectionTools()}</div><select id="library-sort" class="sort-select" aria-label="Koleksiyon sıralaması"><option value="newest" ${model.librarySort==='newest'?'selected':''}>Son eklenen</option><option value="name" ${model.librarySort==='name'?'selected':''}>Dosya adı</option><option value="size" ${model.librarySort==='size'?'selected':''}>Dosya boyutu</option></select></div><div id="library-items" data-drop="library">${libraryItems()}</div>`}`;
}
function selectionTools() {
  return `<div class="library-selection">${model.selected.size?`<button class="button button-secondary button-small" data-action="remove-selected" ${model.busy?'disabled':''}>${icon('trash')} ${n(model.selected.size)} kaydı kaldır</button>`:`<label class="checkbox-label"><input type="checkbox" id="select-page" ${model.busy?'disabled':''}> Bu sayfayı seç</label>`}</div>`;
}
function libraryItems() {
  const items = filteredLibrary(), pages = Math.max(1,Math.ceil(items.length/60));
  model.libraryPage = Math.min(model.libraryPage,pages);
  const visible = items.slice((model.libraryPage-1)*60,model.libraryPage*60);
  if (!visible.length) return `<div class="empty-full">${icon('search')}<h2>Aramanızla eşleşen dosya yok.</h2><p>Farklı bir dosya adıyla deneyin.</p></div>`;
  return `<div class="library-grid">${visible.map(image=>`<article class="library-card ${model.selected.has(image.id)?'selected':''}"><label class="library-check"><input type="checkbox" data-select="${image.id}" aria-label="${esc(image.name)} dosyasını seç" ${model.selected.has(image.id)?'checked':''} ${model.busy?'disabled':''}></label><button class="result-image" data-action="preview" data-id="${image.id}" aria-label="${esc(image.name)} dosyasını incele"><img src="${image.thumbUrl}" alt="${esc(image.name)}" loading="lazy"><span class="library-format">${esc(image.format)}</span></button><div class="result-body"><button class="result-filename" data-action="preview" data-id="${image.id}" title="${esc(image.name)}">${esc(image.name)}</button>${fileMeta(image)}</div></article>`).join('')}</div><div class="pagination"><button class="icon-button" data-action="previous-page" aria-label="Önceki sayfa" ${model.libraryPage===1?'disabled':''}>${icon('arrow-left')}</button><span>${n(model.libraryPage)} / ${n(pages)} · ${n(items.length)} görsel</span><button class="icon-button" data-action="next-page" aria-label="Sonraki sayfa" ${model.libraryPage===pages?'disabled':''}>${icon('arrow-right')}</button></div>`;
}
function updateLibrary() {
  if ($('#library-items')) $('#library-items').innerHTML = libraryItems();
  if ($('#selection-tools')) $('#selection-tools').innerHTML = selectionTools();
}
function renderHistory() {
  return `<section class="page-heading"><div><div class="eyebrow"><span></span>GEÇMİŞ KARŞILAŞTIRMALAR</div><h1>Bıraktığınız yerden.</h1><p>Son 20 karşılaştırmanız bu cihazda saklanır.</p></div><button class="button button-secondary" data-page="compare">${icon('scan')} Yeni karşılaştırma</button></section>${model.data.history.length?`<div class="history-list">${model.data.history.map(record=>{
    const query=imageById(record.groups[0]?.queryId);
    return `<article class="history-card">${query?`<img class="history-thumb" src="${query.thumbUrl}" alt="">`:`<span class="history-thumb"></span>`}<div><h3>${esc(query?.name||'Görsel karşılaştırması')}${record.queryCount>1?` + ${n(record.queryCount-1)} referans`:''}</h3><p>${n(record.libraryCount)} görsel · Eşik ${n(record.threshold)} · ${duration(record.durationMs)}</p></div><div class="history-metric"><b>${n(matchCount(record))}</b><small>eşleşme</small></div><div class="history-time">${date(record.createdAt)}</div><button class="button button-secondary button-small" data-action="open-history" data-id="${record.id}">Sonuçları aç ${icon('arrow-right')}</button></article>`;
  }).join('')}</div><p class="history-info">Koleksiyondan kaldırılan görsellerin sonuçları geçmişten de kaldırılır. Orijinal dosyalar taşınmış olsa bile önbellekteki önizlemeler görüntülenebilir.</p>`:`<div class="empty-full">${icon('history')}<h2>Henüz bir karşılaştırma yok.</h2><p>İlk karşılaştırmanızdan sonra sonuçlarınıza buradan dönebilirsiniz.</p><div class="heading-actions"><button class="button button-primary" data-page="compare">Karşılaştırmaya başla ${icon('arrow-right')}</button></div></div>`}`;
}
function renderSettings() {
  return `<section class="page-heading"><div><div class="eyebrow"><span></span>SİZİN ARŞİVİNİZ, SİZİN TERCİHLERİNİZ</div><h1>Gizlilik ve ayarlar</h1><p>Ayarlarınız otomatik olarak bu cihazda kaydedilir.</p></div><span class="local-badge">${icon('check-circle')} İnternet bağlantısı gerekmez</span></section><div class="settings-grid"><div class="settings-stack"><section class="panel settings-card"><div class="settings-title">${icon('sliders')}<h2>Karşılaştırma tercihleri</h2></div><p>Görselin tümündeki desenler, renkler ve dosya içeriği karşılaştırılır. Aynı konunun farklı fotoğraflarını bulmak için tasarlanmamıştır.</p><div class="threshold-control"><label class="field-label" for="settings-threshold">Varsayılan eşik<span class="threshold-value" id="settings-threshold-label">${n(model.threshold)} / 100</span></label><input id="settings-threshold" class="range-input" type="range" min="80" max="100" value="${model.threshold}" style="--range:${(model.threshold-80)*5}%" ${model.busy?'disabled':''}><div class="range-labels"><span>Daha esnek · 80</span><span>Birebir · 100</span></div></div><div class="setting-row"><div><strong>Hareketi azalt</strong><p>Geçişleri ve dekoratif animasyonları azaltır.</p></div><input id="reduced-motion" class="switch" type="checkbox" aria-label="Hareketi azalt" ${model.data.settings.reducedMotion?'checked':''} ${model.busy?'disabled':''}></div></section><section class="panel settings-card"><div class="settings-title">${icon('folder')}<h2>Yerel kayıtlar</h2></div><p>Dosya yolları, görsel özetleri, küçük resimler ve son 20 karşılaştırma bilgisayarınızda saklanır. Orijinal dosyalar kopyalanmaz veya silinmez.</p><p class="data-path">${esc(model.data.dataPath||'Windows kullanıcı uygulama verileri / ImageScanner')}</p><div class="data-actions"><button class="danger-link" data-action="clear" ${model.busy?'disabled':''}>Yerel kayıtları temizle</button></div></section></div><div class="settings-stack"><section class="panel settings-card"><div class="settings-title">${icon('shield-check')}<h2>Koleksiyonunuz size özel.</h2></div><p>ImageScanner yalnızca sizin eklediğiniz dosyalar üzerinde çalışır.</p><ul class="privacy-list"><li>${icon('check-circle')}<div><strong>Yükleme veya bulut servisi yok</strong><p>Görselleriniz ve karşılaştırma sonuçlarınız internet üzerinden gönderilmez.</p></div></li><li>${icon('check-circle')}<div><strong>Yüz tanıma ve kişi tespiti yok</strong><p>Kişi kimliği, sosyal medya hesabı veya profil eşleştirmesi yapılmaz.</p></div></li><li>${icon('check-circle')}<div><strong>Kontrol sizde</strong><p>Koleksiyondan bir görseli kaldırmak yalnızca uygulamadaki kaydını temizler.</p></div></li></ul></section><section class="panel settings-card"><div class="settings-title">${icon('image')}<h2>Desteklenen görseller</h2></div><div class="format-list">${['JPG','PNG','WEBP','GIF','AVIF','TIFF'].map(f=>`<span>${f}</span>`).join('')}</div><p class="format-help">Koleksiyon: 10.000 görsel · Referans: 100 görsel<br>Dosya başına 128 MB ve 60 megapiksel sınırı.<br>Hareketli dosyalarda yalnızca ilk kare karşılaştırılır. TIFF önizlemeleri küçük resimden gösterilir. Hafif merkez kırpması desteklenir; ağır kırpma ve döndürme kaçırılabilir.</p></section></div></div>`;
}
function renderProgress() {
  const el = $('#progress'), progress = model.progress;
  el.hidden = !progress;
  if (!progress) return;
  const percent = progress.total ? Math.round(progress.current / progress.total * 100) : 0;
  el.innerHTML = `<div class="progress-title"><span>${icon('loader','spinner')}${esc(progress.phase)}</span><button data-action="cancel" ${model.cancelling?'disabled':''}>${model.cancelling?'Durduruluyor…':'İptal et'}</button></div><div class="progress-track ${progress.total?'':'indeterminate'}"><div style="width:${progress.total?percent:40}%"></div></div><div class="progress-details">${progress.total?`${n(progress.current)} / ${n(progress.total)} · %${n(percent)}`:'Koleksiyon hazırlanıyor…'}</div>`;
}
function toast(message,error=false) {
  const el = document.createElement('div'); el.className=`toast${error?' error':''}`;
  el.innerHTML=`${icon(error?'warning':'check-circle')}<span>${esc(message)}</span><button aria-label="Bildirimi kapat">×</button>`;
  el.querySelector('button').onclick=()=>el.remove(); $('#toasts').append(el);
  setTimeout(()=>el.remove(),error?14000:6000);
}
async function run(task,done) {
  if (model.busy) return;
  clearTimeout(settingsTimer);
  model.busy=true; model.cancelling=false; render();
  try { await flushSettings(); const result=await task(); if(result?.state)applyState(result.state); if(done)await done(result); return result; }
  catch(error){toast(error.message,true);}
  finally{model.busy=false;model.progress=null;model.cancelling=false;render();}
}
function importNotice(result) {
  if (!result) return;
  if (result.added) toast(`${n(result.added)} görsel eklendi.${result.cancelled?' İşlem durduruldu; tamamlanan görseller korundu.':''}`);
  else if(result.skipped&&!result.cancelled)toast('Bu görseller zaten koleksiyonunuzda.');
  else if(!result.cancelled&&!result.errorCount)toast('Desteklenen bir görsel bulunamadı.');
  if(result.errorCount)toast(`${n(result.errorCount)} dosya eklenemedi.\n${result.errors.slice(0,3).map(e=>`${e.name}: ${e.message}`).join('\n')}`,true);
  if(result.truncated||result.overflow)toast('Görsel sınırına ulaşıldı. Koleksiyon en fazla 10.000, referanslar 100 görsel içerebilir.',true);
}
async function choose(kind,folder=false){return run(()=>api.choose(kind,folder),importNotice);}
function navigate(page) { if(!['compare','library','history','settings'].includes(page))return;model.page=page;render();$('#workspace').scrollTop=0; }
function openDialog(markup,small=false) {
  const modal=$('#modal');modal.innerHTML=markup;modal.style.width=small?'620px':'1040px';
  if(!modal.open)modal.showModal();
  const focus=modal.querySelector('button');if(focus)focus.focus();
}
function modalHeader(title,subtitle){return `<header class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(subtitle)}</p></div><button class="icon-button" data-action="close-modal" aria-label="Pencereyi kapat">${icon('close')}</button></header>`;}
function compareModal(id,mode='pair') {
  const query=imageById(model.selectedQuery), candidate=imageById(id), match=validMatches(selectedGroup()).find(m=>m.imageId===id);
  if(!query||!candidate||!match)return;
  overlayContext={id,mode};
  openDialog(`${modalHeader('Kopyaları yakından inceleyin',candidate.name)}<div class="modal-tools"><span class="comparison-score">${icon('check-circle')} ${n(match.score)} / 100 · ${labels[match.kind]}</span><div class="filter-tabs"><button class="filter-tab ${mode==='pair'?'active':''}" data-action="comparison-mode" data-value="pair">Yan yana</button><button class="filter-tab ${mode==='overlay'?'active':''}" data-action="comparison-mode" data-value="overlay">Üst üste</button></div></div><div class="modal-body">${mode==='pair'?`<div class="comparison-pair">${comparisonSide(query,'Referans görsel')}${comparisonSide(candidate,'Koleksiyondaki kopya')}</div>`:`<div class="overlay-compare"><img src="${candidate.originalUrl}" data-fallback="${candidate.thumbUrl}" alt="Koleksiyondaki kopya"><img class="overlay-top" id="overlay-top" src="${query.originalUrl}" data-fallback="${query.thumbUrl}" alt="Referans görsel"><span class="overlay-divider" id="overlay-divider">${icon('compare')}</span><span class="overlay-label left">Referans</span><span class="overlay-label right">Koleksiyon</span></div><input class="range-input overlay-range" id="overlay-range" type="range" min="0" max="100" value="50" aria-label="İki görsel arasındaki ayırıcı" style="--range:50%"><p class="field-help">Ayırıcıyı kaydırarak görseller arasındaki farkları inceleyin.</p>`}</div><footer class="modal-footer"><p>${esc(match.reason)} Puan, kimlik veya eşleşme olasılığı değildir.</p><button class="button button-secondary button-small" data-action="reveal" data-id="${candidate.id}">${icon('folder')} Klasörde göster</button></footer>`);
}
function comparisonSide(image,label){return `<div class="comparison-side"><p>${label}<strong>${n(image.width)} × ${n(image.height)}</strong></p><div class="comparison-image"><img src="${image.originalUrl}" data-fallback="${image.thumbUrl}" alt="${esc(image.name)}"></div><div class="comparison-info" title="${esc(image.path)}">${esc(image.name)}<br>${bytes(image.size)} · ${esc(image.format.toUpperCase())}${image.animated?' · İlk kare':''}</div></div>`;}
function previewModal(id){const image=imageById(id);if(!image)return;openDialog(`${modalHeader(image.name,`${n(image.width)} × ${n(image.height)} · ${bytes(image.size)}`)}<div class="modal-body" style="padding-top:22px"><img class="solo-image" src="${image.originalUrl}" data-fallback="${image.thumbUrl}" alt="${esc(image.name)}"><p class="data-path">${esc(image.path)}</p></div><footer class="modal-footer"><p>Orijinal dosyanız bulunduğu klasörde kalır.</p><button class="button button-secondary" data-action="reveal" data-id="${image.id}">${icon('folder')} Klasörde göster</button></footer>`);}
function exportModal(){if(!latestRecord())return;openDialog(`${modalHeader('Sonuçlarınızı yanınıza alın','Karşılaştırmanın tüm referansları dışa aktarılır.')}<div class="modal-body" style="padding-top:22px"><div class="export-options"><button class="export-choice" data-action="export-format" data-value="csv">${icon('file')}<strong>CSV dosyası</strong><p>Excel ve diğer tablo uygulamaları için. UTF-8, noktalı virgül ayracı.</p></button><button class="export-choice" data-action="export-format" data-value="json">${icon('code')}<strong>JSON dosyası</strong><p>Puanlar, dosya yolları ve karşılaştırma ayrıntılarıyla birlikte.</p></button></div><p class="field-help">Dışa aktarılan dosya yerel dosya yollarınızı içerir. Görselleriniz dosyaya eklenmez.</p></div>`,true);}
function flushSettings(){
  if(pendingSettings){const selected=pendingSettings;pendingSettings=null;settingsWrite=settingsWrite.catch(()=>{}).then(()=>api.settings(selected)).then(data=>{applyState(data);});}
  return settingsWrite;
}
function saveSettings(){
  pendingSettings={threshold:model.threshold,reducedMotion:model.data.settings.reducedMotion};
  clearTimeout(settingsTimer);settingsTimer=setTimeout(async()=>{try{await flushSettings();toast('Tercihleriniz kaydedildi.');}catch(error){toast(error.message,true);}},400);
}

document.addEventListener('click',async event=>{
  const windowButton=event.target.closest('[data-window]');if(windowButton){await api.window(windowButton.dataset.window);return;}
  const pageButton=event.target.closest('[data-page]');if(pageButton){event.preventDefault();navigate(pageButton.dataset.page);return;}
  const el=event.target.closest('[data-action]');if(!el||el.disabled)return;
  const {action,id,value}=el.dataset;
  try{
    if(action==='add-library')await choose('library');
    else if(action==='library-folder')await choose('library',true);
    else if(action==='add-query')await choose('queries');
    else if(action==='query-folder')await choose('queries',true);
    else if(action==='select-query'){model.selectedQuery=id;model.resultFilter='all';render();}
    else if(action==='remove-query')await run(()=>api.remove('queries',[id]));
    else if(action==='scan')await run(()=>api.scan(model.threshold),result=>{if(result.cancelled)toast('Karşılaştırma durduruldu.');else{model.activeRecord=result.record;model.resultFilter='all';toast(`${n(matchCount(result.record))} kopya bulundu. Karşılaştırma tamamlandı.`);}});
    else if(action==='demo')await run(async()=>{const result=await api.demo();if(result.state)applyState(result.state);if(result.cancelled)return result;model.selectedQuery=model.data.queries.find(q=>q.name==='kiyi-orijinal.png')?.id||model.selectedQuery;return api.scan(model.threshold);},result=>{if(result.record){model.activeRecord=result.record;model.page='compare';model.resultFilter='all';$('#workspace').scrollTop=0;toast('Örnek koleksiyon hazır. Kopyalara tıklayıp farkları inceleyebilirsiniz.');}else importNotice(result);});
    else if(action==='filter'){model.resultFilter=value;render();}
    else if(action==='compare')compareModal(id);
    else if(action==='comparison-mode'&&overlayContext)compareModal(overlayContext.id,value);
    else if(action==='preview')previewModal(id);
    else if(action==='reveal')await api.reveal(id);
    else if(action==='close-modal')$('#modal').close();
    else if(action==='export')exportModal();
    else if(action==='export-format'){const result=await api.export(latestRecord().id,value);if(!result.cancelled){$('#modal').close();toast(`${n(result.count)} sonuç kaydedildi.\n${result.path}`);}}
    else if(action==='cancel'){model.cancelling=true;renderProgress();await api.cancel();}
    else if(action==='open-history'){model.activeRecord=model.data.history.find(h=>h.id===id);model.selectedQuery=model.activeRecord.groups[0]?.queryId||model.selectedQuery;model.threshold=model.activeRecord.threshold;model.resultFilter='all';navigate('compare');}
    else if(action==='remove-selected')openDialog(`${modalHeader('Koleksiyondan kaldır',`${n(model.selected.size)} görsel kaydı seçildi.`)}<div class="modal-body"><p class="confirm-copy">Seçilen görsellerin uygulamadaki kayıtları ve geçmiş eşleşmeleri kaldırılır. Orijinal dosyalarınız korunur.</p></div><footer class="modal-footer"><button class="button button-secondary" data-action="close-modal">Vazgeç</button><button class="button button-dark" data-action="confirm-remove">Kayıtları kaldır</button></footer>`,true);
    else if(action==='confirm-remove'){$('#modal').close();await run(async()=>({state:await api.remove('library',[...model.selected])}),()=>{model.selected.clear();toast('Seçilen kayıtlar koleksiyondan kaldırıldı.');});}
    else if(action==='previous-page'){model.libraryPage--;updateLibrary();}
    else if(action==='next-page'){model.libraryPage++;updateLibrary();}
    else if(action==='clear')await run(()=>api.clear(),result=>{if(result.state){model.activeRecord=null;model.selectedQuery=null;toast('Yerel kayıtlar temizlendi. Orijinal dosyalarınız korundu.');}});
  }catch(error){toast(error.message,true);}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='threshold'||el.id==='settings-threshold'){
    model.threshold=Number(el.value);el.style.setProperty('--range',`${(model.threshold-80)*5}%`);
    $(`#${el.id}-label`).textContent=`${n(model.threshold)} / 100`;
    if(el.id==='settings-threshold')saveSettings();
  }
  if(el.id==='library-search'){model.librarySearch=el.value;model.libraryPage=1;updateLibrary();}
  if(el.id==='overlay-range'){$('#overlay-top').style.clipPath=`inset(0 ${100-Number(el.value)}% 0 0)`;$('#overlay-divider').style.left=`${el.value}%`;el.style.setProperty('--range',`${el.value}%`);}
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.id==='result-sort'){model.resultSort=el.value;render();}
  if(el.id==='library-sort'){model.librarySort=el.value;model.libraryPage=1;updateLibrary();}
  if(el.dataset.select){el.checked?model.selected.add(el.dataset.select):model.selected.delete(el.dataset.select);el.closest('.library-card').classList.toggle('selected',el.checked);$('#selection-tools').innerHTML=selectionTools();}
  if(el.id==='select-page'){const visible=filteredLibrary().slice((model.libraryPage-1)*60,model.libraryPage*60);for(const image of visible)model.selected.add(image.id);updateLibrary();}
  if(el.id==='reduced-motion'){model.data.settings.reducedMotion=el.checked;document.documentElement.classList.toggle('reduce-motion',el.checked);saveSettings();}
});
document.addEventListener('keydown',event=>{
  const drop=event.target.closest('[data-drop][role="button"]');
  if(drop&&(event.key==='Enter'||event.key===' ')){event.preventDefault();choose(drop.dataset.drop);}
});
document.addEventListener('click',event=>{const drop=event.target.closest('[data-drop][role="button"]');if(drop&&!event.target.closest('button'))choose(drop.dataset.drop);});
document.addEventListener('dragover',event=>{event.preventDefault();if(model.busy)return;event.target.closest('[data-drop]')?.classList.add('dragover');});
document.addEventListener('dragleave',event=>{const drop=event.target.closest('[data-drop]');if(drop&&!drop.contains(event.relatedTarget))drop.classList.remove('dragover');});
document.addEventListener('drop',async event=>{
  event.preventDefault();document.querySelectorAll('.dragover').forEach(el=>el.classList.remove('dragover'));
  if(model.busy)return;const zone=event.target.closest('[data-drop]');
  if(!zone){toast('Görselleri referans yükleme alanına veya Koleksiyonum ekranına bırakın.');return;}
  const files=Array.from(event.dataTransfer.files);if(files.length)await run(()=>api.drop(files,zone.dataset.drop),importNotice);
});
document.addEventListener('error',event=>{const image=event.target;if(image.tagName==='IMG'&&image.dataset.fallback&&!image.dataset.usedFallback){image.dataset.usedFallback='true';image.src=image.dataset.fallback;}},true);
$('#modal').addEventListener('click',event=>{if(event.target===$('#modal')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
api.onProgress(progress=>{model.progress=progress;renderProgress();});
(async()=>{
  hydrateIcons();
  try{applyState(await api.state());model.threshold=model.data.settings.threshold||88;model.activeRecord=model.data.history[0]||null;render();if(model.data.warning)toast(model.data.warning,true);}
  catch(error){$('#view').innerHTML=`<div class="empty-full">${icon('warning')}<h2>Çalışma alanı açılamadı.</h2><p>${esc(error.message)}</p></div>`;}
})();
