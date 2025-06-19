document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  const SHEET_ID = '17BPISEu5o6qDmsNtSh8hmimMLXujwFp4-SpHrQK3XO0';
  let allData = [];
  const LOKASI_COLUMN_INDEX = 6;

  const lokasiFilter = document.getElementById('lokasi-filter');
  const refreshBtn = document.getElementById('refresh-btn');
  const printBtn = document.getElementById('print-pdf-btn');

  refreshBtn.addEventListener('click', fetchData);
  printBtn.addEventListener('click', printToPdf);
  lokasiFilter.addEventListener('change', filterAndRender);

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

  function renderTable(dataToRender) {
    const tbody = document.getElementById('logbook-body');
    tbody.innerHTML = '';
    let validCount = 0;

    dataToRender.slice(1).forEach(row => {
      if (!isValidRow(row)) return;
      validCount++;
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

    if (validCount === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">Tidak ada data yang cocok.</td></tr>';
    }
  }

  function filterAndRender() {
    const selectedLokasi = lokasiFilter.value;
    if (selectedLokasi === 'all') {
      renderTable(allData);
    } else {
      const header = allData[0];
      const filteredData = allData.slice(1).filter(row => row[LOKASI_COLUMN_INDEX] === selectedLokasi);
      renderTable([header, ...filteredData]);
    }
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
        if (tr.querySelector('td').colSpan === 7) return null; // Skip "no data" row
        return [...tr.querySelectorAll('td')].map(td => td.innerText);
    }).filter(Boolean); // Remove null entries

    // If a specific location is filtered, remove the 'Lokasi' column for the PDF
    if (selectedLokasiValue !== 'all') {
        tableHeaders.pop(); // Remove 'Lokasi' header
        tableBody = tableBody.map(row => {
            row.pop(); // Remove 'Lokasi' data from each row
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