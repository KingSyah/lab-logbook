document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  // ── Config ────────────────────────────────────────────────
  // Published CSV URL langsung dari Google Sheets
  const CSV_BASE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRx8RPFkGcmQaO563xYGim9sDCMoraQlOwIxytMSWzY1FJS4UISS8QRLw-Nhy0FQGBTxramnjnGUKfj/pub?gid=14145562&single=true&output=csv";
  const LOKASI_COL       = 6;
  const ITEMS_PER_PAGE   = 15;

  // ── State ─────────────────────────────────────────────────
  let allData      = [];
  let filteredData = [];
  let currentPage  = 1;
  let searchTerm   = '';
  let countersInit = false;
  let todayCounter, monthCounter, yearCounter;

  // ── DOM refs ──────────────────────────────────────────────
  const tbody       = document.getElementById('logbook-body');
  const lokasiSel   = document.getElementById('lokasi-filter');
  const searchInput = document.getElementById('search-input');
  const refreshBtn  = document.getElementById('refresh-btn');
  const printBtn    = document.getElementById('print-pdf-btn');
  const prevBtn     = document.getElementById('prev-page');
  const nextBtn     = document.getElementById('next-page');
  const pageInfo    = document.getElementById('page-info');
  const dataCount   = document.getElementById('data-count');

  // ── Events ────────────────────────────────────────────────
  refreshBtn.addEventListener('click', fetchData);
  printBtn.addEventListener('click', printToPdf);
  lokasiSel.addEventListener('change', applyFilters);
  searchInput.addEventListener('input', () => { searchTerm = searchInput.value.toLowerCase(); applyFilters(); });
  prevBtn.addEventListener('click', () => { currentPage--; renderTable(); });
  nextBtn.addEventListener('click', () => { currentPage++; renderTable(); });

  // ── Helpers ───────────────────────────────────────────────
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function isDataRow(row) {
    return row && row.length > LOKASI_COL && row[1] && row[2] && row[LOKASI_COL];
  }

  function parseDateStr(s) {
    if (!s) return null;
    let d = new Date(s);
    if (!isNaN(d)) return d;
    const p = s.split(/[\/ :]/);
    if (p.length >= 3) {
      // Try DD/MM/YYYY
      d = new Date(+p[2], +p[1]-1, +p[0]);
      if (!isNaN(d)) return d;
    }
    return null;
  }

  // ── Counters ──────────────────────────────────────────────
  function initCounters() {
    if (countersInit || typeof countUp === 'undefined') return;
    todayCounter = new countUp.CountUp('today-counter', 0, { duration: 1.5 });
    monthCounter = new countUp.CountUp('month-counter', 0, { duration: 1.5 });
    yearCounter  = new countUp.CountUp('year-counter',  0, { duration: 1.5 });
    todayCounter.start(); monthCounter.start(); yearCounter.start();
    countersInit = true;
  }

  function updateStats(data) {
    initCounters();
    if (!countersInit) return;

    const now   = new Date();
    const day0  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mon0  = new Date(now.getFullYear(), now.getMonth(), 1);
    const year0 = new Date(now.getFullYear(), 0, 1);
    const rows  = data.slice(1).filter(isDataRow);

    const tc = rows.filter(r => { const d = parseDateStr(r[0]); return d && d >= day0; }).length;
    const mc = rows.filter(r => { const d = parseDateStr(r[0]); return d && d >= mon0; }).length;
    const yc = rows.filter(r => { const d = parseDateStr(r[0]); return d && d >= year0; }).length;
    const max = Math.max(yc, 1);

    todayCounter.update(tc); monthCounter.update(mc); yearCounter.update(yc);

    // Animate bars after short delay
    setTimeout(() => {
      document.getElementById('bar-today').style.width = (tc / max * 100) + '%';
      document.getElementById('bar-month').style.width = (mc / max * 100) + '%';
      document.getElementById('bar-year').style.width  = '100%';
    }, 300);
  }

  // ── Filter ────────────────────────────────────────────────
  function populateLokasi() {
    const prev   = lokasiSel.value;
    const unique = [...new Set(allData.slice(1).map(r => r[LOKASI_COL]).filter(Boolean))].sort();
    lokasiSel.innerHTML = '<option value="all">Semua Lokasi</option>';
    unique.forEach(l => {
      const o = document.createElement('option');
      o.value = o.textContent = l;
      lokasiSel.appendChild(o);
    });
    if (prev) lokasiSel.value = prev;
  }

  function applyFilters() {
    currentPage = 1;
    const sel = lokasiSel.value;
    let rows = allData.slice(1).filter(isDataRow);

    if (sel !== 'all') rows = rows.filter(r => r[LOKASI_COL] === sel);

    if (searchTerm) {
      rows = rows.filter(r =>
        r.some(cell => String(cell).toLowerCase().includes(searchTerm))
      );
    }

    // Keep header + filtered rows
    filteredData = allData.length ? [allData[0], ...rows] : [];
    renderTable();
    updateStats(filteredData.length > 1 ? filteredData : allData);
  }

  // ── Render table ──────────────────────────────────────────
  function renderTable() {
    tbody.innerHTML = '';

    const rows = filteredData.slice(1).filter(isDataRow);
    const total = Math.ceil(rows.length / ITEMS_PER_PAGE);
    currentPage = Math.max(1, Math.min(currentPage, total || 1));

    dataCount.textContent = `${rows.length} entri ditemukan`;

    if (!rows.length) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">Tidak ada data yang cocok.</td></tr>`;
      pageInfo.textContent = '0 / 0';
      prevBtn.disabled = nextBtn.disabled = true;
      return;
    }

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const slice = rows.slice(start, start + ITEMS_PER_PAGE);

    slice.forEach(row => {
      tbody.innerHTML += `<tr>
        <td style="color:var(--ink-3);font-size:.8rem;white-space:nowrap">${esc(row[0])}</td>
        <td style="font-weight:500">${esc(row[1])}</td>
        <td style="font-family:monospace;font-size:.8rem">${esc(row[2])}</td>
        <td style="white-space:nowrap">${esc(row[3])}</td>
        <td>${esc(row[4])}</td>
        <td style="color:var(--ink-2)">${esc(row[5])}</td>
        <td><span class="badge">${esc(row[6])}</span></td>
      </tr>`;
    });

    pageInfo.textContent    = `${currentPage} / ${total}`;
    prevBtn.disabled        = currentPage <= 1;
    nextBtn.disabled        = currentPage >= total;
  }

  // ── Print PDF ─────────────────────────────────────────────
  function printToPdf() {
    if (typeof window.jspdf === 'undefined') { alert('Library PDF belum siap, coba lagi.'); return; }
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF('l', 'mm', 'a4');
    const selT = lokasiSel.options[lokasiSel.selectedIndex].text;
    const tgl  = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    const cx   = doc.internal.pageSize.getWidth() / 2;

    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('LOGBOOK PENGGUNAAN LABORATORIUM', cx, 15, { align:'center' });
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text(`Lokasi: ${selT}  |  Tanggal Cetak: ${tgl}`, cx, 23, { align:'center' });

    const selV = lokasiSel.value;
    let heads = ['Timestamp','Nama','NPM/NIP','Tanggal','Aktivitas','Keterangan','Lokasi'];
    const rows  = filteredData.slice(1).filter(isDataRow).map(r => r.slice(0,7));
    if (selV !== 'all') { heads = heads.slice(0,6); }

    doc.autoTable({
      head: [selV !== 'all' ? heads : heads],
      body: selV !== 'all' ? rows.map(r => r.slice(0,6)) : rows,
      startY: 28, theme: 'grid',
      headStyles: { fillColor: [13, 148, 136], fontSize: 8 },
      styles: { fontSize: 7.5 }, margin: { top: 28 }
    });

    const n = doc.internal.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFontSize(7);
      doc.text(`© ${new Date().getFullYear()} Laboratorium Teknik Elektro dan Komputer  |  Hal ${i} dari ${n}`,
        cx, doc.internal.pageSize.getHeight() - 8, { align:'center' });
    }
    doc.save(`Logbook-${selT}-${Date.now()}.pdf`);
  }

  // ── Fetch data ────────────────────────────────────────────
  function showLoading() {
    tbody.innerHTML = `<tr class="loading-row"><td colspan="7">
      <div class="loader-wrap"><div class="spinner"></div><span>Memuat data...</span></div>
    </td></tr>`;
  }

  function showError(detail) {
    tbody.innerHTML = `<tr class="error-row"><td colspan="7">
      <div class="error-box">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Gagal memuat data</div>
        <div class="error-msg">${detail}</div>
        <button class="retry-btn" onclick="location.reload()">Coba Lagi</button>
      </div>
    </td></tr>`;
    refreshBtn.classList.remove('loading');
  }

  function isHTML(text) {
    return text && text.trimStart().startsWith('<');
  }

  function tryParse(csvText) {
    if (!csvText || isHTML(csvText)) return null;
    const result = Papa.parse(csvText.trim(), { skipEmptyLines: true });
    if (!result.data || result.data.length < 2) return null;
    return result.data;
  }

  async function fetchData() {
    refreshBtn.classList.add('loading');
    showLoading();

    const cb = Date.now();
    const url = `${CSV_BASE}&t=${cb}`;

    const attempts = [
      // 1. Langsung — published URL sudah support CORS
      () => fetch(url).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }),

      // 2. PapaParse download mode
      () => new Promise((res, rej) => {
        Papa.parse(url, {
          download: true, skipEmptyLines: true,
          complete: r => res({ _papa: r.data }),
          error: rej
        });
      }),

      // 3. corsproxy.io
      () => fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`)
              .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }),

      // 4. allorigins
      () => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
              .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); }),
    ];

    const TIMEOUT = 10000;

    for (let i = 0; i < attempts.length; i++) {
      try {
        console.log(`[${i+1}] Mencoba metode ke-${i+1}...`);
        const result = await Promise.race([
          attempts[i](),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), TIMEOUT))
        ]);

        // PapaParse download mode returns object
        if (result && result._papa) {
          const data = result._papa;
          if (data && data.length >= 2) {
            console.log(`✅ Berhasil via metode ${i+1} — ${data.length} baris`);
            onDataReady(data);
            return;
          }
          throw new Error('Data kosong dari PapaParse');
        }

        const data = tryParse(result);
        if (data) {
          console.log(`✅ Berhasil via metode ${i+1} — ${data.length} baris`);
          onDataReady(data);
          return;
        }
        throw new Error('Response tidak valid atau HTML');

      } catch (err) {
        console.warn(`❌ Metode ${i+1} gagal:`, err.message);
      }
    }

    showError(`
      Semua metode koneksi gagal.<br><br>
      <strong>Pastikan:</strong><br>
      1. Buka spreadsheet → <b>File → Share → Publish to web</b><br>
      2. Pilih sheet yang benar → format <b>CSV</b> → klik <b>Publish</b><br>
      3. Refresh halaman ini
    `);
  }

  function onDataReady(data) {
    allData = data;
    refreshBtn.classList.remove('loading');
    populateLokasi();
    applyFilters();
  }

  // ── Init ──────────────────────────────────────────────────
  fetchData();
});
