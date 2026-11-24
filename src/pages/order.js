import { coverFallback, formatDate, formatDateTime, formatLabel, money, shippingMethods, statusNote } from '../data.js'
import { addToCart, read } from '../store.js'
import { coverHtml, emptyState, escapeHtml, icon, mountChrome, param, qs, statusPill, toast } from '../ui.js'

mountChrome('order')

const page = qs('#page')
const id = param('id')
const state = read()
const order = state.orders.find((o) => o.id === id)

if (!order) {
  page.innerHTML = `<div style="padding:40px 0 20px">
    <div class="page-head"><p class="eyebrow">Receipt</p><h1>Order not found</h1></div>
    ${emptyState('We could not find that order', 'Check the link from your receipt email, or open your order history.', '<a class="btn" href="account.html?tab=orders">Go to order history</a>')}
  </div>`
} else {
  const coverFor = (item) => {
    const book = state.books.find((b) => b.slug === item.slug)
    return book || { title: item.title, author: item.author, cover: coverFallback }
  }
  const physical = order.items.some((i) => i.format !== 'ebook')
  const method = shippingMethods.find((m) => m.id === order.shippingMethod)
  const latest = order.tracking[order.tracking.length - 1]
  const delivered = order.status === 'Delivered'

  page.innerHTML = `
    <div class="page-head">
      <p class="eyebrow">Receipt &amp; tracking</p>
      <h1>Order ${escapeHtml(order.id)}</h1>
      <div class="row wrap" style="margin-top:12px;gap:10px">
        ${statusPill(order.status)}
        <span class="small muted">Placed ${formatDate(order.createdAt)}</span>
        <span class="faint small">·</span>
        <span class="small muted">${order.items.reduce((n, i) => n + i.qty, 0)} items</span>
        <span class="faint small">·</span>
        <span class="small muted">${escapeHtml(order.payment)}</span>
      </div>
    </div>

    <div class="receipt-grid">
      <div>
        <div class="invoice" id="receipt">
          <div class="invoice-head">
            <div>
              <p class="eyebrow">BookNest</p>
              <h1>Purchase receipt</h1>
              <p class="small muted" style="margin-top:4px">Invoice ${escapeHtml(order.invoice)}</p>
            </div>
            <div style="text-align:right">
              ${statusPill(order.status)}
              <p class="small muted" style="margin-top:8px">${formatDate(order.createdAt)}</p>
            </div>
          </div>
          <dl class="invoice-meta">
            <div><dt>Billed to</dt><dd>${escapeHtml(order.name)}<br />${escapeHtml(order.email)}</dd></div>
            <div><dt>${physical ? 'Deliver to' : 'Invoice address'}</dt><dd>${escapeHtml(order.address.line1)}<br />${escapeHtml(order.address.city)} ${escapeHtml(order.address.postcode)}<br />${escapeHtml(order.address.country)}</dd></div>
            <div><dt>Shipping method</dt><dd>${physical ? escapeHtml(method ? method.label : 'Standard') + `<br />${escapeHtml(method ? method.detail : '')}` : 'Digital delivery'}</dd></div>
            <div><dt>Payment</dt><dd>${escapeHtml(order.payment)}${order.promo ? `<br />Code ${escapeHtml(order.promo)}` : ''}</dd></div>
          </dl>
          <div class="invoice-lines">
            ${order.items
              .map(
                (item) => `<div class="invoice-line">
                  ${coverHtml(coverFor(item))}
                  <div class="info"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.author)} · ${formatLabel[item.format]} · qty ${item.qty}</span></div>
                  <span class="amt">${money(item.price * item.qty)}</span>
                </div>`,
              )
              .join('')}
          </div>
          <div class="invoice-totals">
            <div><span class="muted">Subtotal</span><span class="tabnums">${money(order.subtotal)}</span></div>
            ${order.discount > 0 ? `<div style="color:var(--green)"><span>Discount</span><span class="tabnums">−${money(order.discount)}</span></div>` : ''}
            <div><span class="muted">${physical ? 'Shipping' : 'Digital delivery'}</span><span class="tabnums">${order.shipping === 0 ? 'Free' : money(order.shipping)}</span></div>
            <div class="total"><span>Total paid</span><span class="tabnums">${money(order.total)}</span></div>
          </div>
          <div class="invoice-foot">
            <span>Order ${escapeHtml(order.id)} · Invoice ${escapeHtml(order.invoice)}</span>
            <span>Demo receipt — no payment was taken.</span>
          </div>
        </div>

        <div class="panel" id="tracking" style="margin-top:16px">
          <div class="spread">
            <h2>${physical ? 'Delivery tracking' : 'Digital delivery'}</h2>
            <span class="small faint">${physical ? 'Northline Deliveries' : 'Instant'}</span>
          </div>
          ${
            physical
              ? `<div class="timeline">
                  ${order.tracking
                    .map(
                      (event, index) => `<div class="tl-item ${index === order.tracking.length - 1 ? 'is-latest' : ''}">
                        <strong>${escapeHtml(event.label)}</strong>
                        <span>${formatDateTime(event.at)}</span>
                        ${event.note ? `<p>${escapeHtml(event.note)}</p>` : ''}
                      </div>`,
                    )
                    .join('')}
                </div>
                <p class="help" style="margin-top:14px">${delivered ? `Delivered ${formatDateTime(latest.at)}. Questions? Quote order ${escapeHtml(order.id)}.` : 'Tracking events appear here as the shop and carrier update your parcel.'}</p>`
              : `<p class="small muted" style="margin-top:8px">Your eBook links are ready. They are also kept on this receipt, so bookmark the page.</p>
                <div class="option-list" style="margin-top:14px">
                  ${order.items
                    .filter((i) => i.format === 'ebook')
                    .map(
                      (i) => `<div class="option"><span class="radio" style="border-color:var(--fg)"></span><span><strong>${escapeHtml(i.title)}</strong><span class="sub">EPUB · DRM-free</span></span><button class="rowbtn" type="button" data-download="${escapeHtml(i.slug)}">Download</button></div>`,
                    )
                    .join('')}
                </div>`
          }
        </div>
      </div>

      <div>
        <div class="panel">
          <h2>Order actions</h2>
          <div class="stack" style="gap:8px;margin-top:14px">
            <button class="btn btn--secondary btn--block" type="button" id="print-receipt">${icon('printer')} Print receipt</button>
            <button class="btn btn--block" type="button" data-reorder="${escapeHtml(order.id)}">${icon('refresh')} Reorder these books</button>
            ${delivered ? `<a class="btn btn--secondary btn--block" href="account.html?tab=returns&order=${encodeURIComponent(order.id)}">${icon('refresh')} Start a return</a>` : ''}
          </div>
          <p class="help" style="margin-top:12px">Reordering adds every available item back to your bag.</p>
        </div>

        <div class="panel">
          <h2>Summary</h2>
          <div class="side-list">
            <div><span>Items</span><span class="tabnums">${order.items.reduce((n, i) => n + i.qty, 0)}</span></div>
            <div><span>Paper / digital</span><span>${physical ? `${order.items.filter((i) => i.format !== 'ebook').length} paper` : 'Digital only'}</span></div>
            <div><span>Placed</span><span>${formatDate(order.createdAt)}</span></div>
            <div><span>Status</span><span>${escapeHtml(statusNote[order.status] || order.status)}</span></div>
            <div><span>Total</span><span class="tabnums">${money(order.total)}</span></div>
          </div>
        </div>

        <div class="panel">
          <h2>Need a hand?</h2>
          <p class="small muted" style="margin-top:8px">Returns are open for 30 days on paper copies. eBooks are not returnable, but a damaged download is always replaced.</p>
          <a class="btn btn--secondary btn--block btn--sm" style="margin-top:14px" href="account.html?tab=orders">Your order history</a>
        </div>
      </div>
    </div>`

  document.addEventListener('click', (event) => {
    if (event.target.closest('#print-receipt')) {
      window.print()
      return
    }
    const reorder = event.target.closest('[data-reorder]')
    if (reorder) {
      const target = read().orders.find((o) => o.id === reorder.dataset.reorder)
      if (!target) return
      let added = 0
      target.items.forEach((item) => {
        const live = read().books.find((b) => b.slug === item.slug)
        const option = live && live.formats.find((f) => f.format === item.format)
        if (live && option && (item.format === 'ebook' || option.stock > 0)) {
          addToCart(item.slug, item.format, 1)
          added += 1
        }
      })
      toast(added ? 'Added to your bag' : 'Those books are out of stock')
      if (added) window.location.href = 'checkout.html'
      return
    }
    if (event.target.closest('[data-download]')) {
      toast('Demo download — the EPUB link would start here')
    }
  })
}
