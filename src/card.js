import { cheapest, money } from './data.js'
import { addToCart, read } from './store.js'
import { coverHtml, escapeHtml, icon, starsHtml, toast } from './ui.js'

const formatWord = (format) => (format === 'ebook' ? 'eBook' : format === 'paperback' ? 'Paper' : 'Hardback')

export function bookCardHtml(book) {
  const saved = read().wishlist.includes(book.slug)
  const quick =
    book.formats.find((f) => f.format === 'paperback' && f.stock > 0) ??
    book.formats.find((f) => f.stock > 0) ??
    book.formats.find((f) => f.format === 'ebook')
  const paperOnlyEbook = book.formats.every((f) => f.format === 'ebook' || f.stock === 0)

  return `<article class="book-card">
    <div class="book-card__cover">
      <a href="book.html?id=${encodeURIComponent(book.slug)}" aria-label="${escapeHtml(book.title)}">${coverHtml(book)}</a>
      <div class="book-card__flags">
        ${book.isNew ? '<span class="flag">New</span>' : ''}
        ${book.featured && !book.isNew ? '<span class="flag">Staff pick</span>' : ''}
        ${paperOnlyEbook ? '<span class="flag flag--dark">eBook only</span>' : ''}
      </div>
      <button class="wish-btn ${saved ? 'is-saved' : ''}" type="button" data-wish="${escapeHtml(book.slug)}" data-title="${escapeHtml(book.title)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${escapeHtml(book.title)} ${saved ? 'from' : 'to'} wishlist">
        ${icon('heart')}
      </button>
      <button class="quick-add" type="button" data-quick-add="${escapeHtml(book.slug)}" data-format="${quick ? quick.format : ''}" ${quick ? '' : 'disabled'}>
        ${quick ? `${icon('plus', 'icon sm')} Add to bag` : 'Out of stock'}
      </button>
    </div>
    <div class="book-card__meta">
      <a href="book.html?id=${encodeURIComponent(book.slug)}"><h3>${escapeHtml(book.title)}</h3></a>
      <p class="book-card__author">${escapeHtml(book.author)}</p>
      <div class="book-card__rating">${starsHtml(book.rating)}<span class="tabnums">${book.rating.toFixed(1)}</span><span class="faint">(${book.reviewCount})</span></div>
      <div class="book-card__price">
        <span>${book.formats.length > 1 ? `<span class="from">from </span>` : ''}${money(cheapest(book))}</span>
        <span class="formats">${book.formats.map((f) => formatWord(f.format)).join(' · ')}</span>
      </div>
    </div>
  </article>`
}

let bound = false
export function bindCards() {
  if (bound) return
  bound = true
  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-quick-add]')
    if (!btn || btn.disabled) return
    event.preventDefault()
    addToCart(btn.dataset.quickAdd, btn.dataset.format)
    toast('Added to your bag')
  })
}
