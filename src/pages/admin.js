import { categories, categoryLabel, cheapest, LOW_STOCK, money, orderStatuses, totalStock } from '../data.js'
import { deleteBook, read, updateOrderStatus, updateStock, upsertBook } from '../store.js'
import { coverHtml, escapeHtml, icon, mountChrome, qs, statusPill, toast } from '../ui.js'

mountChrome('admin')

const page = qs('#page')
let role = 'admin'
let tab = 'catalog'
let editing = null

const palettes = [
  { bg: '#2f4b63', ink: '#eae4d6', motif: 'rule' },
  { bg: '#a2503a', ink: '#f4e7d6', motif: 'sun' },
  { bg: '#223a34', ink: '#efe6d4', motif: 'waves' },
  { bg: '#efe2cb', ink: '#4a2c1d', motif: 'arch' },
  { bg: '#4c5638', ink: '#ede7d6', motif: 'steps' },
  { bg: '#d9b3a6', ink: '#3a2620', motif: 'orbit' },
]

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || `title-${Date.now().toString(36).slice(-4)}`

function uniqueSlug(base, books) {
  let slug = base
  let n = 2
  while (books.some((b) => b.slug === slug)) {
    slug = `${base}-${n}`
    n += 1
  }
  return slug
}

function statusTag(book) {
  const stock = totalStock(book)
  if (stock === 0) return '<span class="low-tag out-tag">Out of stock</span>'
  if (stock <= LOW_STOCK * 2) return `<span class="low-tag">Low · ${stock}</span>`
  return '<span class="small muted">In stock</span>'
}

function statsHtml() {
  const state = read()
  const low = state.books.filter((b) => b.formats.some((f) => f.format !== 'ebook' && f.stock <= LOW_STOCK)).length
  const toShip = state.orders.filter((o) => o.status === 'Processing' || o.status === 'Packed').length
  const revenue = state.orders.filter((o) => o.status !== 'Cancelled').reduce((n, o) => n + o.total, 0)
  return `<div class="stat-grid">
    <div class="stat"><span>${role === 'shipping' ? 'Parcels on the road' : 'Titles in catalogue'}</span><strong>${role === 'shipping' ? state.orders.filter((o) => o.status === 'Shipped').length : state.books.length}</strong></div>
    <div class="stat"><span>Low stock lines</span><strong>${low}</strong></div>
    <div class="stat"><span>Orders to dispatch</span><strong>${toShip}</strong></div>
    <div class="stat"><span>${role === 'shipping' ? 'Delivered' : 'Demo revenue'}</span><strong>${role === 'shipping' ? state.orders.filter((o) => o.status === 'Delivered').length : money(revenue)}</strong></div>
  </div>`
}

function bookFormHtml(book) {
  const paper = book?.formats.find((f) => f.format === 'paperback')
  const hard = book?.formats.find((f) => f.format === 'hardcover')
  const ebook = book?.formats.find((f) => f.format === 'ebook')
  return `<form class="inline-form" id="book-form" data-slug="${book ? escapeHtml(book.slug) : ''}" novalidate>
    <h3>${book ? `Edit “${escapeHtml(book.title)}”` : 'Add a title'}</h3>
    <div class="form-grid form-grid--2">
      <div class="field"><label for="bf-title">Title</label><input class="input" id="bf-title" value="${book ? escapeHtml(book.title) : ''}" required /></div>
      <div class="field"><label for="bf-author">Author</label><input class="input" id="bf-author" value="${book ? escapeHtml(book.author) : ''}" required /></div>
      <div class="field"><label for="bf-category">Shelf</label>
        <select class="select" id="bf-category">${categories.map((c) => `<option value="${c.key}" ${book?.category === c.key ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="bf-year">Year</label><input class="input" id="bf-year" inputmode="numeric" value="${book ? book.year : new Date().getFullYear()}" /></div>
    </div>
    <div class="field" style="margin-top:14px"><label for="bf-summary">One-line summary</label><input class="input" id="bf-summary" maxlength="160" value="${book ? escapeHtml(book.summary) : ''}" placeholder="What is it about, in a sentence?" required /></div>
    <div class="field" style="margin-top:14px"><label for="bf-description">Description</label><textarea class="textarea" id="bf-description" style="min-height:80px">${book ? escapeHtml(book.description) : ''}</textarea></div>
    <div class="form-grid form-grid--3" style="margin-top:14px">
      <div class="field"><label for="bf-paper-price">Paperback price</label><input class="input" id="bf-paper-price" inputmode="decimal" value="${paper ? paper.price.toFixed(2) : '18.99'}" /></div>
      <div class="field"><label for="bf-paper-stock">Paperback stock</label><input class="input" id="bf-paper-stock" inputmode="numeric" value="${paper ? paper.stock : '10'}" /></div>
      <div class="field"><label for="bf-ebook-price">eBook price</label><input class="input" id="bf-ebook-price" inputmode="decimal" value="${ebook ? ebook.price.toFixed(2) : '9.99'}" /></div>
    </div>
    <div class="form-grid form-grid--3" style="margin-top:14px">
      <div class="field"><label for="bf-hard-price">Hardcover price <span class="faint">(optional)</span></label><input class="input" id="bf-hard-price" inputmode="decimal" value="${hard ? hard.price.toFixed(2) : ''}" placeholder="—" /></div>
      <div class="field"><label for="bf-hard-stock">Hardcover stock</label><input class="input" id="bf-hard-stock" inputmode="numeric" value="${hard ? hard.stock : '0'}" /></div>
      <div class="field"><label>Cover</label><p class="help" style="padding-top:13px">Generated from the shelf palette.</p></div>
    </div>
    <div class="form-actions">
      <button class="btn" type="submit">${book ? 'Save changes' : 'Add to catalogue'}</button>
      <button class="btn btn--secondary" type="button" data-cancel-form>Cancel</button>
    </div>
  </form>`
}

function catalogPanel() {
  const state = read()
  return `<div class="spread" style="margin-bottom:6px">
      <div><h2 class="display" style="font-size:28px">Catalogue</h2><p class="small muted">${state.books.length} titles across ${categories.length} shelves.</p></div>
      <button class="btn btn--sm" type="button" data-add-book>${icon('plus')} Add book</button>
    </div>
    <div id="book-form-slot">${editing !== null ? bookFormHtml(state.books.find((b) => b.slug === editing)) : ''}</div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Book</th><th>Shelf</th><th>From</th><th>Paper stock</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${state.books
            .map(
              (book) => `<tr>
                <td><div class="table-book">${coverHtml(book)}<div><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)} · ${book.year}</span></div></div></td>
                <td>${escapeHtml(categoryLabel(book.category))}</td>
                <td class="n">${money(cheapest(book))}</td>
                <td class="n">${totalStock(book)}</td>
                <td>${statusTag(book)}</td>
                <td><div class="table-actions">
                  <button class="rowbtn" type="button" data-edit="${escapeHtml(book.slug)}">Edit</button>
                  <button class="rowbtn danger" type="button" data-delete="${escapeHtml(book.slug)}">Delete</button>
                </div></td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="admin-note">Changes apply to the storefront immediately: edited prices and stock, new titles and deletions are all persisted in this browser.</p>`
}

function inventoryPanel() {
  const state = read()
  return `<div><h2 class="display" style="font-size:28px">Inventory &amp; stock</h2><p class="small muted">Paper quantities drop with every order. eBooks are unlimited.</p></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Book</th><th>Paperback</th><th>Hardcover</th><th>eBook</th><th>Status</th></tr></thead>
        <tbody>
          ${state.books
            .map((book) => {
              const cell = (format) => {
                const f = book.formats.find((x) => x.format === format)
                if (!f) return '<span class="faint">—</span>'
                if (format === 'ebook') return '<span class="small muted">Unlimited</span>'
                return `<input class="stock-input" type="number" min="0" value="${f.stock}" data-stock="${escapeHtml(book.slug)}" data-format="${format}" aria-label="${escapeHtml(book.title)} ${format} stock" />${f.stock <= LOW_STOCK ? '<span class="low-tag">Low</span>' : ''}`
              }
              return `<tr data-row="${escapeHtml(book.slug)}">
                <td><div class="table-book">${coverHtml(book)}<div><strong>${escapeHtml(book.title)}</strong><span>${escapeHtml(book.author)}</span></div></div></td>
                <td>${cell('paperback')}</td>
                <td>${cell('hardcover')}</td>
                <td>${cell('ebook')}</td>
                <td>${statusTag(book)}</td>
              </tr>`
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="admin-note">Editing a quantity saves it on the spot and updates the storefront's “In stock” labels.</p>`
}

function ordersPanel() {
  const state = read()
  return `<div><h2 class="display" style="font-size:28px">Orders</h2><p class="small muted">Every order placed in this browser, newest first.</p></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${state.orders
            .map(
              (order) => `<tr>
                <td><a href="order.html?id=${encodeURIComponent(order.id)}" style="text-decoration:underline;text-underline-offset:2px">${escapeHtml(order.id)}</a><br /><span class="faint" style="font-size:11px">${escapeHtml(order.invoice)}</span></td>
                <td><strong style="font-weight:500">${escapeHtml(order.name)}</strong><br /><span class="faint" style="font-size:11.5px">${escapeHtml(order.email)}</span></td>
                <td class="n">${new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                <td class="n">${order.items.reduce((n, i) => n + i.qty, 0)}</td>
                <td class="n">${money(order.total)}</td>
                <td>
                  <select class="select select--sm" data-order-status="${escapeHtml(order.id)}" aria-label="Status for ${escapeHtml(order.id)}" style="min-width:130px">
                    ${orderStatuses.map((s) => `<option ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                    <option ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                  </select>
                </td>
                <td><div class="table-actions"><a class="rowbtn" href="order.html?id=${encodeURIComponent(order.id)}">Receipt</a></div></td>
              </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="admin-note">Changing a status adds a tracking event to the customer's receipt. Delivered orders open the return form.</p>`
}

function shipmentsPanel() {
  const state = read()
  const shipments = state.orders.filter((o) => o.items.some((i) => i.format !== 'ebook') && o.status !== 'Cancelled')
  if (!shipments.length) {
    return `<div class="result-empty"><h3>No parcels yet</h3><p class="muted" style="margin-top:8px">Orders with paper books will appear here for Northline Deliveries.</p></div>`
  }
  return `<div><h2 class="display" style="font-size:28px">Delivery desk</h2><p class="small muted">Northline Deliveries can update status and attach shipment details. The customer's receipt updates instantly.</p></div>
    <div class="table-wrap">
      <table class="data">
        <thead><tr><th>Order</th><th>Deliver to</th><th>Status</th><th>Last event</th><th>Update</th></tr></thead>
        <tbody>
          ${shipments
            .map((order) => {
              const last = order.tracking[order.tracking.length - 1]
              const done = order.status === 'Delivered'
              return `<tr>
                <td><strong style="font-weight:500">${escapeHtml(order.id)}</strong><br /><span class="faint" style="font-size:11.5px">${order.items.filter((i) => i.format !== 'ebook').length} paper items</span></td>
                <td>${escapeHtml(order.address.line1)}<br /><span class="faint" style="font-size:11.5px">${escapeHtml(order.address.city)} ${escapeHtml(order.address.postcode)}</span></td>
                <td>${statusPill(order.status)}</td>
                <td><span class="small muted">${escapeHtml(last.label)}</span><br /><span class="faint" style="font-size:11px">${new Date(last.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${last.note ? ` · ${escapeHtml(last.note)}` : ''}</span></td>
                <td>
                  ${
                    done
                      ? '<span class="small faint">Delivered</span>'
                      : `<form class="ship-form" data-id="${escapeHtml(order.id)}" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                          <select class="select select--sm" name="status" aria-label="New status" style="width:auto">
                            ${['Packed', 'Shipped', 'Delivered'].map((s) => `<option ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                          </select>
                          <input class="stock-input" style="width:150px" name="note" maxlength="60" placeholder="Courier note" aria-label="Courier note" />
                          <button class="rowbtn" type="submit">Update</button>
                        </form>`
                  }
                </td>
              </tr>`
            })
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="admin-note">Updating the status sends shipment details to the order's tracking timeline.</p>`
}

function renderShell() {
  const tabs =
    role === 'admin'
      ? [
          ['catalog', 'Catalogue'],
          ['inventory', 'Inventory'],
          ['orders', 'Orders'],
        ]
      : [['shipments', 'Shipments']]

  page.innerHTML = `<div class="admin-head">
      <div>
        <p class="eyebrow">Back office · demo</p>
        <h1>Shop management</h1>
        <p class="small muted">The two staff roles from the system diagram, in one place. No password — it is a demo.</p>
      </div>
      <div class="role-switch" role="group" aria-label="View as">
        <button type="button" data-role="admin" class="${role === 'admin' ? 'is-active' : ''}">Administrator</button>
        <button type="button" data-role="shipping" class="${role === 'shipping' ? 'is-active' : ''}">Shipping company</button>
      </div>
    </div>
    <div id="stats">${statsHtml()}</div>
    <div class="tabs" style="margin-top:26px">
      ${tabs.map(([key, label]) => `<button class="tab ${tab === key ? 'is-active' : ''}" type="button" data-tab="${key}">${label}</button>`).join('')}
    </div>
    <div id="admin-panel" style="margin-top:22px"></div>`

  renderPanel()
}

function renderPanel() {
  const panel = qs('#admin-panel')
  if (!panel) return
  if (role === 'shipping') panel.innerHTML = shipmentsPanel()
  else if (tab === 'catalog') panel.innerHTML = catalogPanel()
  else if (tab === 'inventory') panel.innerHTML = inventoryPanel()
  else panel.innerHTML = ordersPanel()
}

function refresh() {
  const stats = qs('#stats')
  if (stats) stats.innerHTML = statsHtml()
  renderPanel()
}

renderShell()

document.addEventListener('click', (event) => {
  const roleBtn = event.target.closest('[data-role]')
  if (roleBtn) {
    role = roleBtn.dataset.role
    tab = role === 'shipping' ? 'shipments' : 'catalog'
    editing = null
    renderShell()
    return
  }
  const tabBtn = event.target.closest('[data-tab]')
  if (tabBtn) {
    tab = tabBtn.dataset.tab
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('is-active', b === tabBtn))
    renderPanel()
    return
  }
  if (event.target.closest('[data-add-book]')) {
    editing = null
    const slot = qs('#book-form-slot')
    if (slot) slot.innerHTML = bookFormHtml(null)
    qs('#bf-title')?.focus()
    return
  }
  const edit = event.target.closest('[data-edit]')
  if (edit) {
    editing = edit.dataset.edit
    const slot = qs('#book-form-slot')
    if (slot) slot.innerHTML = bookFormHtml(read().books.find((b) => b.slug === editing))
    qs('#book-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const del = event.target.closest('[data-delete]')
  if (del) {
    const book = read().books.find((b) => b.slug === del.dataset.delete)
    if (book && window.confirm(`Remove “${book.title}” from the catalogue? This also clears it from bags and wishlists.`)) {
      deleteBook(book.slug)
      editing = null
      toast('Book removed from the catalogue')
      refresh()
    }
    return
  }
  if (event.target.closest('[data-cancel-form]')) {
    editing = null
    const slot = qs('#book-form-slot')
    if (slot) slot.innerHTML = ''
  }
})

document.addEventListener('change', (event) => {
  const stock = event.target.closest('[data-stock]')
  if (stock) {
    updateStock(stock.dataset.stock, stock.dataset.format, Number(stock.value))
    toast('Stock updated')
    refresh()
    return
  }
  const orderStatus = event.target.closest('[data-order-status]')
  if (orderStatus) {
    updateOrderStatus(orderStatus.dataset.orderStatus, orderStatus.value, 'Updated by the shop')
    toast(`Order ${orderStatus.dataset.orderStatus} marked ${orderStatus.value}`)
    refresh()
  }
})

document.addEventListener('submit', (event) => {
  if (event.target.id === 'book-form') {
    event.preventDefault()
    const state = read()
    const slug = event.target.dataset.slug
    const existing = state.books.find((b) => b.slug === slug)
    const title = qs('#bf-title').value.trim()
    const author = qs('#bf-author').value.trim()
    const summary = qs('#bf-summary').value.trim()
    const paperPrice = Number(qs('#bf-paper-price').value)
    const paperStock = Number(qs('#bf-paper-stock').value)
    const ebookPrice = Number(qs('#bf-ebook-price').value)
    const hardPrice = Number(qs('#bf-hard-price').value)
    const hardStock = Number(qs('#bf-hard-stock').value)

    if (!title || !author || !summary) {
      toast('Add a title, author and summary')
      return
    }
    if (!(paperPrice > 0) || !(ebookPrice > 0)) {
      toast('Prices must be greater than zero')
      return
    }

    const formats = [{ format: 'paperback', price: Math.round(paperPrice * 100) / 100, stock: Math.max(0, Math.floor(paperStock) || 0) }]
    if (hardPrice > 0) formats.push({ format: 'hardcover', price: Math.round(hardPrice * 100) / 100, stock: Math.max(0, Math.floor(hardStock) || 0) })
    formats.push({ format: 'ebook', price: Math.round(ebookPrice * 100) / 100, stock: 0 })

    const description = qs('#bf-description').value.trim() || summary
    const book = {
      slug: existing ? existing.slug : uniqueSlug(slugify(title), state.books),
      title,
      author,
      category: qs('#bf-category').value,
      publisher: existing ? existing.publisher : 'BookNest Editions',
      year: Number(qs('#bf-year').value) || new Date().getFullYear(),
      pages: existing ? existing.pages : 240,
      isbn: existing ? existing.isbn : '978-1-9000-0000-0',
      language: 'English',
      summary,
      description,
      formats,
      rating: existing ? existing.rating : 0,
      reviewCount: existing ? existing.reviewCount : 0,
      reviews: existing ? existing.reviews : [],
      cover: existing ? existing.cover : palettes[state.books.length % palettes.length],
      featured: existing ? existing.featured : false,
      isNew: existing ? existing.isNew : true,
    }

    upsertBook(book)
    editing = null
    toast(existing ? 'Book updated' : 'Book added to the catalogue')
    refresh()
    return
  }

  const shipForm = event.target.closest('.ship-form')
  if (shipForm) {
    event.preventDefault()
    const id = shipForm.dataset.id
    const status = shipForm.querySelector('[name="status"]').value
    const note = shipForm.querySelector('[name="note"]').value.trim()
    const tracking = `Northline Deliveries · Tracking 4NL-${Math.floor(1000 + Math.random() * 9000)}`
    updateOrderStatus(id, status, note ? `${note} · ${tracking}` : tracking)
    toast(`${id} marked ${status}; customer notified`)
    refresh()
  }
})
