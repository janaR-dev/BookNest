import { bookCardHtml, bindCards } from '../card.js'
import { formatDate, money, returnReasons } from '../data.js'
import { DEMO_EMAIL, DEMO_PASSWORD, addToCart, myOrders, read, requestReturn, signIn, signOut, updateUser } from '../store.js'
import {
  bindWishlistButtons,
  coverHtml,
  emptyState,
  escapeHtml,
  icon,
  mountChrome,
  param,
  qs,
  qsa,
  statusPill,
  syncWishlistButtons,
  toast,
} from '../ui.js'

mountChrome('account')
bindCards()

const page = qs('#page')
const state = read()
const user = state.user
const validTabs = ['orders', 'wishlist', 'returns', 'profile']
let currentTab = validTabs.includes(param('tab')) ? param('tab') : 'orders'

function authView() {
  page.innerHTML = `<div class="page-head">
      <p class="eyebrow">Your account</p>
      <h1>Sign in, or start a shelf</h1>
    </div>
    <div class="auth-grid">
      <div class="auth-card">
        <h2>Welcome back</h2>
        <p class="sub">Orders, tracking, saved books and returns in one place.</p>
        <form id="signin-form" novalidate>
          <div class="field"><label for="si-email">Email</label><input class="input" id="si-email" type="email" autocomplete="email" placeholder="you@example.com" required /></div>
          <div class="field"><label for="si-pass">Password</label><input class="input" id="si-pass" type="password" autocomplete="current-password" placeholder="••••••••" required /></div>
          <div id="si-error"></div>
          <button class="btn" type="submit">Sign in</button>
        </form>
        <div class="demo-account">
          Demo account: <code>${DEMO_EMAIL}</code> · <code>${DEMO_PASSWORD}</code><br />
          It comes with two orders, one delivered and one in transit.
          <div style="margin-top:10px"><button class="rowbtn" type="button" id="demo-signin">Use the demo account</button></div>
        </div>
      </div>
      <div class="auth-card">
        <h2>Create an account</h2>
        <p class="sub">A local demo account — no email is sent and nothing leaves this browser.</p>
        <form id="signup-form" novalidate>
          <div class="field"><label for="su-name">Name</label><input class="input" id="su-name" autocomplete="name" placeholder="Your name" required /></div>
          <div class="field"><label for="su-email">Email</label><input class="input" id="su-email" type="email" autocomplete="email" placeholder="you@example.com" required /></div>
          <div class="field"><label for="su-pass">Password</label><input class="input" id="su-pass" type="password" autocomplete="new-password" placeholder="At least 6 characters" required /></div>
          <div id="su-error"></div>
          <button class="btn" type="submit">Create account</button>
        </form>
        <p class="help" style="margin-top:12px">Already ordered as a guest? Sign in with the same email to see those orders.</p>
      </div>
    </div>`
  bindAuth()
}

function bindAuth() {
  qs('#signin-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const email = qs('#si-email').value.trim().toLowerCase()
    const pass = qs('#si-pass').value
    if (!email || !pass) {
      qs('#si-error').innerHTML = '<p class="error">Enter your email and password.</p>'
      return
    }
    if (email === DEMO_EMAIL && pass !== DEMO_PASSWORD) {
      qs('#si-error').innerHTML = '<p class="error">The demo password is shelf1234.</p>'
      return
    }
    const existing = email === DEMO_EMAIL ? { name: 'Alex Moreau', line1: '14 Lantern Street, Apt 3', city: 'Portland', postcode: '97209' } : read().user?.email === email ? read().user : {}
    signIn(existing.name || email.split('@')[0], email, existing)
    window.location.href = `account.html?tab=${currentTab}`
  })

  qs('#signup-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const name = qs('#su-name').value.trim()
    const email = qs('#su-email').value.trim().toLowerCase()
    const pass = qs('#su-pass').value
    if (!name || !email || pass.length < 6) {
      qs('#su-error').innerHTML = '<p class="error">Add a name, a valid email and a password of six characters.</p>'
      return
    }
    signIn(name, email)
    window.location.href = 'account.html?tab=orders'
  })

  qs('#demo-signin')?.addEventListener('click', () => {
    signIn('Alex Moreau', DEMO_EMAIL, { line1: '14 Lantern Street, Apt 3', city: 'Portland', postcode: '97209' })
    window.location.href = 'account.html?tab=orders'
  })
}

function ordersPanel() {
  const orders = myOrders(read(), user.email)
  if (!orders.length) {
    return emptyState('No orders yet', 'Place an order and it will appear here with tracking and a printable receipt.', '<a class="btn" href="books.html">Browse the shelves</a>')
  }
  return orders
    .map((order) => {
      const delivered = order.status === 'Delivered'
      const bookCount = order.items.reduce((n, i) => n + i.qty, 0)
      return `<article class="order-card">
        <div class="order-head">
          <span class="id">${escapeHtml(order.id)}</span>
          <span class="meta">${formatDate(order.createdAt)} · ${bookCount} ${bookCount === 1 ? 'book' : 'books'} · ${money(order.total)}</span>
          ${statusPill(order.status)}
        </div>
        <div class="order-body">
          <div class="order-covers">
            ${order.items
              .map((item) => {
                const book = read().books.find((b) => b.slug === item.slug)
                return book ? coverHtml(book) : ''
              })
              .join('')}
          </div>
          <div class="order-info">
            <strong>${escapeHtml(order.items.map((i) => i.title).join(', '))}</strong>
            <p>${escapeHtml(order.tracking[order.tracking.length - 1]?.label || 'Processing')}</p>
          </div>
          <div class="order-actions">
            <a class="btn btn--secondary" href="order.html?id=${encodeURIComponent(order.id)}">Receipt</a>
            <button class="btn btn--secondary" type="button" data-reorder="${escapeHtml(order.id)}">Reorder</button>
            ${
              delivered
                ? `<a class="btn btn--secondary" href="account.html?tab=returns&order=${encodeURIComponent(order.id)}">Return</a>`
                : `<a class="btn btn--secondary" href="order.html?id=${encodeURIComponent(order.id)}#tracking">Track</a>`
            }
          </div>
        </div>
      </article>`
    })
    .join('')
}

function wishlistPanel() {
  const saved = read().wishlist.map((slug) => read().books.find((b) => b.slug === slug)).filter(Boolean)
  if (!saved.length) {
    return emptyState('Nothing saved yet', 'Tap the heart on any book and it will be waiting here.', '<a class="btn" href="books.html">Find something to save</a>')
  }
  return `<div class="wish-list">${saved.map(bookCardHtml).join('')}</div>`
}

function returnsPanel() {
  const returns = read().returns
  const orders = myOrders(read(), user.email).filter((o) => o.status === 'Delivered' && o.items.some((i) => i.format !== 'ebook'))
  const preselect = param('order')
  const selected = orders.find((o) => o.id === preselect) || orders[0]

  const form = selected
    ? `<form class="checkout-block" id="return-form" style="margin-bottom:20px" novalidate>
        <h2>Request a return</h2>
        <p class="small muted" style="margin-top:4px">Paper copies only, within 30 days of delivery.</p>
        <div class="form-grid form-grid--2" style="margin-top:16px">
          <div class="field"><label for="rt-order">Order</label>
            <select class="select" id="rt-order">
              ${orders.map((o) => `<option value="${escapeHtml(o.id)}" ${o.id === selected.id ? 'selected' : ''}>${escapeHtml(o.id)} · ${formatDate(o.createdAt)}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label for="rt-item">Book</label>
            <select class="select" id="rt-item">
              ${selected.items
                .filter((i) => i.format !== 'ebook')
                .map((i) => `<option value="${escapeHtml(i.slug)}">${escapeHtml(i.title)} · ${escapeHtml(i.format)}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="form-grid form-grid--2" style="margin-top:14px">
          <div class="field"><label for="rt-reason">Reason</label>
            <select class="select" id="rt-reason">${returnReasons.map((r) => `<option>${escapeHtml(r)}</option>`).join('')}</select>
          </div>
          <div class="field"><label for="rt-note">Anything we should know? (optional)</label><input class="input" id="rt-note" maxlength="160" placeholder="e.g. the dust jacket is torn" /></div>
        </div>
        <div class="form-actions"><button class="btn" type="submit">Submit return request</button><span class="help">A demo label is generated instantly.</span></div>
      </form>`
    : `<div class="panel" style="margin-bottom:20px"><h2>No delivered orders yet</h2><p class="small muted" style="margin-top:6px">Returns open once an order has been delivered. You can request one from your order history too.</p></div>`

  const list = returns.length
    ? returns
        .map(
          (r) => `<div class="return-row">
            <div class="t"><strong>${escapeHtml(r.title)}</strong><span>${escapeHtml(r.id)} · order ${escapeHtml(r.orderId)} · ${formatDate(r.createdAt)}</span></div>
            <span class="small muted">${escapeHtml(r.reason)}</span>
            ${statusPill(r.status)}
          </div>`,
        )
        .join('')
    : '<p class="small muted">No return requests yet.</p>'

  return `${form}
    <div class="checkout-block">
      <div class="block-head"><h2>Your return requests</h2><span class="small faint">${returns.length} total</span></div>
      ${list}
      <p class="help" style="margin-top:14px">Approved returns are refunded to the original payment method within 5 working days.</p>
    </div>`
}

function profilePanel() {
  return `<div class="checkout-block" style="max-width:640px">
    <h2>Your details</h2>
    <p class="small muted" style="margin-top:4px">Used to prefill checkout. Stored only in this browser.</p>
    <form id="profile-form" novalidate>
      <div class="form-grid form-grid--2" style="margin-top:16px">
        <div class="field"><label for="pf-name">Name</label><input class="input" id="pf-name" value="${escapeHtml(user.name)}" required /></div>
        <div class="field"><label for="pf-email">Email</label><input class="input" id="pf-email" type="email" value="${escapeHtml(user.email)}" required /></div>
      </div>
      <div class="field" style="margin-top:14px"><label for="pf-line1">Street address</label><input class="input" id="pf-line1" value="${escapeHtml(user.line1 || '')}" /></div>
      <div class="form-grid form-grid--3" style="margin-top:14px">
        <div class="field"><label for="pf-city">City</label><input class="input" id="pf-city" value="${escapeHtml(user.city || '')}" /></div>
        <div class="field"><label for="pf-postcode">Postcode</label><input class="input" id="pf-postcode" value="${escapeHtml(user.postcode || '')}" /></div>
      </div>
      <div class="form-actions"><button class="btn" type="submit">Save details</button><button class="btn btn--secondary" type="button" id="sign-out">Sign out</button></div>
    </form>
  </div>`
}

function signedInView() {
  const orders = myOrders(read(), user.email)
  const saved = read().wishlist.length
  const returns = read().returns.length

  page.innerHTML = `<div class="page-head">
      <p class="eyebrow">Your account</p>
      <h1>Hello, ${escapeHtml(user.name.split(' ')[0])}</h1>
    </div>
    <div class="profile-card" style="margin-bottom:26px">
      <span class="avatar">${escapeHtml((user.name[0] || 'R').toUpperCase())}</span>
      <div>
        <h2>${escapeHtml(user.name)}</h2>
        <p class="email">${escapeHtml(user.email)}</p>
      </div>
      <div class="row wrap" style="margin-left:auto;gap:8px">
        <span class="small muted">${orders.length} orders · ${saved} saved · ${returns} returns</span>
        <button class="btn btn--secondary btn--sm" type="button" id="profile-signout">${icon('logout')} Sign out</button>
      </div>
    </div>

    <div class="tabs" role="tablist">
      ${[['orders', 'Orders', orders.length], ['wishlist', 'Wishlist', saved], ['returns', 'Returns', returns], ['profile', 'Profile']]
        .map(
          ([key, label, count]) =>
            `<button class="tab ${currentTab === key ? 'is-active' : ''}" type="button" role="tab" data-tab="${key}" aria-selected="${currentTab === key}">${label}${count !== undefined ? `<span class="n">${count}</span>` : ''}</button>`,
        )
        .join('')}
    </div>

    <div class="tab-panel ${currentTab === 'orders' ? 'is-active' : ''}" id="panel-orders">${ordersPanel()}</div>
    <div class="tab-panel ${currentTab === 'wishlist' ? 'is-active' : ''}" id="panel-wishlist">${wishlistPanel()}</div>
    <div class="tab-panel ${currentTab === 'returns' ? 'is-active' : ''}" id="panel-returns">${returnsPanel()}</div>
    <div class="tab-panel ${currentTab === 'profile' ? 'is-active' : ''}" id="panel-profile">${profilePanel()}</div>`

  syncWishlistButtons()

  qsa('[data-tab]').forEach((btn) =>
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab
      qsa('[data-tab]').forEach((b) => {
        b.classList.toggle('is-active', b === btn)
        b.setAttribute('aria-selected', String(b === btn))
      })
      qsa('.tab-panel').forEach((panel) => panel.classList.toggle('is-active', panel.id === `panel-${currentTab}`))
      history.replaceState(null, '', `account.html?tab=${currentTab}`)
    }),
  )

  const orderSelect = qs('#rt-order')
  orderSelect?.addEventListener('change', () => {
    const chosen = myOrders(read(), user.email).find((o) => o.id === orderSelect.value)
    const itemSelect = qs('#rt-item')
    if (!chosen || !itemSelect) return
    itemSelect.innerHTML = chosen.items
      .filter((i) => i.format !== 'ebook')
      .map((i) => `<option value="${escapeHtml(i.slug)}">${escapeHtml(i.title)} · ${escapeHtml(i.format)}</option>`)
      .join('')
  })

  qs('#return-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const orderId = qs('#rt-order').value
    const slug = qs('#rt-item').value
    const order = myOrders(read(), user.email).find((o) => o.id === orderId)
    const item = order?.items.find((i) => i.slug === slug)
    if (!order || !item) return
    requestReturn({ orderId, slug, title: item.title, reason: qs('#rt-reason').value, note: qs('#rt-note').value })
    toast('Return requested — check the list below')
    window.location.href = 'account.html?tab=returns'
  })

  qs('#profile-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    updateUser({
      name: qs('#pf-name').value.trim() || user.name,
      email: qs('#pf-email').value.trim().toLowerCase() || user.email,
      line1: qs('#pf-line1').value.trim(),
      city: qs('#pf-city').value.trim(),
      postcode: qs('#pf-postcode').value.trim(),
    })
    toast('Details saved')
  })

  qs('#sign-out')?.addEventListener('click', doSignOut)
  qs('#profile-signout')?.addEventListener('click', doSignOut)
}

function doSignOut() {
  signOut()
  window.location.href = 'account.html'
}

document.addEventListener('click', (event) => {
  const reorder = event.target.closest('[data-reorder]')
  if (!reorder) return
  const order = read().orders.find((o) => o.id === reorder.dataset.reorder)
  if (!order) return
  let added = 0
  order.items.forEach((item) => {
    const live = read().books.find((b) => b.slug === item.slug)
    const option = live && live.formats.find((f) => f.format === item.format)
    if (live && option && (item.format === 'ebook' || option.stock > 0)) {
      addToCart(item.slug, item.format, item.qty)
      added += 1
    }
  })
  toast(added ? 'Added to your bag' : 'Those books are out of stock')
  if (added) window.location.href = 'checkout.html'
})

bindWishlistButtons(() => {
  if (user && currentTab === 'wishlist') {
    const panel = qs('#panel-wishlist')
    if (panel) panel.innerHTML = wishlistPanel()
    syncWishlistButtons()
  }
})

if (user) signedInView()
else authView()
