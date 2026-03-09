window.addEventListener('load', () => {
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (typeof Papa !== 'undefined' && typeof countUp !== 'undefined') {
      clearInterval(interval);
      initApp();
    } else if (attempts > 30) {
      clearInterval(interval);
      document.getElementById('logbook-body').innerHTML =
        '<tr><td colspan="7" style="text-align:center;color:#e11d48;">Gagal memuat library. Periksa koneksi internet dan refresh halaman.</td></tr>';
    }
  }, 200);
});

function initApp() {
  document.getElementById('year').textContent = new Date().getFullYear();

  const SHEET_ID = '17BPISEu5o6qDmsNtSh8hmimMLXujwFp4-SpHrQK3XO0';

  let allData = [];
  const LOKASI_COLUMN_INDEX = 6;
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let filteredData = [];

  const todayCounter = new countUp.CountUp('today-counter', 0, { duration: 2 });
  const monthCounter = new countUp.CountUp('month-counter', 0, { duration: 2 });
  const yearCounter  = new countUp.CountUp('year-counter',  0, { duration: 2 });
  todayCounter.start();
  monthCounter.start();
  yearCounter.start();

  const lokasiFilter = document.getElementById('lokasi-filter');
  const refreshBtn   = document.getElementById('refresh-btn');
  const printBtn     = document.getElementById('print-pdf-btn');
  const prevPageBtn  = document.getElementById('prev-page');
  const nextPageBtn  = document.getElementById('next-page');
  const pageInfo     = document.getElementById('page-info');

  refreshBtn.addEventListener('click', fetchData);
  printBtn.addEventListener('click', printToPdf);
  lokasiFilter.addEventListener('change', filterAndRender);
  prevPageBtn.addEventListener('click', () => changePage(-1));
  nextPageBtn.addEventListener('click', () => changePage(1));

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>"']/g, t =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[t]));
  }

  function isValidRow(row) {
    return row && row.length > LOKASI_COLUMN_INDEX &&
           row.slice(1, 5).every(Boolean) && row[LOKASI_COLUMN_INDEX];
  }

  function parseTimestamp(ts) {
    if (!ts) return null;
    let d = new Date(ts);
    if (!isNaN(d)) return d;
    const p = ts.split(/[\/\s:]/);
    if (p.length >= 3) {
      d = new Date(+p[2], +p[1] - 1, +p[0]);
      if (!isNaN(d)) return d;
    }
    return null;
  }

  function populateLokasiFilter() {
    const prev = lokasiFilter.value;
    const unique = [...new Set(allData.slice(1).map(r => r[LOKASI_COLUMN_INDEX]).filter(Boolean))].sort();
    lokasiFilter.innerHTML = '<option value="all">Semua Lokasi</option>';
    unique.forEach(l => {
      const o = document.createElement('option');
      o.value = o.textContent = l;
      lokasiFilter.appendChild(o);
    });
    lokasiFilter.value = prev;
  }

  function updateCounters(data) {
    const now  = new Date();
    const day  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const mon  = new Date(now.getFullYear(), now.getMonth(), 1);
    const year = new Date(now.getFullYear(), 0, 1);
    const rows = data.slice(1).filter(isValidRow);
    todayCounter.update(rows.filter(r => { const d = parseTimestamp(r[0]); return d && d >= day; }).length);
    monthCounter.update(rows.filter(r => { const d = parseTimestamp(r[0]); return d && d >= mon; }).length);
    yearCounter.update( rows.filter(r => { const d = parseTimestamp(r[0]); return d && d >= year; }).length);
  }

  function changePage(delta) {
    const total = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    currentPage = Math.max(1, Math.min(currentPage + delta, total));
    renderTable(filteredData);
  }

  function renderTable(data) {
    const tbody = document.getElementById('logbook-body');
    tbody.innerHTML = '';
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">Tidak ada data yang cocok.</td></tr>';
      pageInfo.textContent = 'Halaman 0 dari 0';
      prevPageBtn.disabled = nextPageBtn.disabled = true;
      return;
    }
    const total    = Math.ceil((data.length - 1) / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx   = Math.min(startIdx + ITEMS_PER_PAGE, data.length);
    data.slice(startIdx, endIdx).forEach(row => {
      if (!isValidRow(row)) return;
      tbody.innerHTML += `<tr>${row.slice(0, 7).map(c => `<td>${escapeHTML(c)}</td>`).join('')}</tr>`;
    });
    pageInfo.textContent  = `Halaman ${currentPage} dari ${total}`;
    prevPageBtn.disabled  = currentPage === 1;
    nextPageBtn.disabled  = currentPage === total;
  }

  function filterAndRender() {
    const sel = lokasiFilter.value;
    currentPage = 1;
    filteredData = sel === 'all'
      ? allData
      : [allData[0], ...allData.slice(1).filter(r => r[LOKASI_COLUMN_INDEX] === sel)];
    renderTable(filteredData);
    updateCounters(filteredData);
  }

  function printToPdf() {
    const { jsPDF } = window.jspdf;
    const doc  = new jsPDF('l', 'mm', 'a4');
    const selV = lokasiFilter.value;
    const selT = lokasiFilter.options[lokasiFilter.selectedIndex].text;
    const tgl  = new Date().toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    const cx   = doc.internal.pageSize.getWidth() / 2;
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('LOGBOOK PENGGUNAAN LABORATORIUM', cx, 15, { align:'center' });
    doc.setFontSize(12); doc.setFont('helvetica','normal');
    doc.text(`Lokasi: ${selT}`, cx, 22, { align:'center' });
    doc.text(`Tanggal Cetak: ${tgl}`, cx, 29, { align:'center' });
    const tbl = document.getElementById('logbook-table');
    let heads = [...tbl.querySelectorAll('thead th')].map(th => th.innerText);
    let rows  = [...tbl.querySelectorAll('tbody tr')]
      .map(tr => tr.querySelector('td').colSpan === 7 ? null : [...tr.querySelectorAll('td')].map(td => td.innerText))
      .filter(Boolean);
    if (selV !== 'all') { heads.pop(); rows = rows.map(r => { r.pop(); return r; }); }
    doc.autoTable({ head:[heads], body:rows, startY:35, theme:'grid',
      headStyles:{ fillColor:[22,160,133] }, styles:{ fontSize:8 }, margin:{ top:30 } });
    const n = doc.internal.getNumberOfPages();
    const ft = `© ${new Date().getFullYear()} Laboratorium Teknik Elektro dan Komputer`;
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFontSize(8);
      doc.text(ft, cx, doc.internal.pageSize.getHeight() - 10, { align:'center' });
    }
    doc.save(`Logbook Laboratorium - ${selT}.pdf`);
  }

  // ── Fetch dengan validasi isi response ───────────────────────────────────────
  async function fetchWithTimeout(promise, ms = 12000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
  }

  function looksLikeCSV(text) {
    // Pastikan bukan HTML login page Google
    if (!text) return false;
    if (text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) return false;
    // Harus ada minimal 1 koma atau baris
    return text.includes(',') || text.includes('\n');
  }

  async function fetchData() {
    refreshBtn.classList.add('loading');
    document.getElementById('logbook-body').innerHTML =
      '<tr><td colspan="7" style="text-align:center;color:#888;">Memuat data...</td></tr>';

    const cb = `&t=${Date.now()}`;
    const directUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0${cb}`;

    const strategies = [
      {
        label: 'Direct',
        getCSV: async () => {
          const r = await fetch(directUrl, { mode: 'cors' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        }
      },
      {
        label: 'corsproxy.io',
        getCSV: async () => {
          const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(directUrl)}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.text();
        }
      },
      {
        label: 'allorigins',
        getCSV: async () => {
          const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          if (!j.contents) throw new Error('Contents kosong');
          return j.contents;
        }
      },
      {
        label: 'PapaParse download',
        getCSV: () => new Promise((resolve, reject) => {
          // Fallback terakhir: biarkan PapaParse yang handle fetch-nya sendiri
          Papa.parse(directUrl, {
            download: true,
            skipEmptyLines: true,
            complete: ({ data }) => resolve({ _papaData: data }),
            error: reject
          });
        })
      }
    ];

    for (const s of strategies) {
      try {
        console.log(`⏳ Mencoba: ${s.label}`);
        const result = await fetchWithTimeout(s.getCSV(), 12000);

        // Strategi terakhir (PapaParse download) langsung beri data
        if (result && result._papaData) {
          const data = result._papaData;
          if (!data || data.length < 2) throw new Error('Data < 2 baris');
          console.log(`✅ Berhasil via ${s.label} — ${data.length} baris`);
          onDataLoaded(data);
          return;
        }

        // Strategi lain: validasi dulu isi CSV-nya
        const csvText = result;
        if (!looksLikeCSV(csvText)) {
          console.warn(`⚠️ ${s.label} mengembalikan bukan CSV (mungkin HTML redirect):`, csvText.slice(0, 100));
          throw new Error('Response bukan CSV');
        }

        Papa.parse(csvText, {
          skipEmptyLines: true,
          complete: ({ data }) => {
            if (!data || data.length < 2) {
              console.warn(`⚠️ ${s.label}: parsed tapi data < 2 baris`);
              return;
            }
            console.log(`✅ Berhasil via ${s.label} — ${data.length} baris`);
            onDataLoaded(data);
          },
          error: (err) => console.warn(`PapaParse error dari ${s.label}:`, err)
        });
        return;

      } catch (err) {
        console.warn(`❌ Gagal via ${s.label}:`, err.message);
      }
    }

    showError('Gagal memuat data. Pastikan spreadsheet sudah di-set <b>"Siapa saja yang memiliki link"</b> dan coba refresh.');
  }

  function onDataLoaded(data) {
    allData = data;
    populateLokasiFilter();
    filterAndRender();
    refreshBtn.classList.remove('loading');
  }

  function showError(msg) {
    document.getElementById('logbook-body').innerHTML =
      `<tr><td colspan="7" style="text-align:center;color:#e11d48;padding:1.5rem;">⚠️ ${msg}</td></tr>`;
    refreshBtn.classList.remove('loading');
  }

  fetchData();
}
