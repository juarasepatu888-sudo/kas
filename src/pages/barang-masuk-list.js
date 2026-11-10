import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { fetchNewSuppliesFromGoogleSheets, commitImportedSupplies } from '../services/googleSheets.js';

export function renderBarangMasukListPage(store, filterStatus = 'all', isAdmin = true) {
  const supplies = store.getSupplies();
  
  const stockReport = store.getRealtimeStockReport ? store.getRealtimeStockReport() : { summary: { totalSisaPasang: 0 } };
  const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
  const totalItems = supplies.reduce((sum, s) => sum + (Number(s.itemsCount) || 0), 0);
  const totalSisa = stockReport.summary.totalSisaPasang;

  return `
    <div class="page-fade-in flex-1 flex flex-col w-full bg-surface pb-6">
      ${renderHeader({
        title: 'Belanja & Stock',
        badge: 'Stock Toko',
        subtitle: 'Daftar Belanja & Stock Sepatu'
      })}

      <div class="flex flex-col w-full px-4 pt-3 pb-6 gap-3">
        <!-- KPI Belanja & Sisa Stock Cards -->
        <section class="grid grid-cols-2 gap-2">
          <div class="glass-card glass-sheen rounded-lg p-2.5 flex flex-col justify-between">
            <span class="font-label-sm text-[11px] text-on-surface-variant font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
              Total Belanja
            </span>
            <div class="mt-1.5">
              <span id="kpi-total-belanja" class="font-headline-sm text-sm font-bold text-primary block font-tabular">
                ${formatRupiah(totalBelanja)}
              </span>
              <span id="kpi-count-belanja" class="font-body-sm text-[10px] text-on-surface-variant mt-0.5 block">${supplies.length} Transaksi Belanja</span>
            </div>
          </div>

          <div class="glass-card glass-sheen rounded-lg p-2.5 flex flex-col justify-between border-t-2 border-emerald-500">
            <span class="font-label-sm text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-emerald-400">inventory_2</span>
              Sisa Stok Real-Time
            </span>
            <div class="mt-1.5">
              <span id="kpi-total-items" class="font-headline-sm text-sm font-bold text-white block font-tabular">
                ${totalSisa} Pasang
              </span>
              <span class="font-body-sm text-[10px] text-emerald-400/90 mt-0.5 block">Belum Terjual (${totalItems} Masuk)</span>
            </div>
          </div>
        </section>

        <!-- Action Buttons: Belanja Baru, Laporan Sisa Stock, Stock Opname -->
        <div class="grid grid-cols-2 gap-2">
          ${isAdmin ? `<button 
            type="button" 
            id="btn-goto-tambah-pasok"
            class="glass-primary glass-btn glass-sheen h-10 text-primary-btn rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] sm:text-xs active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[16px]">add_box</span>
            <span class="font-bold">+ Belanja Baru</span>
          </button>` : `<div class="h-10 rounded-lg glass-panel flex items-center justify-center gap-1 font-label-md text-[10px] text-on-surface-variant">
            <span class="material-symbols-outlined text-[13px]">visibility</span>
            <span>Mode Lihat Saja</span>
          </div>`}
          <button 
            type="button" 
            id="btn-goto-laporan-stock"
            class="glass-card glass-sheen h-10 border border-emerald-500/50 hover:border-emerald-500 rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] sm:text-xs text-emerald-300 active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[16px] text-emerald-400">analytics</span>
            <span class="font-bold">Laporan Sisa Stok</span>
          </button>
        </div>

        ${isAdmin ? `<div class="grid grid-cols-2 gap-2">
          <button 
            type="button" 
            id="btn-goto-stock-opname"
            class="glass-card glass-sheen h-9 border border-neutral-700/60 hover:border-neutral-500 rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] text-neutral-300 active:scale-[0.99]"
          >
            <span class="material-symbols-outlined text-[15px] text-emerald-400">fact_check</span>
            <span>Stock Opname</span>
          </button>
          <button 
            type="button" 
            id="btn-pull-sheets-supplies"
            class="glass-card glass-sheen h-9 border border-emerald-500/40 hover:border-emerald-400 rounded-lg flex items-center justify-center gap-1 font-label-md text-[11px] text-emerald-300 active:scale-[0.99]"
            title="Tarik data belanja/sepatu baru dari Google Spreadsheet"
          >
            <span class="material-symbols-outlined text-[16px] text-emerald-400" id="icon-pull-sheets">cloud_download</span>
            <span class="font-bold" id="label-pull-sheets">Tarik Spreadsheet</span>
          </button>
        </div>` : ''}

        <!-- Search Bar -->
        <div class="relative w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">search</span>
          </div>
          <input 
            type="text" 
            id="pasok-search-input"
            placeholder="Cari barcode, nama sepatu, suplier..." 
            class="glass-input w-full pl-9 pr-3 py-2 text-on-surface font-body-md text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
          />
        </div>

        <!-- Filter Segmented Tabs -->
        <div class="glass-track p-1 rounded-lg flex items-center gap-1">
          <button type="button" data-filter="all" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'all' ? 'glass-seg-active text-on-surface font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Semua
          </button>
          <button type="button" data-filter="lunas" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'lunas' ? 'glass-seg-active text-emerald-800 font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Lunas
          </button>
          <button type="button" data-filter="pre-paid" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'pre-paid' ? 'glass-seg-active text-blue-700 font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Pre-Paid
          </button>
          <button type="button" data-filter="tempo" class="pasok-filter-btn flex-1 py-1 px-1.5 rounded-md ${filterStatus === 'tempo' ? 'glass-seg-active text-amber-800 font-bold' : 'text-on-surface-variant'} font-label-md text-[11px] transition-all text-center">
            Tempo / Bon
          </button>
        </div>

        <!-- Invoices/Belanja List Container -->
        <div id="pasok-list-container" class="flex flex-col gap-2">
          <!-- Dynamically populated -->
        </div>
      </div>

      <!-- Modal Konfirmasi Tarik dari Spreadsheet -->
      <div id="modal-pull-sheets" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 hidden">
        <div class="glass-card border border-emerald-500/40 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
          <!-- Header -->
          <div class="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface/90">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-emerald-400 text-2xl">cloud_download</span>
              <div>
                <h3 class="font-bold text-sm text-on-surface">Validasi & Tarik Barang Masuk</h3>
                <p class="text-[10px] text-on-surface-variant">Data baru terdeteksi dari Google Spreadsheet</p>
              </div>
            </div>
            <button type="button" id="btn-close-modal-pull" class="text-on-surface-variant hover:text-white p-1 rounded-lg">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Ringkasan Statistik -->
          <div class="p-3 bg-emerald-950/30 border-b border-emerald-500/20 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="bg-surface/50 p-1.5 rounded-lg border border-emerald-500/20">
              <div class="text-[10px] text-on-surface-variant">Total Item</div>
              <div id="pull-summary-count" class="font-bold text-emerald-300 font-tabular text-sm">0 Psg</div>
            </div>
            <div class="bg-surface/50 p-1.5 rounded-lg border border-emerald-500/20">
              <div class="text-[10px] text-on-surface-variant">Total Nilai Modal</div>
              <div id="pull-summary-amount" class="font-bold text-primary font-tabular text-sm">Rp 0</div>
            </div>
            <div class="bg-surface/50 p-1.5 rounded-lg border border-emerald-500/20">
              <div class="text-[10px] text-on-surface-variant">Faktur/Nota</div>
              <div id="pull-summary-invoices" class="font-bold text-white font-tabular text-sm">0 Faktur</div>
            </div>
          </div>

          <!-- Info Catatan Keuangan -->
          <div class="px-3.5 py-2 bg-blue-950/30 border-b border-blue-500/20 text-[11px] text-blue-200 flex items-start gap-1.5">
            <span class="material-symbols-outlined text-[15px] shrink-0 text-blue-400 mt-0.5">verified_user</span>
            <span>Status otomatis diatur <b>Pre-Paid</b> (Stok bertambah ke katalog tanpa memotong saldo kas toko lagi).</span>
          </div>

          <!-- Body / List Preview (Scrollable) -->
          <div id="pull-items-preview-list" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 max-h-[50vh]">
            <!-- Item list dynamically generated -->
          </div>

          <!-- Footer Actions -->
          <div class="p-3 border-t border-white/10 flex items-center justify-end gap-2 bg-surface/90">
            <button type="button" id="btn-cancel-pull" class="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800 transition">
              Batal
            </button>
            <button type="button" id="btn-confirm-pull" class="glass-primary glass-btn px-4 py-1.5 rounded-lg text-primary-btn text-xs font-bold flex items-center gap-1 active:scale-95 transition">
              <span class="material-symbols-outlined text-sm">check_circle</span>
              <span>Konfirmasi & Simpan ke Stok</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function initBarangMasukListPage(router, store, initialFilter = 'all', isAdmin = true) {
  bindHeaderEvents(router);

  let currentFilter = initialFilter;
  let searchQuery = '';
  // Nota yang sedang dibuka rinciannya (agar tetap terbuka saat pencarian/filter berubah)
  const expandedSupplies = new Set();

  const addBtn = document.getElementById('btn-goto-tambah-pasok');
  if (addBtn) {
    addBtn.addEventListener('click', () => router.navigate('tambah-pasok'));
  }

  const laporanStockBtn = document.getElementById('btn-goto-laporan-stock');
  if (laporanStockBtn) {
    laporanStockBtn.addEventListener('click', () => router.navigate('laporan-stock'));
  }

  const opnameBtn = document.getElementById('btn-goto-stock-opname');
  if (opnameBtn) {
    opnameBtn.addEventListener('click', () => router.navigate('stock-opname'));
  }

  const searchInput = document.getElementById('pasok-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderItems();
    });
  }

  document.querySelectorAll('.pasok-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = btn.getAttribute('data-filter');
      document.querySelectorAll('.pasok-filter-btn').forEach((b) => {
        b.className = 'pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant font-label-md text-xs transition-all text-center';
      });
      btn.className = 'pasok-filter-btn flex-1 py-1.5 px-2 rounded-lg glass-seg-active text-on-surface font-bold font-label-md text-xs transition-all text-center';
      renderItems();
    });
  });

  function updateKpi() {
    const supplies = store.getSupplies();
    const stockReport = store.getRealtimeStockReport ? store.getRealtimeStockReport() : { summary: { totalSisaPasang: 0 } };
    const totalBelanja = supplies.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);
    const totalSisa = stockReport.summary.totalSisaPasang;

    const elTotal = document.getElementById('kpi-total-belanja');
    const elCount = document.getElementById('kpi-count-belanja');
    const elItems = document.getElementById('kpi-total-items');

    if (elTotal) elTotal.textContent = formatRupiah(totalBelanja);
    if (elCount) elCount.textContent = `${supplies.length} Transaksi Belanja`;
    if (elItems) elItems.textContent = `${totalSisa} Pasang`;
  }

  function renderItems() {
    const container = document.getElementById('pasok-list-container');
    if (!container) return;

    let list = store.getSupplies();

    if (currentFilter !== 'all') {
      list = list.filter((s) => s.status === currentFilter);
    }

    if (searchQuery) {
      list = list.filter((s) => {
        return (
          s.invoiceNo.toLowerCase().includes(searchQuery) ||
          s.supplierName.toLowerCase().includes(searchQuery) ||
          (s.items && s.items.some((item) => 
            item.name.toLowerCase().includes(searchQuery) || 
            (item.barcode && item.barcode.toLowerCase().includes(searchQuery))
          ))
        );
      });
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center glass-card glass-sheen rounded-2xl text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">inventory_2</span>
          <p class="font-title-ledger text-sm font-semibold">Tidak ada data belanja / stock</p>
          <p class="font-body-sm text-xs mt-1">Coba ubah kata kunci atau catat belanja baru.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map((supply) => {
      const isLunas = supply.status === 'lunas';
      const isPrePaid = supply.status === 'pre-paid';
      const isOpen = expandedSupplies.has(supply.id);
      return `
        <div class="glass-card glass-sheen rounded-xl p-2.5 flex flex-col gap-1.5">
          <!-- Top Row: ID Belanja & Status Badge -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <span class="material-symbols-outlined text-primary text-[16px]">shopping_bag</span>
              <span class="font-title-ledger text-xs font-bold text-on-surface">${supply.invoiceNo}</span>
            </div>
            <span class="font-label-sm text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider glass-chip ${isLunas ? 'text-emerald-800' : isPrePaid ? 'text-blue-700' : 'text-amber-800'}">
              ${isLunas ? 'Lunas' : isPrePaid ? '💳 Pre-Paid' : 'Tempo / Bon'}
            </span>
          </div>

          <!-- Supplier & Date -->
          <div class="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span class="font-semibold text-on-surface truncate">${supply.supplierName}</span>
            <span class="shrink-0 ml-2">${supply.date}</span>
          </div>

          <!-- Breakdown Toggle: klik untuk buka/tutup rincian barang nota ini -->
          <button
            type="button"
            class="pasok-breakdown-btn w-full flex items-center justify-between gap-1.5 text-[10px] pt-1.5 border-t border-white/45 active:scale-[0.99] transition-all"
            data-target="detail-${supply.id}"
            data-supply-id="${supply.id}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="detail-${supply.id}"
          >
            <span class="flex items-center gap-1 min-w-0">
              <span class="material-symbols-outlined text-[14px] text-primary">receipt_long</span>
              <span class="font-bold text-primary">Breakdown</span>
              <span class="text-on-surface-variant truncate">• ${supply.itemsCount || 1} Pasang • ${supply.paymentMethod || 'Tunai'}</span>
            </span>
            <span class="flex items-center gap-1 shrink-0">
              <span class="text-on-surface-variant">Total:</span>
              <span class="font-currency-item text-xs font-bold text-primary font-tabular">${formatRupiah(supply.totalAmount)}</span>
              <span class="pasok-breakdown-chevron material-symbols-outlined text-[14px] text-on-surface-variant">${isOpen ? 'expand_less' : 'expand_more'}</span>
            </span>
          </button>

          <!-- Rincian Barang (tersembunyi sampai tombol Breakdown diklik) -->
          ${supply.items && supply.items.length > 0 ? `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} glass-panel rounded-xl p-2 flex flex-col gap-1.5 text-[11px]">
              ${supply.items.map((it) => `
                <div class="flex items-start gap-2">
                  ${it.photo ? `
                    <img src="${it.photo}" alt="Foto Sepatu" class="w-8 h-8 rounded-md object-cover border border-white/70 shrink-0" />
                  ` : ''}
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                      <span class="font-semibold text-on-surface truncate text-[11px]">${it.qty}x ${it.name}</span>
                      <span class="font-bold font-tabular text-primary ml-2 text-[11px] shrink-0">${formatRupiah(it.buyPrice * it.qty)}</span>
                    </div>

                    <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                      ${it.barcode ? `
                        <span class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded glass-chip text-on-surface text-[9px] font-mono font-bold">
                          <span class="material-symbols-outlined text-[10px] text-primary">qr_code</span>
                          <span>${it.barcode}</span>
                        </span>
                      ` : ''}

                      ${it.kondisi ? `
                        <span class="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold glass-chip ${it.kondisi === 'Minus' ? 'text-amber-900' : 'text-emerald-900'}">
                          ${it.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
                        </span>
                      ` : ''}
                    </div>

                    ${it.catatanMinus ? `
                      <span class="text-[9px] text-amber-800 italic mt-0.5 block truncate">
                        Catatan: ${it.catatanMinus}
                      </span>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div id="detail-${supply.id}" class="pasok-detail ${isOpen ? '' : 'hidden'} text-[11px] text-on-surface-variant italic px-1 pt-1">Tidak ada rincian barang pada nota ini.</div>
          `}

          <!-- Action Buttons: + Tambah Barang, Edit & Hapus (Admin Only) -->
          ${isAdmin ? `
          <div class="flex items-center justify-end gap-1 pt-1 border-t border-white/45 flex-wrap">
              <button 
                type="button" 
                data-action="add-item-supply" 
                data-id="${supply.id}" 
                class="glass-primary glass-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-primary-btn text-[10px] font-semibold"
                title="Tambah barang belanja ke suplier ini"
              >
                <span class="material-symbols-outlined text-[12px]">add_circle</span>
                <span>+ Barang</span>
              </button>
              <button 
                type="button" 
                data-action="edit-supply" 
                data-id="${supply.id}" 
                class="glass-chip-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-primary text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">edit</span>
                <span>Edit</span>
              </button>
              <button 
                type="button" 
                data-action="delete-supply" 
                data-id="${supply.id}" 
                data-no="${supply.invoiceNo}" 
                class="glass-rose glass-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-rose-800 text-[10px] font-semibold"
              >
                <span class="material-symbols-outlined text-[12px]">delete</span>
                <span>Hapus</span>
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Bind Add Item to Supply buttons
    container.querySelectorAll('[data-action="add-item-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        router.navigate('tambah-pasok', { appendSupplyId: id });
      });
    });

    // Bind Edit Supply buttons
    container.querySelectorAll('[data-action="edit-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        router.navigate('tambah-pasok', { editId: id });
      });
    });

    // Bind Delete Supply buttons
    container.querySelectorAll('[data-action="delete-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const invoiceNo = btn.getAttribute('data-no');
        if (confirm(`Hapus data belanja/stock ${invoiceNo}?\nData item dan riwayat belanja ini akan dihapus.`)) {
          store.deleteSupply(id);
          showToast(`Data belanja ${invoiceNo} berhasil dihapus!`, 'info');
          updateKpi();
          renderItems();
        }
      });
    });

    // Bind Breakdown toggle: buka/tutup rincian barang per nota belanja
    container.querySelectorAll('.pasok-breakdown-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const detail = targetId ? document.getElementById(targetId) : null;
        if (!detail) return;

        const nowHidden = detail.classList.toggle('hidden');
        btn.setAttribute('aria-expanded', nowHidden ? 'false' : 'true');

        const chevron = btn.querySelector('.pasok-breakdown-chevron');
        if (chevron) chevron.textContent = nowHidden ? 'expand_more' : 'expand_less';

        const supplyId = btn.getAttribute('data-supply-id');
        if (supplyId) {
          if (nowHidden) expandedSupplies.delete(supplyId);
          else expandedSupplies.add(supplyId);
        }
      });
    });
  }


  // ── Tarik Data Barang Masuk dari Google Spreadsheet ──
  const btnPullSheets = document.getElementById('btn-pull-sheets-supplies');
  const modalPull = document.getElementById('modal-pull-sheets');
  const btnCloseModal = document.getElementById('btn-close-modal-pull');
  const btnCancelPull = document.getElementById('btn-cancel-pull');
  const btnConfirmPull = document.getElementById('btn-confirm-pull');
  const previewContainer = document.getElementById('pull-items-preview-list');
  const summaryCount = document.getElementById('pull-summary-count');
  const summaryAmount = document.getElementById('pull-summary-amount');
  const summaryInvoices = document.getElementById('pull-summary-invoices');

  let pendingImportItems = [];

  function closeModal() {
    if (modalPull) modalPull.classList.add('hidden');
    pendingImportItems = [];
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelPull) btnCancelPull.addEventListener('click', closeModal);

  if (btnPullSheets) {
    btnPullSheets.addEventListener('click', async () => {
      const icon = document.getElementById('icon-pull-sheets');
      const label = document.getElementById('label-pull-sheets');
      
      try {
        btnPullSheets.disabled = true;
        if (icon) {
          icon.textContent = 'sync';
          icon.classList.add('animate-spin');
        }
        if (label) label.textContent = 'Membaca Sheet...';

        const result = await fetchNewSuppliesFromGoogleSheets(store);
        const { newItems, groupedByInvoice, totalCount, totalAmount } = result;

        if (!newItems || newItems.length === 0) {
          showToast('Tidak ada data barang masuk baru di Google Sheets. Semua data sudah tersinkron!', 'info');
          return;
        }

        // Simpan data pending untuk di-commit saat user klik konfirmasi
        pendingImportItems = newItems;

        // Render data ke modal preview
        if (summaryCount) summaryCount.textContent = `${totalCount} Psg`;
        if (summaryAmount) summaryAmount.textContent = formatRupiah(totalAmount);
        if (summaryInvoices) summaryInvoices.textContent = `${Object.keys(groupedByInvoice).length} Faktur`;

        if (previewContainer) {
          previewContainer.innerHTML = Object.values(groupedByInvoice).map((grp) => {
            const invoiceItems = grp.items || [];
            const subtotal = invoiceItems.reduce((s, it) => s + it.totalAmount, 0);
            return `
              <div class="glass-panel rounded-xl p-2.5 border border-white/10 flex flex-col gap-2">
                <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px] text-primary">receipt_long</span>
                    <span class="font-bold text-xs text-on-surface">${grp.invoiceNo}</span>
                    <span class="text-[10px] text-on-surface-variant font-medium">(${grp.supplierName || 'Supplier'})</span>
                  </div>
                  <div class="text-[10px] text-right">
                    <span class="text-on-surface-variant">${grp.date} • </span>
                    <span class="font-bold text-primary">${formatRupiah(subtotal)}</span>
                  </div>
                </div>

                <div class="flex flex-col gap-1.5">
                  ${invoiceItems.map((it) => `
                    <div class="flex items-center justify-between bg-surface/40 p-1.5 rounded-lg text-[11px]">
                      <div class="flex-1 min-w-0 pr-2">
                        <div class="font-semibold text-on-surface truncate">${it.name}</div>
                        <div class="flex items-center gap-1 mt-0.5 flex-wrap">
                          <span class="inline-flex items-center gap-0.5 px-1 py-0.2 rounded glass-chip text-on-surface text-[9px] font-mono font-bold">
                            <span class="material-symbols-outlined text-[9px] text-primary">qr_code</span>
                            ${it.barcode}
                          </span>
                          ${it.isAutoBarcode ? `
                            <span class="inline-flex items-center px-1 py-0.2 rounded text-[8.5px] font-bold bg-amber-950/60 border border-amber-500/30 text-amber-300">
                              Auto-Barcode
                            </span>
                          ` : ''}
                          <span class="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold glass-chip ${it.kondisi === 'Minus' ? 'text-amber-400' : 'text-emerald-400'}">
                            ${it.kondisi === 'Minus' ? '⚠ Minus' : '✓ Bagus'}
                          </span>
                          <span class="text-[9px] text-neutral-400">Baris #${it.rowNumber}</span>
                        </div>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="font-bold font-tabular text-primary text-[11px]">${it.qty}x ${formatRupiah(it.buyPrice)}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('');
        }

        if (modalPull) modalPull.classList.remove('hidden');

      } catch (err) {
        alert(`Gagal membaca data dari Google Sheets:\n\n${err.message}`);
        showToast('Gagal menarik data dari Google Sheets.', 'error');
      } finally {
        btnPullSheets.disabled = false;
        if (icon) {
          icon.textContent = 'cloud_download';
          icon.classList.remove('animate-spin');
        }
        if (label) label.textContent = 'Tarik Spreadsheet';
      }
    });
  }

  if (btnConfirmPull) {
    btnConfirmPull.addEventListener('click', () => {
      if (!pendingImportItems || pendingImportItems.length === 0) {
        closeModal();
        return;
      }

      try {
        btnConfirmPull.disabled = true;
        btnConfirmPull.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Menyimpan...';

        const res = commitImportedSupplies(store, pendingImportItems);
        closeModal();

        showToast(`Berhasil menambahkan ${res.importedItems} sepatu baru dari Spreadsheet!`, 'success');

        updateKpi();
        renderItems();
      } catch (err) {
        alert(`Gagal menyimpan data import:\n\n${err.message}`);
        showToast('Gagal menyimpan barang masuk.', 'error');
      } finally {
        btnConfirmPull.disabled = false;
        btnConfirmPull.innerHTML = '<span class="material-symbols-outlined text-sm">check_circle</span> <span>Konfirmasi & Simpan ke Stok</span>';
      }
    });
  }

  renderItems();
}

