// Mock catalogue, promotions, shipping and seed orders.
// Books and categories live in their own object files; everything else is here.
// All data stays in the browser; no server calls are made.

import { categories, categoryLabel } from './data/categories.js'
import { seedBooks } from './data/books.js'

export { categories, categoryLabel, seedBooks }
export { coverFallback } from './covers.js'

export const formatLabel = { paperback: 'Paperback', hardcover: 'Hardcover', ebook: 'eBook' }
export const LOW_STOCK = 4

export const cheapest = (book) => Math.min(...book.formats.map((f) => f.price))
export const totalStock = (book) => book.formats.filter((f) => f.format !== 'ebook').reduce((n, f) => n + f.stock, 0)

export const money = (value) => `$${Number(value).toFixed(2)}`
export const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export const FREE_SHIPPING_AT = 35

export const shippingMethods = [
  { id: 'standard', label: 'Standard', detail: '3–5 business days', price: 4.95, freeOver: FREE_SHIPPING_AT },
  { id: 'express', label: 'Express', detail: '1–2 business days', price: 9.95 },
  { id: 'pickup', label: 'Collect in store', detail: 'Ready in 2 hours · 14 Lantern St', price: 0 },
]

export const promos = [
  { code: 'READMORE', label: '15% off your order', kind: 'percent', value: 15, min: 0 },
  { code: 'FIRST5', label: '$5 off orders over $25', kind: 'fixed', value: 5, min: 25 },
  { code: 'FREESHIP', label: 'Free standard shipping', kind: 'shipping', value: 0, min: 0 },
]

export function findPromo(input, subtotal) {
  const code = String(input || '').trim().toUpperCase()
  if (!code) return { error: 'Enter a code.' }
  const promo = promos.find((p) => p.code === code)
  if (!promo) return { error: 'That code is not valid.' }
  if (subtotal < promo.min) return { error: `Spend ${money(promo.min)} to use ${promo.code}.` }
  return { promo }
}

export function shippingCost(method, subtotal, freeShipping = false) {
  const option = shippingMethods.find((m) => m.id === method)
  if (!option) return 0
  if (option.id === 'standard' && (freeShipping || subtotal >= FREE_SHIPPING_AT)) return 0
  return option.price
}

export function calcTotals(subtotal, isPhysical, method, promo) {
  let discount = 0
  if (promo && promo.kind === 'percent') discount = Math.round(subtotal * promo.value) / 100
  if (promo && promo.kind === 'fixed') discount = Math.min(promo.value, subtotal)
  const shipping = isPhysical ? shippingCost(method, subtotal - discount, promo && promo.kind === 'shipping') : 0
  return { discount, shipping, total: Math.round((subtotal - discount + shipping) * 100) / 100 }
}

export const orderStatuses = ['Processing', 'Packed', 'Shipped', 'Delivered']

export const statusNote = {
  Processing: 'Order received',
  Packed: 'Packed at our warehouse',
  Shipped: 'Handed to the carrier',
  Delivered: 'Delivered',
  Cancelled: 'Order cancelled',
}

export const returnReasons = ['Arrived damaged', 'Not the edition I wanted', 'Changed my mind', 'Duplicate order', 'Other']

export const seedOrders = [
  {
    id: 'BK-7F2K1',
    invoice: 'INV-2026-1041',
    createdAt: '2026-10-29T10:12:00.000Z',
    email: 'demo@booknest.test',
    name: 'Alex Moreau',
    address: { line1: '14 Lantern Street, Apt 3', city: 'Portland', postcode: '97209', country: 'United States' },
    items: [
      { slug: 'salt-harvest', title: 'The Salt Harvest', author: 'Mira Delacroix', format: 'paperback', price: 18.99, qty: 1 },
      { slug: 'quiet-ledger', title: 'The Quiet Ledger', author: 'R. K. Marlowe', format: 'ebook', price: 8.99, qty: 1 },
    ],
    subtotal: 27.98,
    discount: 0,
    shipping: 4.95,
    total: 32.93,
    shippingMethod: 'standard',
    payment: 'Visa ending 4242',
    status: 'Delivered',
    tracking: [
      { at: '2026-10-29T10:12:00.000Z', label: 'Order received', note: 'Payment confirmed' },
      { at: '2026-10-30T08:40:00.000Z', label: 'Packed at our warehouse' },
      { at: '2026-10-31T15:05:00.000Z', label: 'Handed to the carrier', note: 'Northline Deliveries · Tracking 4NL-8821' },
      { at: '2026-11-04T11:32:00.000Z', label: 'Delivered', note: 'Left with recipient' },
    ],
  },
  {
    id: 'BK-9Q4X2',
    invoice: 'INV-2026-1078',
    createdAt: '2026-11-20T18:22:00.000Z',
    email: 'demo@booknest.test',
    name: 'Alex Moreau',
    address: { line1: '14 Lantern Street, Apt 3', city: 'Portland', postcode: '97209', country: 'United States' },
    items: [
      { slug: 'cartographer-of-mars', title: 'The Cartographer of Mars', author: 'Ada Nwosu', format: 'hardcover', price: 27.0, qty: 1 },
      { slug: 'field-notes-for-rain', title: 'Field Notes for Rain', author: 'Noor Haddad', format: 'paperback', price: 16.0, qty: 1 },
    ],
    subtotal: 43.0,
    discount: 0,
    shipping: 0,
    total: 43.0,
    shippingMethod: 'standard',
    payment: 'Visa ending 4242',
    status: 'Shipped',
    tracking: [
      { at: '2026-11-20T18:22:00.000Z', label: 'Order received', note: 'Payment confirmed' },
      { at: '2026-11-21T09:15:00.000Z', label: 'Packed at our warehouse' },
      { at: '2026-11-22T07:48:00.000Z', label: 'Handed to the carrier', note: 'Northline Deliveries · Tracking 4NL-9107' },
    ],
  },
]

export const seedReturns = [
  {
    id: 'RT-1042',
    orderId: 'BK-7F2K1',
    slug: 'salt-harvest',
    title: 'The Salt Harvest',
    reason: 'Arrived damaged',
    note: 'Corner of the cover was crushed in transit.',
    status: 'Approved',
    createdAt: '2026-11-06T09:10:00.000Z',
  },
]
