document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const SHEET_ID = '17BPISEu5o6qDmsNtSh8hmimMLXujwFp4-SpHrQK3XO0';
  let allData = [];
  const LOKASI_COLUMN_INDEX = 6;
  const ITEMS_PER_PAGE = 10;
  let currentPage = 1;
  let filteredData = [];

  // Counter instances
  const todayCounter = new countUp.CountUp('today-counter', 0, { duration: 2 });
  const monthCounter = new countUp.CountUp('month-counter', 0, { duration: 2 });
  const yearCounter = new countUp.CountUp('year-counter', 0, { duration: 2 });

  // Start the counters
  todayCounter.start();
  monthCounter.start();
  yearCounter.start();

  const lokasiFilter = document.getElementById('lokasi-filter');
  const refreshBtn = document.getElementById('refresh-btn');
  const printBtn = document.getElementById('print-pdf-btn');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');

  refreshBtn.addEventListener('click', fetchData);
  printBtn.addEventListener('click', printToPdf);
  lokasiFilter.addEventListener('change', filterAndRender);
  prevPageBtn.addEventListener('click', () => changePage(-1));
  nextPageBtn.addEventListener('click', () => changePage(1));

  function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>"']/g, tag => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[tag] || tag));
  }

  function isValidRow(row) {
    return row && row.length > LOKASI_COLUMN_INDEX && row.slice(1, 5).every(Boolean) && row[LOKASI_COLUMN_INDEX];
  }

  function populateLokasiFilter() {
    const uniqueLokasi = [...new Set(allData.slice(1).map(row => row[LOKASI_COLUMN_INDEX]).filter(Boolean))];
    uniqueLokasi.sort();
    
    const currentFilterValue = lokasiFilter.value;
    lokasiFilter.innerHTML = '<option value="all">Semua Lokasi</option>';

    uniqueLokasi.forEach(lokasi => {
      const option = document.createElement('option');
      option.value = lokasi;
      option.textContent = lokasi;
      lokasiFilter.appendChild(option);
    });
    lokasiFilter.value = currentFilterValue;
  }

  function parseTimestamp(timestamp) {
    // Handle different date formats
    if (!timestamp) return null;
    
    // Try parsing as M/D/YYYY H:mm:ss format
    let date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date;
    }

    // Try parsing DD/MM/YYYY format
    const parts = timestamp.split(/[\/\s:]/);
    if (parts.length >= 3) {
      // Assuming DD/MM/YYYY format
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Months are 0-based
      const year = parseInt(parts[2], 10);
      date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  function updateCounters(data) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    const validRows = data.slice(1).filter(isValidRow);
    
    const todayCount = validRows.filter(row => {
      const date = parseTimestamp(row[0]);
      if (!date) return false;
      return date >= startOfDay;
    }).length;

    const monthCount = validRows.filter(row => {
      const date = parseTimestamp(row[0]);
      if (!date) return false;
      return date >= startOfMonth;
    }).length;

    const yearCount = validRows.filter(row => {
      const date = parseTimestamp(row[0]);
      if (!date) return false;
      return date >= startOfYear;
    }).length;

    console.log('Counters:', {
      today: todayCount,
      month: monthCount,
      year: yearCount,
      totalRows: validRows.length,
      sampleDates: validRows.slice(0, 3).map(row => ({
        original: row[0],
        parsed: parseTimestamp(row[0])
      }))
    });

    todayCounter.update(todayCount);
    monthCounter.update(monthCount);
    yearCounter.update(yearCount);
  }

  function changePage(delta) {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    currentPage = Math.max(1, Math.min(currentPage + delta, totalPages));
    renderTable(filteredData);
  }

  function renderTable(dataToRender) {
    const tbody = document.getElementById('logbook-body');
    tbody.innerHTML = '';
    
    if (!dataToRender.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">Tidak ada data yang cocok.</td></tr>';
      pageInfo.textContent = 'Halaman 0 dari 0';
      prevPageBtn.disabled = true;
      nextPageBtn.disabled = true;
      return;
    }

    const totalPages = Math.ceil((dataToRender.length - 1) / ITEMS_PER_PAGE);
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, dataToRender.length);

    dataToRender.slice(startIdx, endIdx).forEach(row => {
      if (!isValidRow(row)) return;
      tbody.innerHTML += `<tr>
        <td>${escapeHTML(row[0])}</td>
        <td>${escapeHTML(row[1])}</td>
        <td>${escapeHTML(row[2])}</td>
        <td>${escapeHTML(row[3])}</td>
        <td>${escapeHTML(row[4])}</td>
        <td>${escapeHTML(row[5])}</td>
        <td>${escapeHTML(row[6])}</td>
      </tr>`;
    });

    pageInfo.textContent = `Halaman ${currentPage} dari ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  function filterAndRender() {
    const selectedLokasi = lokasiFilter.value;
    currentPage = 1;

    if (selectedLokasi === 'all') {
      filteredData = allData;
    } else {
      const header = allData[0];
      filteredData = [header, ...allData.slice(1).filter(row => row[LOKASI_COLUMN_INDEX] === selectedLokasi)];
    }

    renderTable(filteredData);
    updateCounters(filteredData);
  }

  function printToPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const selectedLokasiValue = lokasiFilter.value;
    const selectedLokasiText = lokasiFilter.options[lokasiFilter.selectedIndex].text;
    const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGBOOK PENGGUNAAN LABORATORIUM', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Lokasi: ${selectedLokasiText}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.text(`Tanggal Cetak: ${today}`, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });

    const tableElement = document.getElementById('logbook-table');
    let tableHeaders = [...tableElement.querySelectorAll('thead th')].map(th => th.innerText);
    let tableBody = [...tableElement.querySelectorAll('tbody tr')].map(tr => {
        if (tr.querySelector('td').colSpan === 7) return null;
        return [...tr.querySelectorAll('td')].map(td => td.innerText);
    }).filter(Boolean);

    if (selectedLokasiValue !== 'all') {
        tableHeaders.pop();
        tableBody = tableBody.map(row => {
            row.pop();
            return row;
        });
    }

    doc.autoTable({
      head: [tableHeaders],
      body: tableBody,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { fontSize: 8 },
      margin: { top: 30 }
    });

    const pageCount = doc.internal.getNumberOfPages();
    const footerText = `© ${new Date().getFullYear()} Laboratorium Teknik Elektro dan Komputer`;

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`Logbook Laboratorium - ${selectedLokasiText}.pdf`);
  }

  function fetchData() {
    refreshBtn.classList.add('loading');
    
    const timestamp = new Date().getTime();
    const GSheet_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&t=${timestamp}`;
    const PROXY_URL = 'https://api.allorigins.win/raw?url=';
    const CSV_URL = `${PROXY_URL}${encodeURIComponent(GSheet_URL)}`;
    
    Papa.parse(CSV_URL, {
      download: true,
      complete: (results) => {
        allData = results.data;
        console.log('Data loaded:', allData);
        populateLokasiFilter();
        filterAndRender();
        refreshBtn.classList.remove('loading');
      },
      error: (error) => {
        console.error('Error fetching or parsing CSV:', error);
        document.getElementById('logbook-body').innerHTML = 
          '<tr><td colspan="7" style="text-align:center; color:#e11d48;">' +
          'Gagal memuat data. Pastikan spreadsheet sudah publik dan bisa diakses.' +
          '</td></tr>';
        refreshBtn.classList.remove('loading');
      }
    });
  }

  fetchData();
}); 