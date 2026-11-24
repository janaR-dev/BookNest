import { bookCardHtml, bindCards } from '../card.js'
import { categories, categoryLabel, cheapest } from '../data.js'
import { read } from '../store.js'
import { bindWishlistButtons, emptyState, escapeHtml, icon, mountChrome, qs, syncWishlistButtons } from '../ui.js'

mountChrome('books')
bindCards()
bindWishlistButtons()

const params = new URLSearchParams(location.search)
const filters = {
  q: params.get('q') || '',
  category: params.get('category') || '',
  format: params.get('format') || '',
  price: params.get('price') || '',
  stock: params.get('stock') === '1',
  only: params.get('only') || '',
  sort: params.get('sort') || 'featured',
}

const searchInput = qs('#search-input')
const sortSelect = qs('#sort')
if (searchInput) searchInput.value = filters.q
if (sortSelect) sortSelect.value = filters.sort

function syncUrl() {
  const next = new URLSearchParams()
  if (filters.q) next.set('q', filters.q)
  if (filters.category) next.set('category', filters.category)
  if (filters.format) next.set('format', filters.format)
  if (filters.price) next.set('price', filters.price)
  if (filters.stock) next.set('stock', '1')
  if (filters.only) next.set('only', filters.only)
  if (filters.sort && filters.sort !== 'featured') next.set('sort', filters.sort)
  const query = next.toString()
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`)
}

const matchesQuery = (book, query) => {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [book.title, book.author, book.isbn, book.publisher, book.summary, categoryLabel(book.category)]
    .join(' ')
    .toLowerCase()
    .includes(q)
}

function baseList(books) {
  let list = books.filter((b) => matchesQuery(b, filters.q))
  if (filters.only === 'deals') list = list.filter((b) => cheapest(b) <= 18)
  return list
}

function applyFilters(list) {
  let items = list
  if (filters.category) items = items.filter((b) => b.category === filters.category)
  if (filters.format === 'paper') items = items.filter((b) => b.formats.some((f) => f.format !== 'ebook' && f.stock > 0))
  if (filters.format === 'ebook') items = items.filter((b) => b.formats.some((f) => f.format === 'ebook'))
  if (filters.price === 'lt15') items = items.filter((b) => cheapest(b) < 15)
  if (filters.price === '15-22') items = items.filter((b) => cheapest(b) >= 15 && cheapest(b) <= 22)
  if (filters.price === 'gt22') items = items.filter((b) => cheapest(b) > 22)
  if (filters.stock) items = items.filter((b) => b.formats.some((f) => f.format !== 'ebook' && f.stock > 0))

  const sorted = [...items]
  if (filters.sort === 'new') sorted.sort((a, b) => Number(b.isNew || 0) - Number(a.isNew || 0) || b.year - a.year)
  if (filters.sort === 'price-asc') sorted.sort((a, b) => cheapest(a) - cheapest(b))
  if (filters.sort === 'price-desc') sorted.sort((a, b) => cheapest(b) - cheapest(a))
  if (filters.sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
  if (filters.sort === 'featured') sorted.sort((a, b) => Number(b.featured || 0) - Number(a.featured || 0) || b.reviewCount - a.reviewCount)
  return sorted
}

function filtersHtml(base) {
  const button = (kind, value, label, count) =>
    `<li><button class="filter-btn" type="button" data-filter="${kind}" data-value="${value}" aria-pressed="${
      kind === 'category' ? filters.category === value : filters.format === value
    }">${escapeHtml(label)}${count !== undefined ? `<span class="n">${count}</span>` : ''}</button></li>`

  const countFor = (key) => base.filter((b) => b.category === key).length

  return `<div class="filter-group">
      <h3>Shelf</h3>
      <ul class="filter-list">
        ${button('category', '', 'All books', base.length)}
        ${categories.map((c) => button('category', c.key, c.label, countFor(c.key))).join('')}
      </ul>
    </div>
    <div class="filter-group">
      <h3>Format</h3>
      <ul class="filter-list">
        ${button('format', '', 'Any format')}
        ${button('format', 'paper', 'Paper in stock')}
        ${button('format', 'ebook', 'eBook')}
      </ul>
    </div>
    <div class="filter-group">
      <h3>Price from</h3>
      <ul class="filter-list">
        <li><button class="filter-btn" type="button" data-filter="price" data-value="" aria-pressed="${!filters.price}">Any price</button></li>
        <li><button class="filter-btn" type="button" data-filter="price" data-value="lt15" aria-pressed="${filters.price === 'lt15'}">Under $15</button></li>
        <li><button class="filter-btn" type="button" data-filter="price" data-value="15-22" aria-pressed="${filters.price === '15-22'}">$15 to $22</button></li>
        <li><button class="filter-btn" type="button" data-filter="price" data-value="gt22" aria-pressed="${filters.price === 'gt22'}">Over $22</button></li>
      </ul>
    </div>
    <div class="filter-group">
      <h3>Availability</h3>
      <label class="check-row"><input type="checkbox" data-instock ${filters.stock ? 'checked' : ''} /> Paper in stock only</label>
    </div>`
}

function chipsHtml() {
  const chips = []
  if (filters.q) chips.push(['q', `“${filters.q}”`])
  if (filters.category) chips.push(['category', categoryLabel(filters.category)])
  if (filters.format) chips.push(['format', filters.format === 'paper' ? 'Paper' : 'eBook'])
  if (filters.price) chips.push(['price', { lt15: 'Under $15', '15-22': '$15–$22', gt22: 'Over $22' }[filters.price] || filters.price])
  if (filters.stock) chips.push(['stock', 'In stock'])
  if (filters.only === 'deals') chips.push(['only', 'Deals'])
  if (!chips.length) return ''
  return `${chips.map(([key, label]) => `<button class="chip" type="button" data-clear="${key}">${escapeHtml(label)} ${icon('close', 'icon')}</button>`).join('')}
    <button class="chip" type="button" data-clear="all">Clear all ${icon('close', 'icon')}</button>`
}

function render() {
  const state = read()
  const base = baseList(state.books)
  const results = applyFilters(base)

  qs('#filters').innerHTML = filtersHtml(base)
  const panel = qs('#filter-panel')
  if (panel) panel.innerHTML = `${filtersHtml(base)}<button class="btn btn--block" type="button" data-close-filters style="margin-top:22px">Show ${results.length} ${results.length === 1 ? 'book' : 'books'}</button>`

  const title = filters.category ? categoryLabel(filters.category) : filters.only === 'deals' ? 'Deals' : filters.q ? 'Search results' : 'All books'
  const eyebrow = filters.q ? `Search · “${filters.q}”` : filters.only === 'deals' ? 'Paperbacks under $18' : 'Catalogue'
  qs('#page-title').innerHTML = `${escapeHtml(title)} <span class="count">${results.length}</span>`
  qs('#page-eyebrow').textContent = eyebrow
  qs('#chips').innerHTML = chipsHtml()

  qs('#results').innerHTML = results.length
    ? `<div class="book-grid">${results.map(bookCardHtml).join('')}</div>`
    : emptyState('No books match those filters', 'Try a different shelf, format or price — or clear the filters to see all eighteen titles.', '<button class="btn btn--secondary" type="button" data-clear="all">Clear filters</button>')

  syncWishlistButtons()
  syncUrl()
}

document.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-filter]')
  if (btn) {
    const kind = btn.dataset.filter
    const value = btn.dataset.value
    if (kind === 'category') filters.category = value
    if (kind === 'format') filters.format = value
    if (kind === 'price') filters.price = value
    render()
    return
  }
  const clear = event.target.closest('[data-clear]')
  if (clear) {
    const key = clear.dataset.clear
    if (key === 'all') Object.assign(filters, { q: '', category: '', format: '', price: '', stock: false, only: '', sort: 'featured' })
    else if (key === 'stock') filters.stock = false
    else filters[key] = ''
    if (searchInput) searchInput.value = filters.q
    if (sortSelect) sortSelect.value = filters.sort
    render()
  }
})

document.addEventListener('change', (event) => {
  if (event.target.matches('[data-instock]')) {
    filters.stock = event.target.checked
    render()
  }
})

qs('#search-form')?.addEventListener('submit', (event) => {
  event.preventDefault()
  filters.q = searchInput.value.trim()
  render()
})

qs('#sort')?.addEventListener('change', (event) => {
  filters.sort = event.target.value
  render()
})

const panel = qs('#filter-panel')
const backdrop = qs('#filter-backdrop')
function setFiltersOpen(open) {
  panel.classList.toggle('is-open', open)
  backdrop.classList.toggle('is-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
}

qs('#open-filters')?.addEventListener('click', () => setFiltersOpen(true))
backdrop?.addEventListener('click', () => setFiltersOpen(false))
document.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-filters]')) setFiltersOpen(false)
})

render()
