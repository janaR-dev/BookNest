// Shared chrome: header, cart drawer, mobile menu, footer and small HTML helpers.

import { FREE_SHIPPING_AT, money, formatLabel } from './data.js'
import { cartItems, cartCount, cartSubtotal, cartHasPhysical, read, removeLine, setQty, toggleWishlist } from './store.js'

const PATHS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c.7-3.6 3.5-5.4 7-5.4s6.3 1.8 7 5.4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  truck: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17.5" cy="18" r="1.6"/>',
  download: '<path d="M12 4v10M8 10l4 4 4-4"/><path d="M5 18h14"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
  logout: '<path d="M14 5H6v14h8"/><path d="M18 12H10M15 9l3 3-3 3"/>',
  printer: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  star: '<path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8L12 3.6Z"/>',
}

export const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ''}</svg>`

export const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

export const qs = (sel, root = document) => root.querySelector(sel)
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)]
export const param = (name) => new URLSearchParams(location.search).get(name)

export function starsHtml(rating) {
  const filled = Math.round(rating)
  return `<span class="stars" aria-label="${rating} out of 5 stars">${[1, 2, 3, 4, 5]
    .map((i) => `<svg class="icon${i <= filled ? '' : ' off'}" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">${PATHS.star}</svg>`)
    .join('')}</span>`
}

const MOTIFS = {
  waves: (y) => `<path d="M-10 ${y} C 40 ${y - 20}, 70 ${y + 20}, 110 ${y} S 180 ${y - 16}, 215 ${y + 4}"/>`,
  arch: (i) => {
    const w = 46 + i * 34
    const x = 100 - w / 2
    return `<path d="M ${x} 290 V ${150 - i * 6} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 V 290"/>`
  },
  steps: (i) => `<path d="M ${i * 18 - 20} 300 V ${250 - i * 34} H ${i * 18 + 40} V ${216 - i * 34} H ${i * 18 + 100} V ${182 - i * 34} H 220"/>`,
  rule: (i) => `<line x1="0" y1="${18 + i * 24}" x2="200" y2="${18 + i * 24}" opacity="${i % 3 === 0 ? 0.5 : 1}"/>`,
}

function motifSvg(motif) {
  let body = ''
  if (motif === 'waves') body = [34, 66, 98, 130, 162, 194, 226, 258, 290].map(MOTIFS.waves).join('')
  else if (motif === 'arch') body = [0, 1, 2, 3, 4].map(MOTIFS.arch).join('')
  else if (motif === 'steps') body = [0, 1, 2, 3, 4, 5].map(MOTIFS.steps).join('')
  else if (motif === 'rule') body = Array.from({ length: 12 }, (_, i) => MOTIFS.rule(i)).join('')
  else if (motif === 'orbit') {
    body = [28, 54, 80, 106].map((r) => `<circle cx="100" cy="150" r="${r}"/>`).join('')
    body += '<ellipse cx="100" cy="150" rx="118" ry="38" transform="rotate(-24 100 150)"/><circle cx="100" cy="150" r="6" fill="currentColor" stroke="none"/>'
  } else if (motif === 'sun') {
    body = '<circle cx="100" cy="112" r="42"/>'
    body += [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]
      .map((deg) => {
        const rad = (deg * Math.PI) / 180
        return `<line x1="${(100 + Math.cos(rad) * 56).toFixed(1)}" y1="${(112 + Math.sin(rad) * 56).toFixed(1)}" x2="${(100 + Math.cos(rad) * 88).toFixed(1)}" y2="${(112 + Math.sin(rad) * 88).toFixed(1)}"/>`
      })
      .join('')
    body += [168, 190, 212, 234, 256, 278].map((y) => `<line x1="0" y1="${y}" x2="200" y2="${y}"/>`).join('')
  } else {
    body = Array.from({ length: 8 }, (_, i) => `<line x1="${i * 28 + 4}" y1="0" x2="${i * 28 + 4}" y2="300"/>`).join('')
    body += Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 28 + 4}" x2="200" y2="${i * 28 + 4}"/>`).join('')
  }
  return `<svg viewBox="0 0 200 300" fill="none" stroke="currentColor" stroke-width="1.2" preserveAspectRatio="none" aria-hidden="true">${body}</svg>`
}

export function coverHtml(book) {
  const cover = book.cover || { bg: '#3a3f45', ink: '#eee7d8', motif: 'rule' }
  return `<div class="cover" style="background:${cover.bg};color:${cover.ink}">
    <div class="cover__art">${motifSvg(cover.motif)}</div>
    <div class="cover__spine"></div><div class="cover__edge"></div>
    <div class="cover__body">
      <span class="cover__imprint">BookNest</span>
      <div>
        <p class="cover__title">${escapeHtml(book.title)}</p>
        <div class="cover__rule"></div>
        <p class="cover__author">${escapeHtml(book.author)}</p>
      </div>
    </div>
  </div>`
}

export const statusPill = (status) => `<span class="status-pill ${String(status).toLowerCase()}">${escapeHtml(status)}</span>`

export const formatWord = (format) => formatLabel[format] || format

const NAV = [
  { href: 'books.html', label: 'Books', page: 'books' },
  { href: 'books.html?only=deals', label: 'Deals', page: 'deals' },
  { href: 'account.html', label: 'Account', page: 'account' },
  { href: 'admin.html', label: 'Admin', page: 'admin' },
]

export function mountChrome(page) {
  const header = document.getElementById('site-header')
  const footer = document.getElementById('site-footer')
  if (header) header.innerHTML = headerHtml(page)
  if (footer) footer.innerHTML = footerHtml()
  if (!document.getElementById('cart-drawer')) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="drawer-backdrop" data-close-cart></div>
       <aside class="cart-drawer" id="cart-drawer" aria-label="Shopping bag" aria-hidden="true">
         <div class="drawer-head"><h2>Your bag <span class="n" id="drawer-count"></span></h2>
           <button class="icon-btn" type="button" data-close-cart aria-label="Close bag">${icon('close')}</button>
         </div>
         <div id="drawer-content" style="display:flex;flex-direction:column;flex:1;min-height:0"></div>
       </aside>
       <div class="toast" id="toast" role="status" aria-live="polite"></div>`,
    )
  }
  bindChrome()
  renderDrawer()
  updateHeaderCounts()
  window.addEventListener('store:change', () => {
    updateHeaderCounts()
    renderDrawer()
  })
}

function headerHtml(page) {
  const links = NAV.map((l) => `<a href="${l.href}" ${l.page === page ? 'aria-current="page"' : ''}>${l.label}</a>`).join('')
  return `<div class="topbar">Free paper shipping on orders over ${money(FREE_SHIPPING_AT)} · eBooks delivered instantly</div>
  <header class="site-header" id="sticky-header">
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="BookNest home">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v18H6.5A1.5 1.5 0 0 1 5 19.5z"/><path d="M8 3v18M11 8h4"/></svg>
        <span>BookNest</span>
      </a>
      <nav class="main-nav" aria-label="Main">${links}</nav>
      <form class="header-search" action="books.html" role="search">
        ${icon('search')}
        <input type="search" name="q" placeholder="Search titles, authors, ISBN" aria-label="Search books">
      </form>
      <div class="header-actions">
        <a class="icon-btn" href="account.html?tab=wishlist" aria-label="Wishlist">
          ${icon('heart')}<span class="count-badge hide" data-wish-count></span>
        </a>
        <a class="icon-btn" href="account.html" aria-label="Account">${icon('user')}</a>
        <button class="icon-btn" type="button" data-open-cart aria-label="Open bag">
          ${icon('bag')}<span class="count-badge hide" data-cart-count></span>
        </button>
        <button class="icon-btn nav-toggle" type="button" data-open-menu aria-label="Menu">${icon('menu')}</button>
      </div>
    </div>
  </header>
  <div class="menu-backdrop" data-close-menu></div>
  <aside class="mobile-menu" id="mobile-menu" aria-label="Menu" aria-hidden="true">
    <div class="spread">
      <a class="brand" href="index.html"><span>BookNest</span></a>
      <button class="icon-btn" type="button" data-close-menu aria-label="Close menu">${icon('close')}</button>
    </div>
    <form class="header-search" action="books.html" role="search" style="display:block;margin:18px 0 0;max-width:none">
      ${icon('search')}<input type="search" name="q" placeholder="Search books" aria-label="Search books">
    </form>
    <ul>${NAV.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join('')}</ul>
    <div class="menu-secondary">
      <a href="account.html?tab=wishlist">Saved books</a>
      <a href="account.html?tab=orders">Track an order</a>
      <a href="books.html?format=ebook">eBooks</a>
    </div>
  </aside>`
}

function footerHtml() {
  const cats = [
    ['Fiction', 'fiction'],
    ['Mystery', 'mystery'],
    ['Sci-Fi & Fantasy', 'scifi'],
    ['History', 'history'],
    ['Poetry', 'poetry'],
  ]
  return `<footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="index.html"><span>BookNest</span></a>
          <p>An independent bookshop for paper and pixels. Six categories, honest summaries, and a shelf that remembers what you saved.</p>
        </div>
        <div class="footer-col">
          <h4>Shop</h4>
          <ul><li><a href="books.html">All books</a></li>${cats.map(([label, key]) => `<li><a href="books.html?category=${key}">${label}</a></li>`).join('')}</ul>
        </div>
        <div class="footer-col">
          <h4>Your account</h4>
          <ul>
            <li><a href="account.html?tab=orders">Orders & tracking</a></li>
            <li><a href="account.html?tab=wishlist">Saved books</a></li>
            <li><a href="account.html?tab=returns">Returns</a></li>
            <li><a href="admin.html">Shop admin</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Help</h4>
          <ul>
            <li><a href="books.html?format=ebook">eBook delivery</a></li>
            <li><a href="books.html?format=paper">Shipping options</a></li>
            <li><a href="account.html?tab=orders">Track an order</a></li>
            <li><a href="account.html">Sign in</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© ${new Date().getFullYear()} BookNest. A front-end demo — orders, reviews and stock stay in your browser.</p>
        <div class="footer-pay"><span class="pay-tag">VISA</span><span class="pay-tag">Mastercard</span><span class="pay-tag">PayPal</span><span class="pay-tag">Apple Pay</span></div>
      </div>
    </div>
  </footer>`
}

function bindChrome() {
  document.addEventListener('click', (event) => {
    const openCart = event.target.closest('[data-open-cart]')
    if (openCart) {
      event.preventDefault()
      setCartOpen(true)
      return
    }
    if (event.target.closest('[data-close-cart]')) {
      setCartOpen(false)
      return
    }
    if (event.target.closest('[data-open-menu]')) {
      toggleMenu(true)
      return
    }
    if (event.target.closest('[data-close-menu]')) {
      toggleMenu(false)
      return
    }
    const inc = event.target.closest('[data-cart-inc]')
    if (inc) {
      const { slug, format } = inc.dataset
      const line = cartItems().find((l) => l.slug === slug && l.format === format)
      if (line) setQty(slug, format, line.qty + 1)
      return
    }
    const dec = event.target.closest('[data-cart-dec]')
    if (dec) {
      const { slug, format } = dec.dataset
      const line = cartItems().find((l) => l.slug === slug && l.format === format)
      if (line) setQty(slug, format, line.qty - 1)
      return
    }
    const remove = event.target.closest('[data-cart-remove]')
    if (remove) {
      removeLine(remove.dataset.slug, remove.dataset.format)
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setCartOpen(false)
      toggleMenu(false)
    }
  })

  window.addEventListener('scroll', () => {
    const header = document.getElementById('sticky-header')
    if (header) header.classList.toggle('is-stuck', window.scrollY > 8)
  })
}

function toggleMenu(open) {
  const menu = document.getElementById('mobile-menu')
  const backdrop = document.querySelector('.menu-backdrop')
  if (!menu || !backdrop) return
  menu.classList.toggle('is-open', open)
  backdrop.classList.toggle('is-open', open)
  menu.setAttribute('aria-hidden', String(!open))
  document.body.style.overflow = open ? 'hidden' : ''
}

export function setCartOpen(open) {
  const drawer = document.getElementById('cart-drawer')
  const backdrop = document.querySelector('.drawer-backdrop')
  if (!drawer || !backdrop) return
  drawer.classList.toggle('is-open', open)
  backdrop.classList.toggle('is-open', open)
  drawer.setAttribute('aria-hidden', String(!open))
  document.body.style.overflow = open && !document.getElementById('mobile-menu')?.classList.contains('is-open') ? 'hidden' : ''
}

function updateHeaderCounts() {
  const state = read()
  const count = cartCount(state)
  const wish = state.wishlist.length
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(count)
    el.classList.toggle('hide', count === 0)
  })
  document.querySelectorAll('[data-wish-count]').forEach((el) => {
    el.textContent = String(wish)
    el.classList.toggle('hide', wish === 0)
  })
}

export function renderDrawer() {
  const wrap = document.getElementById('drawer-content')
  if (!wrap) return
  const state = read()
  const items = cartItems(state)
  const countEl = document.getElementById('drawer-count')
  if (countEl) countEl.textContent = items.length ? String(items.reduce((n, l) => n + l.qty, 0)) : ''

  if (!items.length) {
    wrap.innerHTML = `<div class="drawer-empty">
      ${icon('bag', 'icon')}
      <h3>Nothing here yet</h3>
      <p class="small muted">Paper or pixels — pick something good.</p>
      <a class="btn btn--secondary" href="books.html" style="margin-top:18px">Browse the shelves</a>
    </div>`
    return
  }

  const subtotal = cartSubtotal(state)
  const physical = cartHasPhysical(state)
  const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_AT) * 100)

  const lines = items
    .map((l) => {
      const option = l.book.formats.find((f) => f.format === l.format)
      const cap = l.format === 'ebook' ? 99 : option ? option.stock : 0
      return `<div class="cart-line">
        <a class="cart-line__cover" href="book.html?id=${encodeURIComponent(l.slug)}">${coverHtml(l.book)}</a>
        <div class="cart-line__body">
          <div class="spread" style="gap:8px;align-items:flex-start">
            <div style="min-width:0">
              <a class="cart-line__title" href="book.html?id=${encodeURIComponent(l.slug)}">${escapeHtml(l.book.title)}</a>
              <p class="cart-line__sub">${formatWord(l.format)}</p>
            </div>
            <span class="cart-line__price">${money(l.unit * l.qty)}</span>
          </div>
          <div class="cart-line__foot">
            <span class="qty-sm">
              <button type="button" data-cart-dec data-slug="${escapeHtml(l.slug)}" data-format="${l.format}" aria-label="Decrease quantity" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
              <span>${l.qty}</span>
              <button type="button" data-cart-inc data-slug="${escapeHtml(l.slug)}" data-format="${l.format}" aria-label="Increase quantity" ${l.qty >= cap ? 'disabled' : ''}>+</button>
            </span>
            <button class="linkish" type="button" data-cart-remove data-slug="${escapeHtml(l.slug)}" data-format="${l.format}">Remove</button>
          </div>
        </div>
      </div>`
    })
    .join('')

  wrap.innerHTML = `
    <div class="ship-progress">
      <p>${physical ? (remaining > 0 ? `${money(remaining)} away from free paper shipping` : 'Free paper shipping unlocked') : 'eBooks are ready the moment you order.'}</p>
      ${physical ? `<div class="progress"><span style="width:${progress}%"></span></div>` : ''}
    </div>
    <div class="cart-lines">${lines}</div>
    <div class="drawer-foot">
      <div class="spread" style="font-size:14px">
        <span class="muted">Subtotal</span><span class="tabnums">${money(subtotal)}</span>
      </div>
      <p class="small faint" style="margin-top:3px">Shipping and codes are applied at checkout.</p>
      <a class="btn btn--block" href="checkout.html" style="margin-top:14px">Checkout</a>
      <button class="btn btn--ghost btn--block" style="margin-top:4px" type="button" data-close-cart>Keep browsing</button>
    </div>`
}

let toastTimer
export function toast(message) {
  const el = document.getElementById('toast')
  if (!el) return
  el.innerHTML = `${icon('check', 'icon')}<span>${escapeHtml(message)}</span>`
  el.classList.add('is-visible')
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => el.classList.remove('is-visible'), 2400)
}

export function syncWishlistButtons() {
  const saved = new Set(read().wishlist)
  document.querySelectorAll('[data-wish]').forEach((btn) => {
    const on = saved.has(btn.dataset.wish)
    btn.classList.toggle('is-saved', on)
    btn.setAttribute('aria-pressed', String(on))
    btn.setAttribute('aria-label', `${on ? 'Remove' : 'Save'} ${btn.dataset.title || 'book'} ${on ? 'from' : 'to'} wishlist`)
    const svg = btn.querySelector('path')
    if (svg) svg.setAttribute('fill', on ? 'currentColor' : 'none')
  })
}

export function bindWishlistButtons(onChange) {
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-wish]')
    if (!btn) return
    event.preventDefault()
    toggleWishlist(btn.dataset.wish)
    syncWishlistButtons()
    toast(read().wishlist.includes(btn.dataset.wish) ? 'Saved to your wishlist' : 'Removed from wishlist')
    if (onChange) onChange()
  })
}

export function emptyState(title, body, action = '') {
  return `<div class="result-empty"><h3>${escapeHtml(title)}</h3>${body ? `<p class="muted" style="margin-top:8px">${body}</p>` : ''}${action ? `<div style="margin-top:20px">${action}</div>` : ''}</div>`
}

