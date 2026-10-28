import { formatRupiah } from '../store/store.js';

/**
 * Format nominal ringkas untuk label grafik bar (misal: 450rb, 1.2jt)
 */
function formatCompactRupiah(num) {
  if (!num || num === 0) return 'Rp 0';
  if (num >= 1000000) {
    const jt = (num / 1000000).toFixed(1).replace('.0', '');
    return `${jt}jt`;
  }
  if (num >= 1000) {
    const rb = Math.round(num / 1000);
    return `${rb}rb`;
  }
  return String(num);
}

/**
 * Format tanggal Indonesia ramah baca (contoh: 28 Okt 2026)
 */
function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = parseInt(parts[2], 10);
  const month = MONTHS[parseInt(parts[1], 10) - 1] || parts[1];
  const year = parts[0];
  return `${day} ${month} ${year}`;
}

/**
 * Render Widget Statistik Penjualan 7 Hari (Grafik Bar + KPI + Rincian)
 * @param {object} stats - Output dari store.getSalesStatsByDays(7)
 * @param {object} options - Opsi rendering (isCompact, showBreakdown, showTitle)
 */
export function render7DaySalesWidget(stats, options = {}) {
  if (!stats || !stats.days || stats.days.length === 0) {
    return `
      <div class="glass-card rounded-xl p-3 text-center text-xs text-on-surface-variant">
        Belum ada data transaksi penjualan 7 hari terakhir.
      </div>
    `;
  }

  const { isCompact = false, showBreakdown = true, showTitle = true } = options;
  const { days, summary } = stats;
  const maxRevenue = Math.max(...days.map((d) => d.revenue), 1);
  const startDateStr = days[0].date;
  const endDateStr = days[days.length - 1].date;

  return `
    <section class="glass-card glass-sheen relative overflow-hidden rounded-xl p-3 md:p-4 text-on-surface flex flex-col gap-3" id="sales-stats-7d-widget">
      <!-- Header -->
      ${showTitle ? `
        <div class="flex items-center justify-between pb-1 border-b border-white/20">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-800 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[16px]">monitoring</span>
            </div>
            <div>
              <h3 class="font-headline-sm text-xs sm:text-sm font-bold text-on-surface leading-tight">
                Statistik Penjualan 7 Hari Terakhir
              </h3>
              <p class="font-label-sm text-[10px] text-on-surface-variant">
                ${formatDateIndo(startDateStr)} — ${formatDateIndo(endDateStr)}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            data-nav="laporan" 
            class="px-2 py-1 rounded-md glass-chip text-[10px] font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 active:scale-95 transition-all"
            title="Lihat seluruh laporan"
          >
            <span>Laporan Lengkap</span>
            <span class="material-symbols-outlined text-[12px]">chevron_right</span>
          </button>
        </div>
      ` : ''}

      <!-- 3 KPI Cards -->
      <div class="grid grid-cols-3 gap-2">
        <!-- Card 1: Total Omset -->
        <div class="glass-panel rounded-lg p-2 flex flex-col justify-between border-l-2 border-emerald-600">
          <span class="font-label-sm text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">Total Omset</span>
          <div class="font-currency-display text-xs sm:text-sm font-bold text-emerald-800 font-tabular mt-0.5 leading-tight">
            ${formatRupiah(summary.totalRevenue, '')}
          </div>
          <span class="font-label-sm text-[9px] text-emerald-700 font-semibold mt-0.5">
            ${summary.totalTransactions} Transaksi
          </span>
        </div>

        <!-- Card 2: Total Sepatu -->
        <div class="glass-panel rounded-lg p-2 flex flex-col justify-between border-l-2 border-amber-600">
          <span class="font-label-sm text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">Sepatu Terjual</span>
          <div class="font-headline-sm text-xs sm:text-sm font-bold text-amber-900 font-tabular mt-0.5 leading-tight">
            ${summary.totalShoes} <span class="text-[10px] font-normal">Pasang</span>
          </div>
          <span class="font-label-sm text-[9px] text-amber-700 font-semibold mt-0.5">
            ${summary.avgShoes.toFixed(1)} psg / hari
          </span>
        </div>

        <!-- Card 3: Rata-rata & Hari Terbaik -->
        <div class="glass-panel rounded-lg p-2 flex flex-col justify-between border-l-2 border-blue-600">
          <span class="font-label-sm text-[9px] uppercase tracking-wider text-on-surface-variant font-bold">Rata-rata / Hari</span>
          <div class="font-currency-display text-xs sm:text-sm font-bold text-blue-900 font-tabular mt-0.5 leading-tight">
            ${formatRupiah(summary.avgRevenue, '')}
          </div>
          <span class="font-label-sm text-[9px] text-blue-700 font-semibold mt-0.5 truncate" title="Hari Terbaik: ${summary.bestDay.dayName}">
            ⭐ ${summary.bestDay.dayName || '-'} (${formatCompactRupiah(summary.bestDay.revenue)})
          </span>
        </div>
      </div>

      <!-- Interactive 7-Day Bar Chart -->
      <div class="glass-panel rounded-xl p-2.5 sm:p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-[10px] text-on-surface-variant px-1 font-semibold">
          <span>Grafik Omset Harian</span>
          <span class="text-emerald-800 font-bold">Puncak: ${formatRupiah(maxRevenue, '')}</span>
        </div>

        <!-- Chart Grid Bars Container -->
        <div class="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-32 sm:h-36 pt-4 pb-1 border-b border-black/10 select-none">
          ${days.map((d, idx) => {
            const heightPercent = maxRevenue > 0 && d.revenue > 0
              ? Math.max(Math.round((d.revenue / maxRevenue) * 100), 12)
              : 6;
            const isBest = summary.bestDay && summary.bestDay.revenue > 0 && d.revenue === summary.bestDay.revenue;
            const isToday = idx === days.length - 1;

            return `
              <div class="flex flex-col items-center justify-end h-full gap-1 group relative cursor-pointer sales-bar-item"
                   data-day-index="${idx}"
                   data-date="${d.date}"
                   data-day-name="${d.dayName}"
                   data-revenue="${d.revenue}"
                   data-shoes="${d.shoeCount}"
                   data-trx="${d.transactionCount}">
                
                <!-- Tooltip Popup saat hover / tap -->
                <div class="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute -top-11 z-30 bg-gray-900/95 text-white text-[9px] px-2 py-1 rounded-md shadow-lg flex flex-col items-center whitespace-nowrap">
                  <span class="font-bold text-amber-300">${d.dayName}, ${d.date.slice(8, 10)} ${formatDateIndo(d.date).split(' ')[1]}</span>
                  <span>${formatRupiah(d.revenue)} • ${d.shoeCount} psg</span>
                  <div class="w-1.5 h-1.5 bg-gray-900 rotate-45 absolute -bottom-0.5"></div>
                </div>

                <!-- Label Nominal di atas bar -->
                <span class="font-label-sm text-[8px] sm:text-[9px] font-bold ${isBest ? 'text-emerald-700' : 'text-on-surface-variant'} truncate">
                  ${d.revenue > 0 ? formatCompactRupiah(d.revenue) : '-'}
                </span>

                <!-- Bar Column -->
                <div class="w-full max-w-[32px] sm:max-w-[40px] rounded-t-md transition-all duration-300 group-hover:scale-y-105 group-hover:brightness-110 relative ${
                  d.revenue > 0
                    ? isBest
                      ? 'bg-gradient-to-t from-emerald-600 via-teal-500 to-amber-400 shadow-sm shadow-emerald-500/30'
                      : 'bg-gradient-to-t from-emerald-700 to-teal-500'
                    : 'bg-black/10'
                }" style="height: ${heightPercent}%;">
                  ${isBest ? `
                    <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white"></div>
                  ` : ''}
                </div>

                <!-- Label Hari & Tanggal di bawah -->
                <div class="flex flex-col items-center mt-1">
                  <span class="font-label-sm text-[9px] font-bold ${isToday ? 'text-emerald-800' : 'text-on-surface'} leading-none">
                    ${d.dayName}
                  </span>
                  <span class="font-label-sm text-[8px] ${isToday ? 'text-emerald-700 font-extrabold' : 'text-on-surface-variant'} leading-tight">
                    ${d.date.slice(8, 10)}
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="flex items-center justify-between text-[9px] text-on-surface-variant px-1 pt-0.5">
          <div class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>Hari Terbaik (${summary.bestDay.dayName})</span>
          </div>
          <span>Ketuk grafik untuk detail</span>
        </div>
      </div>

      <!-- Detail Breakdown Harian (Expandable / Tabel untuk Laporan) -->
      ${showBreakdown ? `
        <div class="flex flex-col gap-1.5 mt-1">
          <div class="flex items-center justify-between text-xs font-bold text-on-surface px-1">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[15px] text-emerald-700">list_alt</span>
              <span>Rincian Penjualan per Hari</span>
            </span>
            <span class="font-label-sm text-[10px] text-on-surface-variant font-normal">7 Hari Terakhir</span>
          </div>

          <div class="flex flex-col gap-1">
            ${[...days].reverse().map((d) => {
              const isBest = summary.bestDay && summary.bestDay.revenue > 0 && d.revenue === summary.bestDay.revenue;
              const percentOfMax = maxRevenue > 0 ? Math.round((d.revenue / maxRevenue) * 100) : 0;

              return `
                <div class="glass-panel rounded-lg p-2 flex flex-col gap-1 hover:bg-white/40 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <div class="w-8 text-center py-0.5 rounded bg-surface-container font-label-sm text-[9px] font-bold ${isBest ? 'text-emerald-800 bg-emerald-100/70 border border-emerald-300' : 'text-on-surface'}">
                        ${d.dayName}
                      </div>
                      <div class="flex flex-col">
                        <span class="font-body-sm text-[11px] font-bold text-on-surface leading-tight">
                          ${formatDateIndo(d.date)}
                        </span>
                        <span class="text-[9px] text-on-surface-variant">
                          ${d.shoeCount} pasang sepatu • ${d.transactionCount}x transaksi
                        </span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end">
                      <span class="font-currency-item text-xs font-bold text-emerald-800 font-tabular">
                        ${formatRupiah(d.revenue)}
                      </span>
                      ${isBest ? `
                        <span class="text-[8px] font-bold text-amber-700 bg-amber-100/80 px-1 rounded">⭐ Tertinggi</span>
                      ` : ''}
                    </div>
                  </div>

                  <!-- Mini Progress Bar Harian -->
                  <div class="w-full bg-black/5 h-1 rounded-full overflow-hidden">
                    <div class="h-full ${isBest ? 'bg-amber-500' : 'bg-emerald-600'} rounded-full" style="width: ${percentOfMax}%;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </section>
  `;
}
