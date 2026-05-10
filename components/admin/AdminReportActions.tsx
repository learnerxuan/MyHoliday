"use client"

import { Printer } from 'lucide-react'
import type { AdminReportsData } from '@/lib/actions/reports'

const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

const number = new Intl.NumberFormat('en-MY')

export default function AdminReportActions({ data }: { data: AdminReportsData }) {
  const handlePrintPdf = () => {
    const generatedAt = new Date()
    const reportWindow = window.open('', '_blank')
    if (!reportWindow) {
      alert('Please allow popups to print the PDF report.')
      return
    }

    reportWindow.document.write(buildPrintableReport(data, generatedAt))
    reportWindow.document.close()
    reportWindow.focus()
    window.setTimeout(() => {
      reportWindow.print()
    }, 250)
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handlePrintPdf}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal text-white text-sm font-semibold hover:bg-black transition-colors"
      >
        <Printer className="w-4 h-4" />
        Print PDF
      </button>
    </div>
  )
}

function buildPrintableReport(data: AdminReportsData, generatedAt: Date) {
  const overviewRows = [
    ['Total Travellers', number.format(data.overview.totalTravellers)],
    ['Active Travellers', number.format(data.overview.activeTravellers)],
    ['Approved Guides', number.format(data.overview.approvedGuides)],
    ['Completed Transactions', number.format(data.overview.completedTransactions)],
    ['Completed GMV', currency.format(data.overview.completedGmv)],
    ['Platform Revenue', currency.format(data.overview.platformRevenue)],
    ['Average Transaction Value', currency.format(data.overview.averageTransactionValue)],
    ['Match Rate', `${data.marketplace.matchRate.toFixed(1)}%`]
  ]

  const marketplaceRows = [
    ['Average Offers Per Listing', data.marketplace.averageOffersPerListing.toFixed(1)],
    ['AI Completion Rate', `${data.aiPlanner.completionRate.toFixed(1)}%`],
    ['Avg Messages Per Session', data.aiPlanner.averageMessagesPerSession.toFixed(1)],
    ['Historical Records', number.format(data.mlDataset.totalRecords)],
    ['Dataset Destinations', number.format(data.mlDataset.distinctDestinations)],
    ['Avg Trip Duration', data.mlDataset.averageDuration.toFixed(1)]
  ]

  const destinationRows = data.destinations.topDestinations.map(item => [
    item.destination,
    number.format(item.listings),
    number.format(item.itineraries),
    number.format(item.interactions)
  ])

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>MyHoliday Admin Report</title>
        <style>
          @page { margin: 18mm; size: A4; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #1A1A1A;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.45;
          }
          .cover {
            border-bottom: 3px solid #C4874A;
            margin-bottom: 24px;
            padding-bottom: 18px;
          }
          .eyebrow {
            color: #8B6A3E;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.6px;
            text-transform: uppercase;
          }
          h1 {
            font-size: 30px;
            margin: 6px 0;
          }
          h2 {
            font-size: 17px;
            margin: 26px 0 10px;
          }
          p {
            color: #666;
            margin: 4px 0;
          }
          .grid {
            display: grid;
            gap: 12px;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-bottom: 18px;
          }
          .metric {
            border: 1px solid #E5E0DA;
            border-radius: 10px;
            padding: 12px;
          }
          .metric-label {
            color: #666;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          .metric-value {
            font-size: 20px;
            font-weight: 800;
            margin-top: 4px;
          }
          table {
            border-collapse: collapse;
            margin-bottom: 18px;
            width: 100%;
          }
          th, td {
            border: 1px solid #E5E0DA;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background: #F7F7F8;
            color: #555;
            font-size: 11px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          td {
            font-size: 13px;
          }
          .footer {
            border-top: 1px solid #E5E0DA;
            color: #777;
            font-size: 11px;
            margin-top: 26px;
            padding-top: 10px;
          }
          @media print {
            .page-break { break-before: page; }
          }
        </style>
      </head>
      <body>
        <section class="cover">
          <div class="eyebrow">MyHoliday Admin Analytics</div>
          <h1>Platform Performance Report</h1>
          <p>Generated ${escapeHtml(generatedAt.toLocaleString('en-MY'))}</p>
          <p>Summary of marketplace performance, platform revenue, user growth, and operational health.</p>
        </section>

        <section class="grid">
          ${metricCard('Completed GMV', currency.format(data.overview.completedGmv))}
          ${metricCard('Platform Revenue', currency.format(data.overview.platformRevenue))}
          ${metricCard('Completed Transactions', number.format(data.overview.completedTransactions))}
          ${metricCard('Match Rate', `${data.marketplace.matchRate.toFixed(1)}%`)}
        </section>

        ${tableToHtml('Overview', ['Metric', 'Value'], overviewRows)}
        ${tableToHtml('Operational Metrics', ['Metric', 'Value'], marketplaceRows)}
        ${tableToHtml('Listing Status', ['Status', 'Count'], data.marketplace.listingStatus.map(item => [item.name, number.format(item.value)]))}
        ${tableToHtml('Offer Status', ['Status', 'Count'], data.marketplace.offerStatus.map(item => [item.name, number.format(item.value)]))}
        ${tableToHtml('Top Destination Demand', ['Destination', 'Listings', 'Itineraries', 'Interactions'], destinationRows)}

        <div class="footer">
          MyHoliday admin report. Financial figures are based on completed transactions only.
        </div>

        <script>
          window.addEventListener('afterprint', () => window.close());
        </script>
      </body>
    </html>
  `
}

function metricCard(label: string, value: string) {
  return `
    <div class="metric">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(value)}</div>
    </div>
  `
}

function tableToHtml(title: string, headers: string[], rows: Array<Array<string | number>>) {
  return `
    <h2>${escapeHtml(title)}</h2>
    <table>
      <thead>
        <tr>${headers.map(cell => `<th>${escapeHtml(String(cell))}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
