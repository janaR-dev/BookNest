import { bookCardHtml, bindCards } from '../card.js'
import { categories } from '../data.js'
import { read } from '../store.js'
import { bindWishlistButtons, coverHtml, escapeHtml, mountChrome, qs, syncWishlistButtons, toast } from '../ui.js'

mountChrome('home')
bindCards()
bindWishlistButtons()

const state = read()
const featured = state.books.filter((b) => b.featured).slice(0, 3)
const hero = qs('#hero-covers')
if (hero) {
  hero.innerHTML = featured
    .map((b) => `<a href="book.html?id=${encodeURIComponent(b.slug)}" aria-label="${escapeHtml(b.title)}">${coverHtml(b)}</a>`)
    .join('')
}

const catGrid = qs('#cat-grid')
if (catGrid) {
  catGrid.innerHTML = categories
    .map((c) => {
      const count = state.books.filter((b) => b.category === c.key).length
      return `<a class="cat-tile" href="books.html?category=${c.key}">
        <span class="arrow">→</span>
        <div><h3>${escapeHtml(c.label)}</h3><p>${escapeHtml(c.blurb)}</p></div>
        <span class="count">${count} ${count === 1 ? 'title' : 'titles'}</span>
      </a>`
    })
    .join('')
}

const newest = [...state.books].sort((a, b) => Number(b.isNew || 0) - Number(a.isNew || 0) || b.year - a.year).slice(0, 4)
const newGrid = qs('#new-grid')
if (newGrid) newGrid.innerHTML = newest.map(bookCardHtml).join('')

const top = [...state.books].sort((a, b) => b.rating - a.rating).slice(0, 4)
const topGrid = qs('#top-grid')
if (topGrid) topGrid.innerHTML = top.map(bookCardHtml).join('')

syncWishlistButtons()

const copy = qs('#copy-promo')
if (copy) {
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('READMORE')
      toast('Code READMORE copied')
    } catch {
      toast('Code: READMORE')
    }
  })
}

// Keep the catalogue fresh if books are edited in another tab.
window.addEventListener('storage', () => window.location.reload())
