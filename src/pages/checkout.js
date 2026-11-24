import { FREE_SHIPPING_AT, calcTotals, findPromo, money, shippingMethods } from '../data.js'
import { cartHasPhysical, cartItems, cartSubtotal, placeOrder, read } from '../store.js'
import { coverHtml, emptyState, escapeHtml, formatWord, icon, mountChrome, qs, toast } from '../ui.js'

mountChrome('checkout')

const page = qs('#page')
const state = read()
const items = cartItems(state)
const isPhysical = cartHasPhysical(state)

if (!items.length) {
  page.innerHTML = `<div style="padding:40px 0 20px">
    <div class="page-head"><p class="eyebrow">Checkout</p><h1>Your bag</h1></div>
    ${emptyState('Your bag is empty', 'Add a paperback or an eBook and the totals will appear here.', '<a class="btn" href="books.html">Browse the shelves</a>')}
  </div>`
} else {
  const subtotal = cartSubtotal(state)
  const user = state.user
  let shipping = 'standard'
  let payment = 'card'
  let promo = null
  let promoError = ''

  page.innerHTML = `<div class="page-head">
      <p class="eyebrow">Checkout</p>
      <h1>Almost on the shelf</h1>
    </div>
    <form class="checkout-grid" id="checkout-form" novalidate>
      <div>
        <div class="checkout-block">
          <h2>Contact &amp; delivery</h2>
          <div class="form-grid form-grid--2" style="margin-top:16px">
            <div class="field"><label for="co-name">Full name</label><input class="input" id="co-name" name="name" autocomplete="name" value="${escapeHtml(user?.name || '')}" required /></div>
            <div class="field"><label for="co-email">Email</label><input class="input" id="co-email" name="email" type="email" autocomplete="email" value="${escapeHtml(user?.email || '')}" required /></div>
          </div>
          <div class="form-grid" style="margin-top:14px">
            <div class="field"><label for="co-line1">Street address</label><input class="input" id="co-line1" name="line1" autocomplete="address-line1" value="${escapeHtml(user?.line1 || '')}" required /></div>
          </div>
          <div class="form-grid form-grid--3" style="margin-top:14px">
            <div class="field"><label for="co-city">City</label><input class="input" id="co-city" name="city" autocomplete="address-level2" value="${escapeHtml(user?.city || '')}" required /></div>
            <div class="field"><label for="co-postcode">Postcode</label><input class="input" id="co-postcode" name="postcode" autocomplete="postal-code" value="${escapeHtml(user?.postcode || '')}" required /></div>
            <div class="field"><label for="co-country">Country</label><input class="input" id="co-country" name="country" value="United States" required /></div>
          </div>
          <p class="help" style="margin-top:10px">Digital orders still need an address for the invoice; nothing is posted.</p>
        </div>

        <div class="checkout-block">
          <div class="block-head"><h2>Shipping</h2><span class="small faint">${isPhysical ? 'Paper items in your bag' : 'Digital only'}</span></div>
          ${
            isPhysical
              ? `<div class="option-list" id="shipping-options">
                  ${shippingMethods
                    .map((m) => {
                      const free = m.id === 'standard' && subtotal >= FREE_SHIPPING_AT
                      return `<button class="option ${m.id === shipping ? 'is-selected' : ''}" type="button" data-ship="${m.id}">
                        <span class="radio"></span>
                        <span><strong>${m.label}</strong><span class="sub">${m.detail}</span></span>
                        <span class="price">${free || m.price === 0 ? 'Free' : money(m.price)}</span>
                      </button>`
                    })
                    .join('')}
                </div>`
              : `<p class="small muted">eBooks are delivered instantly by download link on your receipt. There is no shipping charge.</p>`
          }
        </div>

        <div class="checkout-block">
          <h2>Payment</h2>
          <div class="option-list" style="margin-top:14px" id="payment-options">
            <button class="option ${payment === 'card' ? 'is-selected' : ''}" type="button" data-pay="card">
              <span class="radio"></span><span><strong>Card</strong><span class="sub">Visa, Mastercard, Amex</span></span>${icon('card')}
            </button>
            <button class="option ${payment === 'paypal' ? 'is-selected' : ''}" type="button" data-pay="paypal">
              <span class="radio"></span><span><strong>PayPal</strong><span class="sub">Redirect after placing the order</span></span>
            </button>
            <button class="option ${payment === 'delivery' ? 'is-selected' : ''}" type="button" data-pay="delivery">
              <span class="radio"></span><span><strong>Pay on delivery</strong><span class="sub">Cash or card at the door</span></span>
            </button>
          </div>
          <div id="card-fields" class="${payment === 'card' ? '' : 'hide'}" style="margin-top:14px">
            <div class="field"><label for="co-card">Card number</label><input class="input" id="co-card" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19" /></div>
            <div class="form-grid form-grid--2" style="margin-top:12px">
              <div class="field"><label for="co-exp">Expiry</label><input class="input" id="co-exp" placeholder="MM / YY" maxlength="7" /></div>
              <div class="field"><label for="co-cvc">CVC</label><input class="input" id="co-cvc" inputmode="numeric" placeholder="123" maxlength="4" /></div>
            </div>
            <p class="payment-note">Demo checkout — no card is charged and no number leaves this page. Use 4242 4242 4242 4242.</p>
          </div>
          <div id="pay-note" class="${payment === 'paypal' ? '' : 'hide'}"><p class="payment-note">You will be redirected to PayPal in a real shop. Here the order is placed immediately.</p></div>
          <div id="delivery-note" class="${payment === 'delivery' ? '' : 'hide'}"><p class="payment-note">Pay the courier when your parcel arrives. Available for paper orders only.</p></div>
        </div>
      </div>

      <div>
        <div class="summary-card">
          <div class="spread"><h2>Order summary</h2><a class="small muted" href="books.html" style="text-decoration:underline;text-underline-offset:3px">Add more</a></div>
          <div class="summary-items">
            ${items
              .map(
                (l) => `<div class="summary-item">
                  ${coverHtml(l.book)}
                  <span class="t"><strong>${escapeHtml(l.book.title)}</strong><span>${formatWord(l.format)} · qty ${l.qty}</span></span>
                  <span class="amt">${money(l.unit * l.qty)}</span>
                </div>`,
              )
              .join('')}
          </div>
          <div class="promo-row">
            <input class="input" id="promo-input" placeholder="Discount code" aria-label="Discount code" autocomplete="off" />
            <button class="btn btn--secondary" type="button" id="apply-promo">Apply</button>
          </div>
          <div id="promo-area"></div>
          <div class="summary-lines" id="totals"></div>
          <div id="order-error"></div>
          <button class="btn btn--block btn--lg" type="submit" style="margin-top:16px">Place order</button>
          <p class="demo-note">By placing this order you agree to the demo terms: no payment is taken, and the order, stock and receipt are stored in this browser.</p>
        </div>
      </div>
    </form>`

  function totalsHtml() {
    const t = calcTotals(subtotal, isPhysical, shipping, promo)
    return `<div><span class="muted">Subtotal</span><span class="tabnums">${money(subtotal)}</span></div>
      ${t.discount > 0 ? `<div class="discount"><span>Discount (${escapeHtml(promo.code)})</span><span class="tabnums">−${money(t.discount)}</span></div>` : ''}
      <div><span class="muted">${isPhysical ? 'Shipping' : 'Digital delivery'}</span><span class="tabnums">${t.shipping === 0 ? 'Free' : money(t.shipping)}</span></div>
      <div class="total"><span>Total</span><span class="tabnums">${money(t.total)}</span></div>`
  }

  function refreshTotals() {
    qs('#totals').innerHTML = totalsHtml()
    qs('#promo-area').innerHTML = promo
      ? `<div class="promo-applied"><span>${escapeHtml(promo.code)} — ${escapeHtml(promo.label)}</span><button class="linkish" type="button" id="remove-promo" style="color:var(--green)">Remove</button></div>`
      : promoError
        ? `<p class="error" style="margin-top:10px">${escapeHtml(promoError)}</p>`
        : `<p class="help" style="margin-top:10px">Try READMORE, FIRST5 or FREESHIP.</p>`
    qs('#shipping-options')?.querySelectorAll('[data-ship]').forEach((btn) => btn.classList.toggle('is-selected', btn.dataset.ship === shipping))
  }

  refreshTotals()

  document.addEventListener('click', (event) => {
    const ship = event.target.closest('[data-ship]')
    if (ship) {
      shipping = ship.dataset.ship
      refreshTotals()
      return
    }
    const pay = event.target.closest('[data-pay]')
    if (pay) {
      payment = pay.dataset.pay
      qs('#payment-options').querySelectorAll('[data-pay]').forEach((btn) => btn.classList.toggle('is-selected', btn.dataset.pay === payment))
      qs('#card-fields').classList.toggle('hide', payment !== 'card')
      qs('#pay-note').classList.toggle('hide', payment !== 'paypal')
      qs('#delivery-note').classList.toggle('hide', payment !== 'delivery')
      return
    }
    if (event.target.closest('#apply-promo')) {
      const input = qs('#promo-input')
      const result = findPromo(input.value, subtotal)
      if (result.error) {
        promo = null
        promoError = result.error
      } else {
        promo = result.promo
        promoError = ''
        toast(`${promo.code} applied`)
      }
      refreshTotals()
      return
    }
    if (event.target.closest('#remove-promo')) {
      promo = null
      promoError = ''
      qs('#promo-input').value = ''
      refreshTotals()
    }
  })

  qs('#promo-input')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      qs('#apply-promo').click()
    }
  })

  qs('#checkout-form').addEventListener('submit', (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const value = (id) => qs(id).value.trim()
    const missing = [
      ['#co-name', 'a name'],
      ['#co-email', 'an email'],
      ['#co-line1', 'a street address'],
      ['#co-city', 'a city'],
      ['#co-postcode', 'a postcode'],
    ].find(([id]) => !value(id))
    const error = qs('#order-error')
    if (missing) {
      error.innerHTML = `<p class="error" style="margin-top:12px">Add ${missing[1]} before placing the order.</p>`
      qs(missing[0]).focus()
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value('#co-email'))) {
      error.innerHTML = '<p class="error" style="margin-top:12px">That email address does not look right.</p>'
      return
    }
    const card = value('#co-card').replace(/\s+/g, '')
    if (payment === 'card' && card.length < 12) {
      error.innerHTML = '<p class="error" style="margin-top:12px">Enter a demo card number (4242 4242 4242 4242).</p>'
      qs('#co-card').focus()
      return
    }
    if (payment === 'delivery' && !isPhysical) {
      error.innerHTML = '<p class="error" style="margin-top:12px">Pay on delivery needs a paper book in the bag.</p>'
      return
    }
    error.innerHTML = ''
    const paymentLabel =
      payment === 'card' ? `Card ending ${card.slice(-4) || '4242'}` : payment === 'paypal' ? 'PayPal (demo)' : 'Pay on delivery'
    form.querySelector('button[type="submit"]').disabled = true
    const order = placeOrder({
      name: value('#co-name'),
      email: value('#co-email'),
      address: { line1: value('#co-line1'), city: value('#co-city'), postcode: value('#co-postcode'), country: value('#co-country') },
      shipping: isPhysical ? shipping : 'standard',
      payment: paymentLabel,
      promo,
    })
    window.location.href = `order.html?id=${encodeURIComponent(order.id)}`
  })
}
