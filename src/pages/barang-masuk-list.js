import { formatRupiah } from '../store/store.js';
import { renderHeader, bindHeaderEvents } from '../components/header.js';
import { showToast } from '../components/toast.js';
import { fetchNewSuppliesFromGoogleSheets, commitImportedSupplies, clearInputSheet } from '../services/googleSheets.js';
import { Html5Qrcode } from 'html5-qrcode';
import {
  buildScannerConfig1D,
  enhanceVideoElement,
  checkCameraSupport,
  describeCameraError,
  playBeep
} from '../utils/barcode-scanner-config.js';

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

        <!-- Search Bar with Scanner Camera Button -->
        <div class="relative w-full flex items-center">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <span class="material-symbols-outlined text-[18px]">search</span>
          </div>
          <input 
            type="text" 
            id="pasok-search-input"
            placeholder="Cari barcode, nama sepatu, suplier..." 
            class="glass-input w-full pl-9 pr-11 py-2 text-on-surface font-body-md text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-on-tertiary-container transition-all"
          />
          <button
            type="button"
            id="btn-scan-pasok-search"
            class="absolute right-1 w-8 h-8 rounded-md flex items-center justify-center text-primary hover:text-emerald-300 hover:bg-white/10 active:scale-95 transition-all"
            title="Scan Barcode Sepatu dengan Kamera"
          >
            <span class="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          </button>
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


      
      <!-- Modal Gabungkan Kontainer / Faktur Belanja -->
      <div id="modal-merge-supply" class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 hidden">
        <div class="glass-card border border-blue-500/40 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-scale-up">
          <div class="p-3.5 border-b border-white/10 flex items-center justify-between bg-surface/90">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-blue-400 text-xl">call_merge</span>
              <h3 class="font-bold text-sm text-on-surface">Gabungkan Kontainer Belanja</h3>
            </div>
            <button type="button" id="btn-close-modal-merge" class="text-on-surface-variant hover:text-white p-1 rounded-lg">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <div class="p-4 flex flex-col gap-3 text-xs">
            <p class="text-on-surface-variant leading-relaxed">
              Pindahkan semua sepatu dari nota <b id="merge-source-no" class="text-white">-</b> ke dalam kontainer nota tujuan di bawah ini:
            </p>

            <div class="flex flex-col gap-1">
              <label for="merge-target-select" class="font-semibold text-on-surface text-[11px]">Pilih Nota Tujuan:</label>
              <select id="merge-target-select" class="glass-input w-full px-2.5 py-2 text-xs rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-blue-400">
                <!-- Injected dynamically -->
              </select>
            </div>

            <div class="p-2 rounded-lg bg-blue-950/30 border border-blue-500/20 text-[10.5px] text-blue-300 flex items-start gap-1.5">
              <span class="material-symbols-outlined text-[14px] shrink-0 text-blue-400 mt-0.5">info</span>
              <span>Seluruh item sepatu akan disatukan dan kontainer asal akan dihapus tanpa mengurangi stok.</span>
            </div>
          </div>

          <div class="p-3 border-t border-white/10 flex items-center justify-end gap-2 bg-surface/90">
            <button type="button" id="btn-cancel-merge" class="px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300 hover:bg-neutral-800 transition">
              Batal
            </button>
            <button type="button" id="btn-confirm-merge" class="glass-primary glass-btn px-4 py-1.5 rounded-lg text-primary-btn text-xs font-bold flex items-center gap-1 active:scale-95 transition">
              <span class="material-symbols-outlined text-sm">check</span>
              <span>Gabungkan Sekarang</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Scanner Barcode Kamera untuk Pencarian Stok -->
      <div id="modal-pasok-scanner" class="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 p-4 hidden">
        <!-- Top bar: Tutup & Judul -->
        <div class="w-full flex items-center justify-between text-white pt-2">
          <button 
            type="button" 
            id="btn-close-pasok-scanner" 
            class="w-10 h-10 rounded-full glass-btn flex items-center justify-center text-white"
          >
            <span class="material-symbols-outlined text-[24px]">close</span>
          </button>
          <h3 class="font-headline-sm text-base font-bold">Scan Barcode Sepatu</h3>
          <div class="w-10"></div>
        </div>

        <div class="flex-1 w-full max-w-[400px] flex flex-col items-center justify-center gap-4 py-4">
          <div class="w-full flex flex-col gap-3">
            <!-- Container Camera Preview -->
            <div class="relative isolate w-full h-56 sm:h-64 rounded-3xl overflow-hidden border-3 border-emerald-400 shadow-2xl bg-black" style="box-shadow: 0 0 30px rgba(52, 211, 153, 0.3);">
              <div id="pasok-qr-reader" class="w-full h-full"></div>
              
              <!-- Overlay: Sudut bidik + Garis panduan -->
              <svg class="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cornerGradPasok" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:rgba(52,211,153,0.9);stop-opacity:1" />
                    <stop offset="100%" style="stop-color:rgba(52,211,153,0.4);stop-opacity:1" />
                  </linearGradient>
                </defs>
                <path d="M 20,20 L 20,30 M 20,20 L 30,20" stroke="url(#cornerGradPasok)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                <path d="M 80,20 L 80,30 M 80,20 L 70,20" stroke="url(#cornerGradPasok)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                <path d="M 20,80 L 20,70 M 20,80 L 30,80" stroke="url(#cornerGradPasok)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                <path d="M 80,80 L 80,70 M 80,80 L 70,80" stroke="url(#cornerGradPasok)" stroke-width="1.2" fill="none" stroke-linecap="round"/>
                <line x1="25" y1="50" x2="75" y2="50" stroke="rgba(52,211,153,0.5)" stroke-width="0.8" stroke-dasharray="2,2">
                  <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite"/>
                </line>
              </svg>
            </div>

            <!-- Status message -->
            <div id="pasok-scanner-status" class="glass-sheet rounded-2xl p-3 flex items-start gap-2.5 text-white">
              <span class="material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5">info</span>
              <span id="pasok-scanner-status-text" class="text-sm leading-snug">Arahkan kamera ke barcode label sepatu</span>
            </div>

            <!-- Last scanned (hidden initially) -->
            <div id="pasok-scanner-last-read" class="hidden glass-emerald rounded-2xl p-3 flex items-center gap-2.5">
              <span class="material-symbols-outlined text-emerald-800 text-[20px] shrink-0">check_circle</span>
              <div class="flex-1 min-w-0">
                <span class="text-[10px] font-semibold text-emerald-800 uppercase tracking-wide block">Terdeteksi</span>
                <span id="pasok-scanner-last-code" class="text-base font-bold text-emerald-950 font-mono tracking-wider block truncate">-</span>
              </div>
            </div>

            <!-- Tombol Coba Lagi jika kamera gagal -->
            <button
              type="button"
              id="btn-pasok-scanner-retry"
              class="hidden w-full py-2.5 px-4 rounded-xl glass-rose glass-btn font-label-md text-xs font-bold text-rose-800 flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-[18px]">replay</span>
              <span>Coba Buka Kamera Lagi</span>
            </button>
          </div>

          <!-- Controls: Senter, Zoom, Switch Camera -->
          <div class="w-full flex items-center justify-center gap-3">
            <button
              type="button"
              id="btn-pasok-scanner-torch"
              class="w-12 h-12 rounded-full glass-sheet glass-btn flex items-center justify-center text-white active:scale-95"
              title="Senter"
            >
              <span class="material-symbols-outlined text-[22px]">flashlight_off</span>
            </button>
            <button
              type="button"
              id="btn-pasok-scanner-zoom"
              class="w-12 h-12 rounded-full glass-sheet glass-btn flex items-center justify-center text-white active:scale-95 text-xs font-bold"
              title="Perbesar"
            >
              <span id="pasok-scanner-zoom-label">1x</span>
            </button>
            <button
              type="button"
              id="btn-pasok-scanner-switch"
              class="w-12 h-12 rounded-full glass-sheet glass-btn flex items-center justify-center text-white active:scale-95"
              title="Ganti Kamera"
            >
              <span class="material-symbols-outlined text-[22px]">cameraswitch</span>
            </button>
          </div>
        </div>

        <!-- Bawah: Batal -->
        <div class="w-full max-w-[400px] pb-4">
          <button
            type="button"
            id="btn-cancel-pasok-scanner"
            class="w-full py-3 rounded-2xl glass-card text-on-surface font-label-lg text-sm font-semibold active:scale-[0.98]"
          >
            Tutup Scanner
          </button>
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
                <p id="pull-source-subtitle" class="text-[10px] text-on-surface-variant">Data baru dari Google Spreadsheet</p>
              </div>
            </div>
            <button type="button" id="btn-close-modal-pull" class="text-on-surface-variant hover:text-white p-1 rounded-lg">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Ringkasan Statistik -->
          <!-- Pilihan Kontainer / Faktur Tujuan -->
          <div class="px-3.5 py-2.5 bg-surface/80 border-b border-white/10 flex flex-col gap-1 text-xs">
            <label for="pull-target-invoice-select" class="text-[11px] font-semibold text-on-surface flex items-center justify-between">
              <span class="flex items-center gap-1">
                <span class="material-symbols-outlined text-primary text-[15px]">inventory_2</span>
                <span>Satukan ke Kontainer / Faktur:</span>
              </span>
              <span class="text-[10px] text-on-surface-variant font-normal">Pilih faktur tujuan jika ingin disatukan</span>
            </label>
            <select 
              id="pull-target-invoice-select" 
              class="glass-input w-full px-2.5 py-1.5 text-xs rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">(Otomatis) Sesuai Faktur Spreadsheet</option>
            </select>
          </div>

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
            <span>Status otomatis diatur <b>Pre-Paid</b> (Stok bertambah ke katalog tanpa memotong saldo kas toko lagi). Setelah konfirmasi, tab <b>Input Barang Baru</b> dibersihkan otomatis.</span>
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

  // ── Scanner Barcode Kamera untuk Pencarian Stok ──
  const btnScanSearch = document.getElementById('btn-scan-pasok-search');
  const pasokScannerModal = document.getElementById('modal-pasok-scanner');
  const btnClosePasokScanner = document.getElementById('btn-close-pasok-scanner');
  const btnCancelPasokScanner = document.getElementById('btn-cancel-pasok-scanner');
  const btnPasokScannerTorch = document.getElementById('btn-pasok-scanner-torch');
  const btnPasokScannerZoom = document.getElementById('btn-pasok-scanner-zoom');
  const btnPasokScannerSwitch = document.getElementById('btn-pasok-scanner-switch');
  const btnPasokScannerRetry = document.getElementById('btn-pasok-scanner-retry');

  let pasokHtml5Scanner = null;
  let pasokScannerStarted = false;
  let pasokTorchOn = false;
  let pasokScannerZoom = 1;
  let pasokUseFrontCamera = false;
  let isProcessingPasokScan = false;

  function setPasokScannerStatus(message, type = 'info') {
    const statusEl = document.getElementById('pasok-scanner-status');
    const textEl = document.getElementById('pasok-scanner-status-text');
    if (!statusEl || !textEl) return;

    statusEl.className = 'glass-sheet rounded-2xl p-3 flex items-start gap-2.5 text-white';
    const iconEl = statusEl.querySelector('.material-symbols-outlined');
    
    if (type === 'error') {
      statusEl.classList.add('!bg-rose-500/20', 'border', 'border-rose-500/50');
      if (iconEl) {
        iconEl.textContent = 'error';
        iconEl.className = 'material-symbols-outlined text-rose-400 text-[20px] shrink-0 mt-0.5';
      }
    } else if (type === 'success') {
      statusEl.classList.add('!bg-emerald-500/20', 'border', 'border-emerald-500/50');
      if (iconEl) {
        iconEl.textContent = 'check_circle';
        iconEl.className = 'material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5';
      }
    } else {
      if (iconEl) {
        iconEl.textContent = 'info';
        iconEl.className = 'material-symbols-outlined text-emerald-400 text-[20px] shrink-0 mt-0.5';
      }
    }
    
    textEl.textContent = message;
  }

  function showPasokScannerRetryButton(show) {
    if (btnPasokScannerRetry) btnPasokScannerRetry.classList.toggle('hidden', !show);
  }

  async function applyPasokTorch(on) {
    try {
      const video = document.querySelector('#pasok-qr-reader video');
      if (!video || !video.srcObject) return;
      const track = video.srcObject.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        await track.applyConstraints({ advanced: [{ torch: on }] });
        pasokTorchOn = on;
        if (btnPasokScannerTorch) {
          const icon = btnPasokScannerTorch.querySelector('.material-symbols-outlined');
          if (icon) icon.textContent = on ? 'flashlight_on' : 'flashlight_off';
        }
      }
    } catch (err) {
      console.warn('[pasok-scanner] torch error:', err);
    }
  }

  function cyclePasokZoom() {
    const steps = [1, 1.5, 2, 2.5, 3];
    const idx = steps.indexOf(pasokScannerZoom);
    pasokScannerZoom = steps[(idx + 1) % steps.length];
    try {
      const video = document.querySelector('#pasok-qr-reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.zoom) {
          track.applyConstraints({ advanced: [{ zoom: pasokScannerZoom }] });
        }
      }
      const label = document.getElementById('pasok-scanner-zoom-label');
      if (label) label.textContent = `${pasokScannerZoom}x`;
    } catch (err) {
      console.warn('[pasok-scanner] zoom error:', err);
    }
  }

  function switchPasokCamera() {
    pasokUseFrontCamera = !pasokUseFrontCamera;
    closePasokScanner();
    setTimeout(() => openPasokScanner(), 100);
  }

  function openPasokScanner() {
    if (!pasokScannerModal) return;
    pasokScannerModal.classList.remove('hidden');
    isProcessingPasokScan = false;
    setPasokScannerStatus('Arahkan kamera ke barcode label sepatu', 'info');
    showPasokScannerRetryButton(false);

    let lastScanTime = 0;
    const cooldown = 1500;

    const onSuccess = (decodedText) => {
      if (isProcessingPasokScan) return;
      const now = Date.now();
      if (now - lastScanTime < cooldown) return;
      lastScanTime = now;

      isProcessingPasokScan = true;
      playBeep('success');

      const lastReadEl = document.getElementById('pasok-scanner-last-read');
      const lastCodeEl = document.getElementById('pasok-scanner-last-code');
      if (lastReadEl && lastCodeEl) {
        lastCodeEl.textContent = decodedText;
        lastReadEl.classList.remove('hidden');
      }

      setPasokScannerStatus(`Barcode terdeteksi: ${decodedText}`, 'success');

      // Masukkan hasil barcode ke search input
      if (searchInput) {
        searchInput.value = decodedText;
        searchQuery = decodedText.toLowerCase().trim();
        
        // Buka otomatis rincian nota belanja yang memiliki barcode ini
        const allSupplies = store.getSupplies();
        allSupplies.forEach((s) => {
          if (s.items && s.items.some((it) => (it.barcode && it.barcode.toLowerCase().includes(searchQuery)) || (it.name && it.name.toLowerCase().includes(searchQuery)))) {
            expandedSupplies.add(s.id);
          }
        });

        renderItems();
      }

      setTimeout(() => {
        closePasokScanner();
        showToast(`Mencari barcode: ${decodedText}`, 'success');
      }, 400);
    };

    const onError = () => {
      // Normal saat scanning
    };

    const afterStart = () => {
      pasokScannerStarted = true;
      enhanceVideoElement('pasok-qr-reader');
      applyPasokTorch(false);
      setPasokScannerStatus('Arahkan kamera ke barcode label sepatu', 'info');
      showPasokScannerRetryButton(false);
    };

    const tryStart = async (cameraConstraint, config, label) => {
      if (pasokHtml5Scanner) {
        try { await pasokHtml5Scanner.stop(); } catch (_) {}
        try { pasokHtml5Scanner.clear(); } catch (_) {}
      }
      const scanner = new Html5Qrcode('pasok-qr-reader', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true }
      });
      pasokHtml5Scanner = scanner;
      return scanner.start(cameraConstraint, config, onSuccess, onError)
        .then(() => { afterStart(); })
        .catch(async (err) => {
          console.warn(`[pasok-scanner] gagal start (${label}):`, err);
          try { await scanner.stop(); } catch (_) {}
          try { scanner.clear(); } catch (_) {}
          throw err;
        });
    };

    const baseConfig = buildScannerConfig1D();
    const facing = pasokUseFrontCamera ? 'user' : 'environment';

    tryStart({ facingMode: { ideal: facing } }, baseConfig, 'facingMode ideal')
      .catch(() => tryStart({ facingMode: facing }, { ...baseConfig, fps: 15 }, 'facingMode exact'))
      .catch(() => tryStart({ facingMode: 'environment' }, { ...baseConfig, fps: 10 }, 'environment fallback'))
      .catch(() => tryStart({ facingMode: 'user' }, { ...baseConfig, fps: 10 }, 'user fallback'))
      .catch((err) => {
        console.error('[pasok-scanner] kamera tidak dapat dibuka:', err);
        setPasokScannerStatus(describeCameraError(err), 'error');
        showPasokScannerRetryButton(true);
      });
  }

  function closePasokScanner() {
    isProcessingPasokScan = true;
    if (!pasokScannerModal) return;
    pasokScannerModal.classList.add('hidden');
    applyPasokTorch(false);

    try {
      const video = document.querySelector('#pasok-qr-reader video');
      if (video && video.srcObject) {
        const stream = video.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) {}
          });
        }
        video.srcObject = null;
      }
    } catch (_) {}

    const oldScanner = pasokHtml5Scanner;
    pasokHtml5Scanner = null;
    if (oldScanner) {
      try {
        const isScanning = typeof oldScanner.isScanning === 'boolean'
          ? oldScanner.isScanning
          : (oldScanner.getState && oldScanner.getState() === 2);

        if (isScanning) {
          oldScanner.stop()
            .then(() => { try { oldScanner.clear(); } catch (_) {} })
            .catch(() => { try { oldScanner.clear(); } catch (_) {} });
        } else {
          try { oldScanner.clear(); } catch (_) {}
        }
      } catch (_) {
        try { oldScanner.clear(); } catch (_) {}
      }
    }
  }

  if (btnScanSearch) btnScanSearch.addEventListener('click', openPasokScanner);
  if (btnClosePasokScanner) btnClosePasokScanner.addEventListener('click', closePasokScanner);
  if (btnCancelPasokScanner) btnCancelPasokScanner.addEventListener('click', closePasokScanner);
  if (btnPasokScannerTorch) btnPasokScannerTorch.addEventListener('click', () => applyPasokTorch(!pasokTorchOn));
  if (btnPasokScannerZoom) btnPasokScannerZoom.addEventListener('click', cyclePasokZoom);
  if (btnPasokScannerSwitch) btnPasokScannerSwitch.addEventListener('click', switchPasokCamera);
  if (btnPasokScannerRetry) btnPasokScannerRetry.addEventListener('click', () => {
    closePasokScanner();
    setTimeout(() => openPasokScanner(), 100);
  });


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
                data-action="merge-supply" 
                data-id="${supply.id}" 
                data-no="${supply.invoiceNo}" 
                class="glass-chip-btn inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-blue-400 text-[10px] font-semibold hover:text-blue-300"
                title="Gabungkan kontainer nota ini ke nota lain"
              >
                <span class="material-symbols-outlined text-[12px]">call_merge</span>
                <span>Gabung</span>
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

    // Bind Merge Supply buttons
    container.querySelectorAll('[data-action="merge-supply"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const invoiceNo = btn.getAttribute('data-no');
        currentMergeSourceId = id;
        currentMergeSourceNo = invoiceNo;

        if (mergeSourceNoEl) mergeSourceNoEl.textContent = invoiceNo;

        if (mergeTargetSelect) {
          const allSupplies = store.getSupplies();
          const otherSupplies = allSupplies.filter((s) => s.id !== id);
          if (otherSupplies.length === 0) {
            alert('Tidak ada nota lain untuk digabungkan.');
            return;
          }
          mergeTargetSelect.innerHTML = otherSupplies.map((s) => {
            return `<option value="${s.id}">${s.invoiceNo} (${s.itemsCount || 1} Psg - ${s.supplierName || 'Supplier'})`;
          }).join('');
        }

        if (modalMerge) modalMerge.classList.remove('hidden');
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

        const targetSelect = document.getElementById('pull-target-invoice-select');
        if (targetSelect) {
          const allSupplies = store.getSupplies();
          let optionsHtml = '<option value="">(Otomatis) Sesuai Faktur Spreadsheet</option>';
          allSupplies.forEach((s) => {
            optionsHtml += `<option value="${s.invoiceNo}">${s.invoiceNo} (${s.itemsCount || 1} Psg - ${s.supplierName || 'Supplier'})`;
          });
          targetSelect.innerHTML = optionsHtml;
        }

        if (modalPull) {
          const subtitle = document.getElementById('pull-source-subtitle');
          if (subtitle) {
            subtitle.innerHTML = `Data baru terdeteksi dari tab <b>${result.sourceSheet}</b>`;
          }
          modalPull.classList.remove('hidden');
        }

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
    btnConfirmPull.addEventListener('click', async () => {
      if (!pendingImportItems || pendingImportItems.length === 0) {
        closeModal();
        return;
      }

      try {
        btnConfirmPull.disabled = true;
        btnConfirmPull.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Menyimpan ke Stok...';

        const targetSelect = document.getElementById('pull-target-invoice-select');
        const targetOverride = targetSelect ? targetSelect.value : '';
        const res = commitImportedSupplies(store, pendingImportItems, targetOverride);

        // Bersihkan tab 'Input Barang Baru' jika sumbernya dari sana
        const isFromInputSheet = pendingImportItems.some((it) => it.sourceSheet === 'Input Barang Baru');
        if (isFromInputSheet) {
          btnConfirmPull.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">sync</span> Membersihkan sheet...';
          await clearInputSheet(store);
        }

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


  // ── Gabungkan Kontainer / Faktur Belanja ──
  let currentMergeSourceId = null;
  let currentMergeSourceNo = null;
  const modalMerge = document.getElementById('modal-merge-supply');
  const mergeSourceNoEl = document.getElementById('merge-source-no');
  const mergeTargetSelect = document.getElementById('merge-target-select');
  const btnCloseMerge = document.getElementById('btn-close-modal-merge');
  const btnCancelMerge = document.getElementById('btn-cancel-merge');
  const btnConfirmMerge = document.getElementById('btn-confirm-merge');

  function closeMergeModal() {
    if (modalMerge) modalMerge.classList.add('hidden');
    currentMergeSourceId = null;
    currentMergeSourceNo = null;
  }

  if (btnCloseMerge) btnCloseMerge.addEventListener('click', closeMergeModal);
  if (btnCancelMerge) btnCancelMerge.addEventListener('click', closeMergeModal);

  if (btnConfirmMerge) {
    btnConfirmMerge.addEventListener('click', () => {
      if (!currentMergeSourceId || !mergeTargetSelect) return;
      const targetId = mergeTargetSelect.value;
      if (!targetId) {
        alert('Pilih nota tujuan terlebih dahulu.');
        return;
      }

      const success = store.mergeSupplyInto(currentMergeSourceId, targetId);
      if (success) {
        const targetSupply = store.getSupplyById(targetId);
        showToast(`Berhasil menyatukan nota ke ${targetSupply ? targetSupply.invoiceNo : 'kontainer tujuan'}!`, 'success');
        closeMergeModal();
        updateKpi();
        renderItems();
      } else {
        alert('Gagal menggabungkan nota.');
      }
    });
  }

  renderItems();
}

