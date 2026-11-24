// Browser-only data store. State is kept in localStorage and a `store:change`
// event lets the header and cart drawer react after any mutation.

import { calcTotals, seedBooks, seedOrders, seedReturns, statusNote } from './data.js'

const KEY = 'booknest.v1'

export const DEMO_EMAIL = 'demo@booknest.test'
export const DEMO_PASSWORD = 'shelf1234'

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

function fresh() {
  return { books: seedBooks, orders: seedOrders, returns: seedReturns, cart: [], wishlist: [], user: null }
}

export function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw)
      if (saved && Array.isArray(saved.books) && Array.isArray(saved.orders)) return saved
    }
  } catch {
    /* fall through to seeds */
  }
  const base = fresh()
  try {
    localStorage.setItem(KEY, JSON.stringify(base))
  } catch {
    /* storage unavailable */
  }
  return base
}

function update(fn) {
  const state = read()
  const next = fn(state) || state
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignore quota errors in the demo */
  }
  window.dispatchEvent(new CustomEvent('store:change'))
  return next
}

const bookBySlug = (state, slug) => state.books.find((b) => b.slug === slug)

export function cartItems(state = read()) {
  return state.cart.flatMap((line) => {
    const book = bookBySlug(state, line.slug)
    if (!book) return []
    const option = book.formats.find((f) => f.format === line.format)
    if (!option) return []
    return [{ ...line, book, unit: option.price }]
  })
}

export function cartSubtotal(state = read()) {
  return Math.round(cartItems(state).reduce((n, l) => n + l.unit * l.qty, 0) * 100) / 100
}

export const cartHasPhysical = (state = read()) => cartItems(state).some((l) => l.format !== 'ebook')
export const cartCount = (state = read()) => cartItems(state).reduce((n, l) => n + l.qty, 0)

export function addToCart(slug, format, qty = 1) {
  update((state) => {
    const book = bookBySlug(state, slug)
    const option = book && book.formats.find((f) => f.format === format)
    if (!book || !option) return state
    const cap = format === 'ebook' ? 99 : option.stock
    if (cap <= 0) return state
    const existing = state.cart.find((l) => l.slug === slug && l.format === format)
    if (existing) existing.qty = Math.min(cap, existing.qty + qty)
    else state.cart.push({ slug, format, qty: Math.min(cap, qty) })
    return state
  })
}

export function setQty(slug, format, qty) {
  update((state) => {
    const book = bookBySlug(state, slug)
    const option = book && book.formats.find((f) => f.format === format)
    if (!option) return state
    const cap = format === 'ebook' ? 99 : option.stock
    if (qty <= 0 || cap <= 0) state.cart = state.cart.filter((l) => !(l.slug === slug && l.format === format))
    else {
      const line = state.cart.find((l) => l.slug === slug && l.format === format)
      if (line) line.qty = Math.min(cap, qty)
    }
    return state
  })
}

export function removeLine(slug, format) {
  update((state) => {
    state.cart = state.cart.filter((l) => !(l.slug === slug && l.format === format))
    return state
  })
}

export function toggleWishlist(slug) {
  update((state) => {
    state.wishlist = state.wishlist.includes(slug) ? state.wishlist.filter((s) => s !== slug) : [...state.wishlist, slug]
    return state
  })
}

export function signIn(name, email, extra = {}) {
  update((state) => {
    state.user = { name: name || 'Reader', email: String(email).trim().toLowerCase(), ...extra }
    return state
  })
}

export function signOut() {
  update((state) => {
    state.user = null
    return state
  })
}

export function updateUser(patch) {
  update((state) => {
    if (state.user) state.user = { ...state.user, ...patch }
    return state
  })
}

export function placeOrder({ name, email, address, shipping, payment, promo }) {
  const before = read()
  const items = cartItems(before).map((l) => ({
    slug: l.slug,
    title: l.book.title,
    author: l.book.author,
    format: l.format,
    price: l.unit,
    qty: l.qty,
  }))
  const subtotal = Math.round(items.reduce((n, i) => n + i.price * i.qty, 0) * 100) / 100
  const totals = calcTotals(subtotal, items.some((i) => i.format !== 'ebook'), shipping, promo)
  const now = new Date().toISOString()
  const order = {
    id: uid('BK'),
    invoice: `INV-${new Date().getFullYear()}-${1041 + before.orders.length}`,
    createdAt: now,
    email: String(email).trim().toLowerCase(),
    name: String(name).trim(),
    address,
    items,
    subtotal,
    discount: totals.discount,
    shipping: totals.shipping,
    total: totals.total,
    shippingMethod: shipping,
    payment,
    promo: promo ? promo.code : undefined,
    status: 'Processing',
    tracking: [{ at: now, label: statusNote.Processing, note: 'Payment confirmed' }],
  }

  update((state) => {
    state.orders.unshift(order)
    state.cart = []
    state.books = state.books.map((book) => {
      const lines = items.filter((i) => i.slug === book.slug && i.format !== 'ebook')
      if (!lines.length) return book
      return {
        ...book,
        formats: book.formats.map((f) => {
          const line = lines.find((i) => i.format === f.format)
          return line ? { ...f, stock: Math.max(0, f.stock - line.qty) } : f
        }),
      }
    })
    return state
  })

  return order
}

export function updateOrderStatus(id, status, note) {
  update((state) => {
    const order = state.orders.find((o) => o.id === id)
    if (order) {
      order.status = status
      order.tracking.push({ at: new Date().toISOString(), label: statusNote[status], note: note || undefined })
    }
    return state
  })
}

export function addReview(slug, rating, body, name) {
  const review = {
    id: `r-${Date.now().toString(36)}`,
    name: String(name).trim() || 'A reader',
    rating,
    date: new Date().toISOString(),
    body: String(body).trim(),
  }
  update((state) => {
    const book = bookBySlug(state, slug)
    if (book) {
      const count = book.reviewCount + 1
      book.rating = Math.round(((book.rating * book.reviewCount + rating) / count) * 10) / 10
      book.reviewCount = count
      book.reviews.unshift(review)
    }
    return state
  })
}

export function requestReturn({ orderId, slug, title, reason, note }) {
  update((state) => {
    state.returns.unshift({
      id: `RT-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId,
      slug,
      title,
      reason,
      note: String(note || '').trim() || undefined,
      status: 'Requested',
      createdAt: new Date().toISOString(),
    })
    return state
  })
}

export function upsertBook(book) {
  update((state) => {
    const index = state.books.findIndex((b) => b.slug === book.slug)
    if (index >= 0) state.books[index] = book
    else state.books.unshift(book)
    return state
  })
}

export function deleteBook(slug) {
  update((state) => {
    state.books = state.books.filter((b) => b.slug !== slug)
    state.cart = state.cart.filter((l) => l.slug !== slug)
    state.wishlist = state.wishlist.filter((s) => s !== slug)
    return state
  })
}

export function updateStock(slug, format, stock) {
  update((state) => {
    const book = bookBySlug(state, slug)
    const option = book && book.formats.find((f) => f.format === format)
    if (option) option.stock = Math.max(0, Math.floor(Number(stock) || 0))
    return state
  })
}

export const myOrders = (state, email) => state.orders.filter((o) => email && o.email === String(email).toLowerCase())
