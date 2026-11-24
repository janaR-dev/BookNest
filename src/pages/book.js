import { bookCardHtml, bindCards } from '../card.js'
import { categoryLabel, formatLabel, LOW_STOCK, money } from '../data.js'
import { addReview, addToCart, read } from '../store.js'
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
  setCartOpen,
  starsHtml,
  syncWishlistButtons,
  toast,
} from '../ui.js'

mountChrome('book')
bindCards()
bindWishlistButtons()

const page = qs('#page')
const slug = param('id')
const state = read()
let book = state.books.find((b) => b.slug === slug)

if (!book) {
  page.innerHTML = `<div style="padding:60px 0">${emptyState(
    'We could not find that book',
    'It may have been removed from the catalogue. The shelves are still open.',
    '<a class="btn" href="books.html">Browse all books</a>',
  )}</div>`
} else {
  const canBuy = (option) => option.format === 'ebook' || option.stock > 0
  let chosen = (book.formats.find(canBuy) || book.formats[0]).format
  let qty = 1
  let reviewStars = 5

  const optionFor = (format) => book.formats.find((f) => f.format === format)

  function stockInfo() {
    const option = optionFor(chosen)
    if (chosen === 'ebook') return { text: 'Instant download after checkout', dot: '' }
    if (!option || option.stock <= 0) return { text: 'Out of stock — join the reprint list below', dot: 'out' }
    if (option.stock <= LOW_STOCK) return { text: `Only ${option.stock} left on the shelf`, dot: 'low' }
    return { text: `In stock — ${option.stock} copies ready to post`, dot: '' }
  }

  const related = [...state.books]
    .filter((b) => b.slug !== book.slug)
    .sort((a, b) => Number(b.category === book.category) - Number(a.category === book.category) || b.rating - a.rating)
    .slice(0, 4)

  const formatOptions = book.formats
    .map((f) => {
      const out = f.format !== 'ebook' && f.stock <= 0
      const sub = f.format === 'ebook' ? 'Instant download · EPUB' : out ? 'Out of stock' : `${f.stock} in stock`
      return `<button class="format-option" type="button" data-format-btn="${f.format}" aria-pressed="${f.format === chosen}" ${out ? 'disabled' : ''}>
        <span class="dot"></span>
        <span><span class="name">${formatLabel[f.format]}</span><span class="sub">${sub}</span></span>
        <span class="price">${money(f.price)}</span>
      </button>`
    })
    .join('')

  page.innerHTML = `
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="books.html">Books</a><span>/</span>
      <a href="books.html?category=${book.category}">${escapeHtml(categoryLabel(book.category))}</a><span>/</span>
      <span>${escapeHtml(book.title)}</span>
    </nav>

    <section class="book-hero">
      <div class="book-cover-col">
        ${coverHtml(book)}
        <div class="book-mini-actions">
          <button class="btn btn--secondary btn--sm" type="button" data-wish="${escapeHtml(book.slug)}" data-title="${escapeHtml(book.title)}">
            ${icon('heart')} <span>Save to wishlist</span>
          </button>
        </div>
      </div>
      <div>
        <p class="eyebrow">${escapeHtml(categoryLabel(book.category))} · ${book.year} · ${escapeHtml(book.publisher)}</p>
        <h1 class="book-title">${escapeHtml(book.title)}</h1>
        <p class="book-author">by ${escapeHtml(book.author)}</p>
        <div class="book-rating-row">
          ${starsHtml(book.rating)}
          <span class="tabnums">${book.rating.toFixed(1)}</span>
          <span class="faint">${book.reviewCount} ratings</span>
          <span class="faint">·</span>
          <a href="#reviews" style="text-decoration:underline;text-underline-offset:3px">Read reviews</a>
        </div>
        <p class="book-summary">${escapeHtml(book.summary)}</p>

        <div class="format-picker" role="group" aria-label="Choose a format">${formatOptions}</div>
        <div class="stock-line"><span class="dot-indicator ${stockInfo().dot}" id="stock-dot"></span><span id="stock-text">${stockInfo().text}</span></div>

        <div class="buy-row">
          <div class="qty" aria-label="Quantity">
            <button type="button" data-qty="-1" aria-label="Decrease quantity">−</button>
            <span id="qty-val">1</span>
            <button type="button" data-qty="1" aria-label="Increase quantity">+</button>
          </div>
          <button class="btn" type="button" id="add-btn">Add to bag — ${money(optionFor(chosen).price)}</button>
        </div>

        <div class="delivery-note">
          <span class="row">${icon('truck')} Paper orders post in 1–2 days · free over $35</span>
          <span class="row">${icon('download')} eBooks arrive by download link on your receipt</span>
          <span class="row">${icon('refresh')} 30-day returns on paper copies</span>
        </div>

        <div class="accordion">
          <div class="acc-item is-open">
            <button class="acc-trigger" type="button">Summary ${icon('plus')}</button>
            <div class="acc-panel"><p>${escapeHtml(book.description)}</p></div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger" type="button">Details ${icon('plus')}</button>
            <div class="acc-panel"><ul>
              <li>${book.pages} pages</li>
              <li>Published by ${escapeHtml(book.publisher)}, ${book.year}</li>
              <li>ISBN ${escapeHtml(book.isbn)}</li>
              <li>Language: ${escapeHtml(book.language)}</li>
            </ul></div>
          </div>
          <div class="acc-item">
            <button class="acc-trigger" type="button">Shipping &amp; returns ${icon('plus')}</button>
            <div class="acc-panel"><ul>
              <li>Standard post 3–5 days ($4.95, free over $35)</li>
              <li>Express 1–2 days ($9.95) · Collect in store in 2 hours</li>
              <li>Return paper copies within 30 days from your order history</li>
              <li>eBooks are delivered instantly and are not returnable</li>
            </ul></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="reviews">
      <div class="reviews-layout">
        <div>
          <p class="eyebrow">Ratings &amp; reviews</p>
          <p class="rating-big">${book.rating.toFixed(1)}</p>
          <div style="margin-top:8px">${starsHtml(book.rating)}</div>
          <p class="small muted" style="margin-top:6px">Based on ${book.reviewCount} ratings</p>
          <p class="small faint" style="margin-top:14px">Reviews come from readers in this demo. Yours is saved in your browser.</p>
        </div>
        <div id="reviews-body">${reviewsHtml()}</div>
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><p class="eyebrow">Keep going</p><h2>More from ${escapeHtml(categoryLabel(book.category))}</h2></div>
        <a class="section-link" href="books.html?category=${book.category}">The whole shelf →</a>
      </div>
      <div class="book-grid">${related.map(bookCardHtml).join('')}</div>
    </section>`

  function reviewsHtml() {
    const fresh = read().books.find((b) => b.slug === book.slug) || book
    const list = fresh.reviews.length
      ? fresh.reviews
          .map(
            (r) => `<div class="review">
              <div class="review-top">${starsHtml(r.rating)}<strong>${escapeHtml(r.name)}</strong><span class="faint">${new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></div>
              <p class="review-body">${escapeHtml(r.body)}</p>
            </div>`,
          )
          .join('')
      : '<p class="muted" style="padding:20px 0">No written reviews yet. Be the first.</p>'

    return `<div>${list}</div>
      <div class="review-form">
        <h3 class="display" style="font-size:24px">Write a review</h3>
        <form id="review-form" novalidate>
          <div class="form-grid form-grid--2" style="margin-top:14px">
            <div class="field">
              <label for="rev-name">Your name</label>
              <input class="input" id="rev-name" name="name" maxlength="40" placeholder="First name and initial" value="${escapeHtml(read().user?.name || '')}" required />
            </div>
            <div class="field">
              <span class="label">Rating</span>
              <div class="star-input" role="group" aria-label="Your rating">
                ${[1, 2, 3, 4, 5]
                  .map((n) => `<button type="button" data-star="${n}" class="${n <= reviewStars ? 'is-on' : ''}" aria-label="${n} stars">${icon('star')}</button>`)
                  .join('')}
              </div>
            </div>
          </div>
          <div class="field" style="margin-top:14px">
            <label for="rev-body">Your review</label>
            <textarea class="textarea" id="rev-body" maxlength="600" placeholder="What worked, what did not, who should read it." required></textarea>
          </div>
          <div class="form-actions">
            <button class="btn" type="submit">Post review</button>
            <span class="help">No account needed. Stored in this browser.</span>
          </div>
        </form>
      </div>`
  }

  function updateBuy() {
    const option = optionFor(chosen)
    qsa('[data-format-btn]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.formatBtn === chosen)))
    const info = stockInfo()
    const text = qs('#stock-text')
    const dot = qs('#stock-dot')
    if (text) text.textContent = info.text
    if (dot) dot.className = `dot-indicator ${info.dot}`
    const add = qs('#add-btn')
    const available = option && canBuy(option)
    if (add) {
      add.disabled = !available
      add.textContent = available ? `Add to bag — ${money(option.price)}` : 'Out of stock'
    }
    const max = chosen === 'ebook' ? 10 : option.stock
    qty = Math.min(qty, Math.max(1, max))
    const val = qs('#qty-val')
    if (val) val.textContent = String(qty)
    const plus = qs('[data-qty="1"]')
    if (plus) plus.disabled = qty >= max
    const minus = qs('[data-qty="-1"]')
    if (minus) minus.disabled = qty <= 1
  }

  updateBuy()
  syncWishlistButtons()

  document.addEventListener('click', (event) => {
    const format = event.target.closest('[data-format-btn]')
    if (format) {
      chosen = format.dataset.formatBtn
      qty = 1
      updateBuy()
      return
    }
    const step = event.target.closest('[data-qty]')
    if (step) {
      qty = Math.max(1, qty + Number(step.dataset.qty))
      updateBuy()
      return
    }
    const acc = event.target.closest('.acc-trigger')
    if (acc) {
      acc.closest('.acc-item').classList.toggle('is-open')
      return
    }
    const star = event.target.closest('[data-star]')
    if (star) {
      reviewStars = Number(star.dataset.star)
      qsa('[data-star]').forEach((b) => b.classList.toggle('is-on', Number(b.dataset.star) <= reviewStars))
      return
    }
    if (event.target.closest('#add-btn')) {
      addToCart(book.slug, chosen, qty)
      toast(`${book.title} added to your bag`)
      setCartOpen(true)
    }
  })

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'review-form') return
    event.preventDefault()
    const name = qs('#rev-name').value.trim()
    const body = qs('#rev-body').value.trim()
    if (body.length < 4) {
      toast('Write a little more before posting')
      return
    }
    addReview(book.slug, reviewStars, body, name)
    book = read().books.find((b) => b.slug === book.slug) || book
    qs('#reviews-body').innerHTML = reviewsHtml()
    reviewStars = 5
    toast('Review posted — thank you')
  })
}
