# Build a book search application
_Exported on 9/4/2025 at 01:42:22 GMT+5:30 from Cursor (1.5.9)_

---

**User**

1. Book Finder
 User Persona:
 ● Name:Alex
 ● Occupation: College Student
 ● Need:Alexwantstosearch books (use your imagination of all the ways Alex would like to do it).
 Task:
 ● Buildanapplication for Alex. Do as good a job you can.
 API to Use: Open Library Search API: example ( know that it gives a lot of details, including the cover)::
 https://openlibrary.org/search.json?title={bookTitle

---

**Cursor**

I'll set up a lightweight single-page web app with HTML/CSS/JS and build the search UI, filters, results with covers, sorting, pagination, details modal, and favorites using localStorage. Then I’ll wire it to Open Library’s Search API with debounced queries and error handling.

---

**User**

Technology Stack
 ● Frameworks:Useeither React or Svelte for building your application.
 ● Styling: You are free to use any CSS methodology or framework, such as Tailwind CSS, plain CSS,
 CSS Modules, or Styled Components.
 ● DataFetching: Utilize public APIs that require no authentication or registration.
 ● StateManagement:Usethe state management tools provided by your chosen framework (e.g.,
 React's built-in state management or Svelte's stores)

use react to make it

---

**Cursor**

I'll scaffold a React app with Vite, install dependencies, and then start implementing the Book Finder features step by step.

I'll re-run the scaffolding without the pipe and then install dependencies.

I'll scaffold the Vite React app in the current directory and then install dependencies.

I'll open the project files to implement the React UI and API integration next.

I'm going to implement the React UI: search with debounce, filters, sorting, results with pagination, details modal, favorites with localStorage, plus styling. Then I'll run the dev server to verify.

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="app-container">
			<header className="header">
				<h1>Book Finder</h1>
				<p>Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="search-row">
					<select value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="filters-row">
					<label className="inline">
						<span>Language</span>
						<select value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline checkbox">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline year">
						<span>Year from</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline year">
						<span>to</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="status">Loading…</div>}
				{!loading && error && <div className="status error">{error}</div>}
				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="results">
				{!loading && !error && results.length === 0 && query && (
					<div className="empty">No results. Try different terms or filters.</div>
				)}
				<ul className="grid">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						const isFav = Boolean(favorites[doc.key || doc.cover_edition_key || doc.edition_key?.[0]])
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="card">
								<button className="cover-btn" onClick={() => openDetails(doc)}>
									<img src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div className="info">
									<h3 title={doc.title}>{doc.title}</h3>
									<p className="sub">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="meta-line">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="actions">
										<button className="secondary" onClick={() => openDetails(doc)}>Details</button>
										<button className={isFav ? 'danger' : 'primary'} onClick={() => toggleFavorite(doc)}>
											{isFav ? 'Remove Favorite' : 'Add Favorite'}
										</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="pagination">
					<button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="modal" role="dialog" aria-modal="true">
					<div className="modal-content">
						<button className="close" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2>{activeWork.doc.title}</h2>
						<p className="sub">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="status">Loading details…</div>}
						{detailsError && <div className="status error">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div className="details">
								{workDetails.description && (
									<p className="desc">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="meta-line"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="favorites">
				<h2>Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="empty">No favorites yet.</p>}
				<ul className="fav-grid">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="fav-card">
							<img src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="fav-title">{fav.title}</p>
								<p className="fav-sub">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="danger" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

```css
:root {
  --bg: #0b1020;
  --panel: #121832;
  --panel-2: #0e1429;
  --text: #e6e9f2;
  --muted: #a5acc7;
  --primary: #6ea4ff;
  --primary-2: #3b7cff;
  --danger: #ff6b6b;
  --border: #243057;
}

* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: var(--bg); color: var(--text); }

.app-container { max-width: 1100px; margin: 0 auto; padding: 24px; }

.header h1 { margin: 0 0 4px 0; }
.header p { margin: 0 0 16px 0; color: var(--muted); }

.controls { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: grid; gap: 12px; }
.search-row { display: grid; grid-template-columns: 140px 1fr 160px; gap: 12px; }
.filters-row { display: flex; flex-wrap: wrap; gap: 12px; }

input, select, button { height: 40px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel-2); color: var(--text); padding: 0 10px; }
input::placeholder { color: #7d86a8; }

button { cursor: pointer; background: var(--panel-2); }
button.primary { background: var(--primary); color: #0b1020; border: none; }
button.secondary { background: #22305c; }
button.danger { background: var(--danger); color: #0b1020; border: none; }
button:disabled { opacity: 0.6; cursor: not-allowed; }

.inline { display: inline-flex; align-items: center; gap: 8px; }
.inline.year input { width: 100px; }
.inline.checkbox { gap: 6px; }

.meta { margin: 12px 0; min-height: 24px; }
.status { color: var(--muted); }
.status.error { color: var(--danger); }
.empty { color: var(--muted); }

.results { margin-top: 8px; }
.grid { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat( auto-fill, minmax(240px, 1fr) ); gap: 12px; }
.card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 8px; display: grid; grid-template-columns: 96px 1fr; gap: 10px; align-items: start; }
.cover-btn { border: none; padding: 0; background: transparent; cursor: pointer; }
.card img { width: 96px; height: 144px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
.info h3 { margin: 0 0 4px 0; font-size: 16px; }
.sub { margin: 0 0 6px 0; color: var(--muted); font-size: 14px; }
.meta-line { margin: 0 0 8px 0; color: var(--muted); font-size: 13px; }
.actions { display: flex; gap: 8px; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 16px 0; }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; padding: 20px; }
.modal-content { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; width: min(800px, 100%); position: relative; }
.modal .close { position: absolute; right: 8px; top: 8px; width: 32px; height: 32px; border-radius: 50%; }
.desc { color: var(--text); line-height: 1.5; }

.favorites { margin-top: 28px; }
.fav-grid { display: grid; grid-template-columns: repeat( auto-fill, minmax(220px, 1fr) ); gap: 12px; list-style: none; padding: 0; margin: 8px 0 0 0; }
.fav-card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 10px; display: grid; grid-template-columns: 64px 1fr auto; gap: 10px; align-items: center; }
.fav-card img { width: 64px; height: 96px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border); }
.fav-title { margin: 0; font-size: 15px; }
.fav-sub { margin: 4px 0 0 0; color: var(--muted); font-size: 13px; }

@media (max-width: 720px) {
  .search-row { grid-template-columns: 1fr; }
}

```

```css
/* Reset minimal */
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { margin: 0; }

```

- I scaffolded a React app with Vite and implemented the full Book Finder UI and logic: debounced search, filters, sorting, pagination, details modal, favorites, and styling.
- I'm starting the dev server in the background. Open this in your browser: http://localhost:5173

Quick usage:
- Type a query, choose Title/Author/Subject/ISBN/All.
- Refine with Language, Ebooks only, Year range.
- Sort by Relevance/Newest/Oldest.
- Click a result for details; add/remove favorites.

Would you like me to add more filters (e.g., publisher) or keyboard shortcuts?

---

**User**

run the project

---

**Cursor**

I'll start the dev server from the project directory and confirm it's running.

---

**User**

did u use tailwind ?

---

**Cursor**

No, I used plain CSS for styling.

If you want Tailwind, I can add it now and convert the styles.

---

**User**

yeas convert it into tailwind 

---

**Cursor**

I'll add Tailwind CSS, configure it for Vite + React, then convert the existing styles in `App.jsx` to Tailwind utility classes and update `index.css`. Then I'll run the dev server again.

---

**User**

is it tailwind css or only simple css is applied ?

---

**Cursor**

Currently it’s simple CSS. I haven’t finished integrating Tailwind yet.  
Want me to set up Tailwind now and convert the components?

---

**User**

yes

---

**Cursor**

I'll set up Tailwind CSS configuration and convert the app's styles to Tailwind utilities, then run the dev server.

I'll add Tailwind configuration files, update `index.css` to include Tailwind directives, remove the `App.css` import, and convert JSX classNames to Tailwind utilities. Then I'll run the dev server.

```javascript
*** Begin Patch
*** Add File: C:\Users\wfors\Desktop\work\book-finder\tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./index.html',
		'./src/**/*.{js,jsx,ts,tsx}',
	],
	theme: {
		extend: {},
	},
	plugins: [],
}
*** End Patch
```

```javascript
*** Begin Patch
*** Add File: C:\Users\wfors\Desktop\work\book-finder\tailwind.config.js
module.exports = {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: { extend: {} },
	plugins: [],
}
*** End Patch
```

```javascript
*** Begin Patch
*** Add File: C:\Users\wfors\Desktop\work\book-finder\postcss.config.js
export default {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
}
*** End Patch
```

---

**User**

is it tailwind css now ?

---

**Cursor**

I'll set up Tailwind now by adding the config files, updating `index.css` to include Tailwind directives, and converting `App.jsx` to Tailwind utility classes while removing the old CSS import. Then I'll run the dev server.

I'll convert the project to Tailwind by importing Tailwind in `src/index.css` and rewriting `src/App.css` to use Tailwind `@apply` utilities, keeping your JSX classNames intact. Then I'll run the dev server to verify.

```css
@import "tailwindcss";

/* Base tweaks */
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { @apply m-0 bg-slate-950 text-slate-100; }

```

```css
@tailwind utilities;

.app-container { @apply max-w-[1100px] mx-auto p-6; }
.header h1 { @apply m-0 mb-1 text-2xl font-semibold; }
.header p { @apply m-0 mb-4 text-slate-400; }

.controls { @apply bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid gap-3; }
.search-row { @apply grid gap-3; grid-template-columns: 140px 1fr 160px; }
.filters-row { @apply flex flex-wrap gap-3; }

input, select, button { @apply h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5; }
input::placeholder { color: #7d86a8; }

button { @apply cursor-pointer; }
button.primary { @apply bg-blue-400 text-slate-900 border-0; }
button.secondary { @apply bg-slate-700; }
button.danger { @apply bg-red-400 text-slate-900 border-0; }
button:disabled { @apply opacity-60 cursor-not-allowed; }

.inline { @apply inline-flex items-center gap-2; }
.inline.year input { @apply w-24; }
.inline.checkbox { @apply gap-1.5; }

.meta { @apply my-3 min-h-6; }
.status { @apply text-slate-400; }
.status.error { @apply text-red-400; }
.empty { @apply text-slate-400; }

.results { @apply mt-2; }
.grid { @apply list-none p-0 m-0 grid gap-3; grid-template-columns: repeat( auto-fill, minmax(240px, 1fr) ); }
.card { @apply bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start; grid-template-columns: 96px 1fr; }
.cover-btn { @apply border-0 p-0 bg-transparent cursor-pointer; }
.card img { @apply w-24 h-36 object-cover rounded-lg border border-slate-700/60; }
.info h3 { @apply m-0 mb-1 text-base; }
.sub { @apply m-0 mb-1.5 text-slate-400 text-sm; }
.meta-line { @apply m-0 mb-2 text-slate-400 text-[13px]; }
.actions { @apply flex gap-2; }

.pagination { @apply flex items-center justify-center gap-3 my-4; }

.modal { @apply fixed inset-0 bg-black/50 grid place-items-center p-5; }
.modal-content { @apply bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative; }
.modal .close { @apply absolute right-2 top-2 w-8 h-8 rounded-full; }
.desc { @apply text-slate-100 leading-relaxed; }

.favorites { @apply mt-7; }
.fav-grid { @apply grid gap-3 list-none p-0 m-0; grid-template-columns: repeat( auto-fill, minmax(220px, 1fr) ); }
.fav-card { @apply bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 grid gap-2.5 items-center; grid-template-columns: 64px 1fr auto; }
.fav-card img { @apply w-16 h-24 object-cover rounded-md border border-slate-700/60; }
.fav-title { @apply m-0 text-[15px]; }
.fav-sub { @apply mt-1 text-slate-400 text-[13px]; }

@media (max-width: 720px) {
  .search-row { grid-template-columns: 1fr; }
}

```

---

**User**

is it tailwind css now or just plain css ?

---

**Cursor**

Yes—Tailwind CSS is active now. I imported Tailwind in `src/index.css` and the styles in `src/App.css` use Tailwind utilities via `@apply`.

- Verify: open http://localhost:5174 and you should see the dark theme with Tailwind styling.
- If you prefer inline utility classes in JSX instead of `@apply`-based classes, I can convert those next.

---

**User**

yes

---

**Cursor**

I'll convert `src/App.jsx` to use Tailwind utility classes inline and remove the `App.css` import. Then I'll run a quick lint to ensure no issues.

```javascriptreact
*** Begin Patch
*** Update File: C:\Users\wfors\Desktop\work\book-finder\src\App.jsx
@@
-import { useEffect, useMemo, useRef, useState } from 'react'
-import './App.css'
+import { useEffect, useMemo, useRef, useState } from 'react'
@@
-	return (
-		<div className="app-container">
-			<header className="header">
-				<h1>Book Finder</h1>
-				<p>Search Open Library by title, author, subject, or ISBN.</p>
-			</header>
-
-			<section className="controls">
-				<div className="search-row">
-					<select value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
-						<option value="title">Title</option>
-						<option value="author">Author</option>
-						<option value="subject">Subject</option>
-						<option value="isbn">ISBN</option>
-						<option value="all">All</option>
-					</select>
-
-					<input
-						value={query}
-						onChange={(e) => setQuery(e.target.value)}
-						placeholder="Search books..."
-						aria-label="Search query"
-					/>
-
-					<select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
-						<option value="relevance">Relevance</option>
-						<option value="newest">Newest</option>
-						<option value="oldest">Oldest</option>
-					</select>
-				</div>
-
-				<div className="filters-row">
-					<label className="inline">
-						<span>Language</span>
-						<select value={language} onChange={(e) => setLanguage(e.target.value)}>
-							<option value="">Any</option>
-							<option value="eng">English</option>
-							<option value="spa">Spanish</option>
-							<option value="fre">French</option>
-							<option value="ger">German</option>
-							<option value="ita">Italian</option>
-						</select>
-					</label>
-					<label className="inline checkbox">
-						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
-						<span>Ebooks only</span>
-					</label>
-					<label className="inline year">
-						<span>Year from</span>
-						<input inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
-					</label>
-					<label className="inline year">
-						<span>to</span>
-						<input inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
-					</label>
-				</div>
-			</section>
-
-			<section className="meta">
-				{loading && <div className="status">Loading…</div>}
-				{!loading && error && <div className="status error">{error}</div>}
-				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
-			</section>
-
-			<section className="results">
-				{!loading && !error && results.length === 0 && query && (
-					<div className="empty">No results. Try different terms or filters.</div>
-				)}
-				<ul className="grid">
+	return (
+		<div className="max-w-[1100px] mx-auto p-6">
+			<header>
+				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
+				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
+			</header>
+
+			<section className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid gap-3">
+				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
+					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
+						<option value="title">Title</option>
+						<option value="author">Author</option>
+						<option value="subject">Subject</option>
+						<option value="isbn">ISBN</option>
+						<option value="all">All</option>
+					</select>
+
+					<input
+						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
+						value={query}
+						onChange={(e) => setQuery(e.target.value)}
+						placeholder="Search books..."
+						aria-label="Search query"
+					/>
+
+					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
+						<option value="relevance">Relevance</option>
+						<option value="newest">Newest</option>
+						<option value="oldest">Oldest</option>
+					</select>
+				</div>
+
+				<div className="flex flex-wrap gap-3">
+					<label className="inline-flex items-center gap-2">
+						<span>Language</span>
+						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
+							<option value="">Any</option>
+							<option value="eng">English</option>
+							<option value="spa">Spanish</option>
+							<option value="fre">French</option>
+							<option value="ger">German</option>
+							<option value="ita">Italian</option>
+						</select>
+					</label>
+					<label className="inline-flex items-center gap-1.5">
+						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
+						<span>Ebooks only</span>
+					</label>
+					<label className="inline-flex items-center gap-2">
+						<span>Year from</span>
+						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
+					</label>
+					<label className="inline-flex items-center gap-2">
+						<span>to</span>
+						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
+					</label>
+				</div>
+			</section>
+
+			<section className="my-3 min-h-6">
+				{loading && <div className="text-slate-400">Loading…</div>}
+				{!loading && error && <div className="text-red-400">{error}</div>}
+				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
+			</section>
+
+			<section className="mt-2">
+				{!loading && !error && results.length === 0 && query && (
+					<div className="text-slate-400">No results. Try different terms or filters.</div>
+				)}
+				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
@@
-							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="card">
-								<button className="cover-btn" onClick={() => openDetails(doc)}>
-									<img src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
+							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
+								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
+									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
 								</button>
-								<div className="info">
-									<h3 title={doc.title}>{doc.title}</h3>
-									<p className="sub">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
-									<p className="meta-line">
-										<span>{doc.first_publish_year || '—'}</span>
-										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
-									</p>
-									<div className="actions">
-										<button className="secondary" onClick={() => openDetails(doc)}>Details</button>
-										<button className={isFav ? 'danger' : 'primary'} onClick={() => toggleFavorite(doc)}>
+								<div>
+									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
+									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
+									<p className="m-0 mb-2 text-slate-400 text-[13px]">
+										<span>{doc.first_publish_year || '—'}</span>
+										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
+									</p>
+									<div className="flex gap-2">
+										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
+										<button className={isFav ? 'h-10 rounded-lg bg-red-400 text-slate-900 px-2.5' : 'h-10 rounded-lg bg-blue-400 text-slate-900 px-2.5'} onClick={() => toggleFavorite(doc)}>
 											{isFav ? 'Remove Favorite' : 'Add Favorite'}
 										</button>
 									</div>
 								</div>
 							</li>
@@
-			{totalPages > 1 && (
-				<nav className="pagination">
-					<button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
-					<span>
-						Page {page} of {totalPages}
-					</span>
-					<button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
-				</nav>
-			)}
+			{totalPages > 1 && (
+				<nav className="flex items-center justify-center gap-3 my-4">
+					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
+					<span>
+						Page {page} of {totalPages}
+					</span>
+					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
+				</nav>
+			)}
@@
-			{activeWork && (
-				<div className="modal" role="dialog" aria-modal="true">
-					<div className="modal-content">
-						<button className="close" onClick={closeDetails} aria-label="Close details">✕</button>
-						<h2>{activeWork.doc.title}</h2>
-						<p className="sub">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
-						{detailsLoading && <div className="status">Loading details…</div>}
-						{detailsError && <div className="status error">{detailsError}</div>}
-						{!detailsLoading && workDetails && (
-							<div className="details">
-								{workDetails.description && (
-									<p className="desc">
-										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
-									</p>
-								)}
-								{workDetails.subjects && workDetails.subjects.length > 0 && (
-									<p className="meta-line"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
-								)}
-							</div>
-						)}
-					</div>
-				</div>
-			)}
+			{activeWork && (
+				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
+					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
+						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
+						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
+						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
+						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
+						{detailsError && <div className="text-red-400">{detailsError}</div>}
+						{!detailsLoading && workDetails && (
+							<div>
+								{workDetails.description && (
+									<p className="text-slate-100 leading-relaxed">
+										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
+									</p>
+								)}
+								{workDetails.subjects && workDetails.subjects.length > 0 && (
+									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
+								)}
+							</div>
+						)}
+					</div>
+				</div>
+			)}
@@
-			<section className="favorites">
-				<h2>Favorites</h2>
-				{Object.keys(favorites).length === 0 && <p className="empty">No favorites yet.</p>}
-				<ul className="fav-grid">
+			<section className="mt-7">
+				<h2 className="text-xl font-semibold">Favorites</h2>
+				{Object.keys(favorites).length === 0 && <p className="text-slate-400">No favorites yet.</p>}
+				<ul className="grid gap-3 list-none p-0 m-0 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
 					{Object.values(favorites).map((fav) => (
-						<li key={fav.key} className="fav-card">
-							<img src={buildCoverUrl(fav)} alt={fav.title} />
-							<div>
-								<p className="fav-title">{fav.title}</p>
-								<p className="fav-sub">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
-							</div>
-							<button className="danger" onClick={() => toggleFavorite(fav)}>Remove</button>
+						<li key={fav.key} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 grid gap-2.5 items-center [grid-template-columns:64px_1fr_auto]">
+							<img className="w-16 h-24 object-cover rounded-md border border-slate-700/60" src={buildCoverUrl(fav)} alt={fav.title} />
+							<div>
+								<p className="m-0 text-[15px]">{fav.title}</p>
+								<p className="mt-1 text-slate-400 text-[13px]">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
+							</div>
+							<button className="h-10 rounded-lg bg-red-400 text-slate-900 px-2.5" onClick={() => toggleFavorite(fav)}>Remove</button>
 						</li>
 					))}
 				</ul>
 			</section>
 		</div>
 	)
 }
*** End Patch
```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="app-container">
			<header className="header">
				<h1>Book Finder</h1>
				<p>Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="search-row">
					<select value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="filters-row">
					<label className="inline">
						<span>Language</span>
						<select value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline checkbox">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline year">
						<span>Year from</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline year">
						<span>to</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="status">Loading…</div>}
				{!loading && error && <div className="status error">{error}</div>}
				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="results">
				{!loading && !error && results.length === 0 && query && (
					<div className="empty">No results. Try different terms or filters.</div>
				)}
				<ul className="grid">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						const isFav = Boolean(favorites[doc.key || doc.cover_edition_key || doc.edition_key?.[0]])
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="card">
								<button className="cover-btn" onClick={() => openDetails(doc)}>
									<img src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div className="info">
									<h3 title={doc.title}>{doc.title}</h3>
									<p className="sub">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="meta-line">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="actions">
										<button className="secondary" onClick={() => openDetails(doc)}>Details</button>
										<button className={isFav ? 'danger' : 'primary'} onClick={() => toggleFavorite(doc)}>
											{isFav ? 'Remove Favorite' : 'Add Favorite'}
										</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="pagination">
					<button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="modal" role="dialog" aria-modal="true">
					<div className="modal-content">
						<button className="close" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2>{activeWork.doc.title}</h2>
						<p className="sub">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="status">Loading details…</div>}
						{detailsError && <div className="status error">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div className="details">
								{workDetails.description && (
									<p className="desc">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="meta-line"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="favorites">
				<h2>Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="empty">No favorites yet.</p>}
				<ul className="fav-grid">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="fav-card">
							<img src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="fav-title">{fav.title}</p>
								<p className="fav-sub">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="danger" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

```javascriptreact
*** Begin Patch
*** Update File: C:\Users\wfors\Desktop\work\book-finder\src\App.jsx
@@
-	return (
-		<div className="app-container">
-			<header className="header">
-				<h1>Book Finder</h1>
-				<p>Search Open Library by title, author, subject, or ISBN.</p>
-			</header>
-
-			<section className="controls">
-				<div className="search-row">
-					<select value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
-						<option value="title">Title</option>
-						<option value="author">Author</option>
-						<option value="subject">Subject</option>
-						<option value="isbn">ISBN</option>
-						<option value="all">All</option>
-					</select>
-
-					<input
-						value={query}
-						onChange={(e) => setQuery(e.target.value)}
-						placeholder="Search books..."
-						aria-label="Search query"
-					/>
-
-					<select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
-						<option value="relevance">Relevance</option>
-						<option value="newest">Newest</option>
-						<option value="oldest">Oldest</option>
-					</select>
-				</div>
-
-				<div className="filters-row">
-					<label className="inline">
-						<span>Language</span>
-						<select value={language} onChange={(e) => setLanguage(e.target.value)}>
-							<option value="">Any</option>
-							<option value="eng">English</option>
-							<option value="spa">Spanish</option>
-							<option value="fre">French</option>
-							<option value="ger">German</option>
-							<option value="ita">Italian</option>
-						</select>
-					</label>
-					<label className="inline checkbox">
-						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
-						<span>Ebooks only</span>
-					</label>
-					<label className="inline year">
-						<span>Year from</span>
-						<input inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
-					</label>
-					<label className="inline year">
-						<span>to</span>
-						<input inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
-					</label>
-				</div>
-			</section>
-
-			<section className="meta">
-				{loading && <div className="status">Loading…</div>}
-				{!loading && error && <div className="status error">{error}</div>}
-				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
-			</section>
-
-			<section className="results">
-				{!loading && !error && results.length === 0 && query && (
-					<div className="empty">No results. Try different terms or filters.</div>
-				)}
-				<ul className="grid">
+	return (
+		<div className="max-w-[1100px] mx-auto p-6">
+			<header>
+				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
+				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
+			</header>
+
+			<section className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 grid gap-3">
+				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
+					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
+						<option value="title">Title</option>
+						<option value="author">Author</option>
+						<option value="subject">Subject</option>
+						<option value="isbn">ISBN</option>
+						<option value="all">All</option>
+					</select>
+
+					<input
+						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
+						value={query}
+						onChange={(e) => setQuery(e.target.value)}
+						placeholder="Search books..."
+						aria-label="Search query"
+					/>
+
+					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
+						<option value="relevance">Relevance</option>
+						<option value="newest">Newest</option>
+						<option value="oldest">Oldest</option>
+					</select>
+				</div>
+
+				<div className="flex flex-wrap gap-3">
+					<label className="inline-flex items-center gap-2">
+						<span>Language</span>
+						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
+							<option value="">Any</option>
+							<option value="eng">English</option>
+							<option value="spa">Spanish</option>
+							<option value="fre">French</option>
+							<option value="ger">German</option>
+							<option value="ita">Italian</option>
+						</select>
+					</label>
+					<label className="inline-flex items-center gap-1.5">
+						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
+						<span>Ebooks only</span>
+					</label>
+					<label className="inline-flex items-center gap-2">
+						<span>Year from</span>
+						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
+					</label>
+					<label className="inline-flex items-center gap-2">
+						<span>to</span>
+						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
+					</label>
+				</div>
+			</section>
+
+			<section className="my-3 min-h-6">
+				{loading && <div className="text-slate-400">Loading…</div>}
+				{!loading && error && <div className="text-red-400">{error}</div>}
+				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
+			</section>
+
+			<section className="mt-2">
+				{!loading && !error && results.length === 0 && query && (
+					<div className="text-slate-400">No results. Try different terms or filters.</div>
+				)}
+				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
*** End Patch
```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="search-row">
					<select value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="filters-row">
					<label className="inline">
						<span>Language</span>
						<select value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline checkbox">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline year">
						<span>Year from</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline year">
						<span>to</span>
						<input inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="status">Loading…</div>}
				{!loading && error && <div className="status error">{error}</div>}
				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="results">
				{!loading && !error && results.length === 0 && query && (
					<div className="empty">No results. Try different terms or filters.</div>
				)}
				<ul className="grid">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						const isFav = Boolean(favorites[doc.key || doc.cover_edition_key || doc.edition_key?.[0]])
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="card">
								<button className="cover-btn" onClick={() => openDetails(doc)}>
									<img src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div className="info">
									<h3 title={doc.title}>{doc.title}</h3>
									<p className="sub">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="meta-line">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="actions">
										<button className="secondary" onClick={() => openDetails(doc)}>Details</button>
										<button className={isFav ? 'danger' : 'primary'} onClick={() => toggleFavorite(doc)}>
											{isFav ? 'Remove Favorite' : 'Add Favorite'}
										</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="pagination">
					<button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="modal" role="dialog" aria-modal="true">
					<div className="modal-content">
						<button className="close" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2>{activeWork.doc.title}</h2>
						<p className="sub">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="status">Loading details…</div>}
						{detailsError && <div className="status error">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div className="details">
								{workDetails.description && (
									<p className="desc">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="meta-line"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="favorites">
				<h2>Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="empty">No favorites yet.</p>}
				<ul className="fav-grid">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="fav-card">
							<img src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="fav-title">{fav.title}</p>
								<p className="fav-sub">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="danger" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

I updated the header to Tailwind classes and will now fix a syntax issue and continue converting the controls section to inline Tailwind utility classes.

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="status">Loading…</div>}
				{!loading && error && <div className="status error">{error}</div>}
				{!loading && !error && query && <div className="status">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="results">
				{!loading && !error && results.length === 0 && query && (
					<div className="empty">No results. Try different terms or filters.</div>
				)}
				<ul className="grid">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						const isFav = Boolean(favorites[doc.key || doc.cover_edition_key || doc.edition_key?.[0]])
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="card">
								<button className="cover-btn" onClick={() => openDetails(doc)}>
									<img src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div className="info">
									<h3 title={doc.title}>{doc.title}</h3>
									<p className="sub">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="meta-line">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="actions">
										<button className="secondary" onClick={() => openDetails(doc)}>Details</button>
										<button className={isFav ? 'danger' : 'primary'} onClick={() => toggleFavorite(doc)}>
											{isFav ? 'Remove Favorite' : 'Add Favorite'}
										</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="pagination">
					<button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="modal" role="dialog" aria-modal="true">
					<div className="modal-content">
						<button className="close" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2>{activeWork.doc.title}</h2>
						<p className="sub">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="status">Loading details…</div>}
						{detailsError && <div className="status error">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div className="details">
								{workDetails.description && (
									<p className="desc">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="meta-line"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="favorites">
				<h2>Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="empty">No favorites yet.</p>}
				<ul className="fav-grid">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="fav-card">
							<img src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="fav-title">{fav.title}</p>
								<p className="fav-sub">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="danger" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						const isFav = Boolean(favorites[doc.key || doc.cover_edition_key || doc.edition_key?.[0]])
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
										<button className={isFav ? 'h-10 rounded-lg bg-red-400 text-slate-900 px-2.5' : 'h-10 rounded-lg bg-blue-400 text-slate-900 px-2.5'} onClick={() => toggleFavorite(doc)}>
											{isFav ? 'Remove Favorite' : 'Add Favorite'}
										</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="mt-7">
				<h2 className="text-xl font-semibold">Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="text-slate-400">No favorites yet.</p>}
				<ul className="grid gap-3 list-none p-0 m-0 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 grid gap-2.5 items-center [grid-template-columns:64px_1fr_auto]">
							<img className="w-16 h-24 object-cover rounded-md border border-slate-700/60" src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="m-0 text-[15px]">{fav.title}</p>
								<p className="mt-1 text-slate-400 text-[13px]">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="h-10 rounded-lg bg-red-400 text-slate-900 px-2.5" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

- Converted the page container, header, controls, results, pagination, modal, and favorites to Tailwind utility classes inline in `src/App.jsx`.
- Tailwind is imported in `src/index.css`, so styles should apply immediately at http://localhost:5174.

Want me to remove `src/App.css` entirely now?

---

**User**

there is no tailwind css applied in ui, on the webpage it only showing the structure

---

**Cursor**

I’ll add the missing PostCSS config so Tailwind can process styles, then restart the dev server to apply it.

```javascript
export default {
	plugins: {
		tailwindcss: {},
		autoprefixer: {},
	},
}
```

```javascript
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: { extend: {} },
	plugins: [],
}
```

---

**User**

getting some erors in my terminal check it and fix it

---

**Cursor**

I see the dev server error indicates Tailwind v4 requires the new PostCSS plugin. I’ll install `@tailwindcss/postcss`, update `postcss.config.js` to use it, and restart the server.

```javascript
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default {
	plugins: [tailwindcss(), autoprefixer()],
}

```

---

**User**

remove the feature of add favroute 

---

**Cursor**

I'll remove the "Add/Remove Favorite" buttons from result cards and delete the bottom Favorites section from `src/App.jsx`. Then I'll verify the app builds without those UI elements.

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [favorites, setFavorites] = useState(() => {
		try {
			const raw = localStorage.getItem('bf_favorites')
			return raw ? JSON.parse(raw) : {}
		} catch {
			return {}
		}
	})
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// Persist favorites
	useEffect(() => {
		try {
			localStorage.setItem('bf_favorites', JSON.stringify(favorites))
		} catch {}
	}, [favorites])

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	function toggleFavorite(doc) {
		const key = doc.key || doc.cover_edition_key || doc.edition_key?.[0]
		if (!key) return
		setFavorites((prev) => {
			const next = { ...prev }
			if (next[key]) delete next[key]
			else next[key] = {
				key,
				title: doc.title,
				author_name: doc.author_name,
				first_publish_year: doc.first_publish_year,
				cover_i: doc.cover_i,
			}
			return next
		})
	}

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			<section className="mt-7">
				<h2 className="text-xl font-semibold">Favorites</h2>
				{Object.keys(favorites).length === 0 && <p className="text-slate-400">No favorites yet.</p>}
				<ul className="grid gap-3 list-none p-0 m-0 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
					{Object.values(favorites).map((fav) => (
						<li key={fav.key} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2.5 grid gap-2.5 items-center [grid-template-columns:64px_1fr_auto]">
							<img className="w-16 h-24 object-cover rounded-md border border-slate-700/60" src={buildCoverUrl(fav)} alt={fav.title} />
							<div>
								<p className="m-0 text-[15px]">{fav.title}</p>
								<p className="mt-1 text-slate-400 text-[13px]">{fav.author_name?.slice(0, 2).join(', ') || 'Unknown'}</p>
							</div>
							<button className="h-10 rounded-lg bg-red-400 text-slate-900 px-2.5" onClick={() => toggleFavorite(fav)}>Remove</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	)
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [yearFrom, setYearFrom] = useState('')
	const [yearTo, setYearTo] = useState('')
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
	)
}

export default App

```

- Removed Add/Remove Favorite button from each result card.
- Deleted the Favorites section and all related state/effects from `src/App.jsx`.
- Fixed Tailwind setup by installing `@tailwindcss/postcss` and updating `postcss.config.js`. Dev server is running at http://localhost:5173.

Anything else you want adjusted (e.g., more filters or a grid view)?

---

**User**

remove the year filter 

---

**Cursor**

I'll remove the year filter inputs and related state from `src/App.jsx`.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

	return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
	)
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, yearFrom, yearTo, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// year range
		if (yearFrom || yearTo) {
			const from = yearFrom || '*'
			const to = yearTo || '*'
			params.set('published_in', `${from}-${to}`)
		}
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
					<label className="inline-flex items-center gap-2">
						<span>Year from</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="e.g. 1990" />
					</label>
					<label className="inline-flex items-center gap-2">
						<span>to</span>
						<input className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 w-24 placeholder-slate-500" inputMode="numeric" pattern="[0-9]*" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="e.g. 2024" />
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [language, setLanguage] = useState('') // ISO639-2 e.g. eng, spa, fre
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Done! I've removed the year filter:

- Removed `yearFrom` and `yearTo` state variables
- Removed year filter inputs from the UI
- Removed year range logic from `buildParams()`
- Updated useEffect dependencies to exclude year variables

The app now has a cleaner filter section with just Language and Ebooks only options. The dev server should reflect these changes at http://localhost:5173.

---

**User**

remove the language filter to

---

**Cursor**

I'll remove the language filter state, UI elements, and related logic from `src/App.jsx`.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, language, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, language, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// language
		if (language) params.set('language', language)
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

				<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-2">
						<span>Language</span>
						<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={language} onChange={(e) => setLanguage(e.target.value)}>
							<option value="">Any</option>
							<option value="eng">English</option>
							<option value="spa">Spanish</option>
							<option value="fre">French</option>
							<option value="ger">German</option>
							<option value="ita">Italian</option>
						</select>
					</label>
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
      </div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [sort, setSort] = useState('relevance') // relevance | newest | oldest
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Done! I've removed the language filter:

- Removed `language` state variable
- Removed language filter dropdown from the UI
- Removed language parameter logic from `buildParams()`
- Updated useEffect dependencies to exclude language variable

Now the app has a minimal filter section with just the "Ebooks only" checkbox. The interface is cleaner and simpler.

---

**User**

also remove the relevance filter

---

**Cursor**

I'll remove the sort/relevance filter dropdown from the UI and related logic from `src/App.jsx`.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly, sort])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, sort, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// sort
		if (sort === 'newest') params.set('sort', 'new')
		if (sort === 'oldest') params.set('sort', 'old')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr_160px] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort results">
						<option value="relevance">Relevance</option>
						<option value="newest">Newest</option>
						<option value="oldest">Oldest</option>
					</select>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header>
				<h1 className="m-0 mb-1 text-2xl font-semibold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Done! I've removed the relevance/sort filter:

- Removed `sort` state variable
- Removed the sort dropdown from the UI
- Removed sort parameter logic from `buildParams()`
- Updated useEffect dependencies to exclude sort variable
- Updated the grid layout from 3 columns to 2 columns (query type + search input)

Now the app has a very clean interface with just:
- Query type selector (Title/Author/Subject/ISBN/All)
- Search input
- Ebooks only checkbox

The interface is now minimal and focused on the core search functionality.

---

**User**

move the "book finder" to the middle  also make its font size big

---

**Cursor**

I'll center the "Book Finder" title and make it larger by updating the header styling in `src/App.jsx`.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1100px] mx-auto p-6">
			<header className="text-center">
				<h1 className="m-0 mb-1 text-5xl font-bold">Book Finder</h1>
				<p className="m-0 mb-4 text-slate-400">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've updated the header to:

- Center the title with `text-center` class
- Made the "Book Finder" title much larger with `text-5xl` (instead of `text-2xl`)
- Made it bolder with `font-bold` (instead of `font-semibold`)

The title is now prominently displayed in the center of the page with a large, bold font that will be much more eye-catching.

---

**User**

make the theme of the page like netflix page

---

**Cursor**

I'll update the theme to match Netflix's dark design with red accents, black background, and Netflix-style typography and spacing.


```css
@import "tailwindcss";

/* Base tweaks */
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { @apply m-0 bg-black text-white font-sans; }

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="controls">
				<div className="grid gap-3 [grid-template-columns:140px_1fr] max-[720px]:grid-cols-1">
					<select className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 placeholder-slate-500"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

								<div className="flex flex-wrap gap-3">
					<label className="inline-flex items-center gap-1.5">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} />
						<span>Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="meta">
				{loading && <div className="text-slate-400">Loading…</div>}
				{!loading && error && <div className="text-red-400">{error}</div>}
				{!loading && !error && query && <div className="text-slate-400">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section className="mt-2">
				{!loading && !error && results.length === 0 && query && (
					<div className="text-slate-400">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
							<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-2 grid gap-2 items-start [grid-template-columns:96px_1fr]">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-24 h-36 object-cover rounded-lg border border-slate-700/60" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
        </button>
								<div>
									<h3 className="m-0 mb-1 text-base" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-1.5 text-slate-400 text-sm">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-2 text-slate-400 text-[13px]">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-2">
										<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-700 text-slate-100 px-2.5" onClick={() => openDetails(doc)}>Details</button>
									</div>
      </div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 transition-colors">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-3 my-4">
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span>
						Page {page} of {totalPages}
					</span>
					<button className="h-10 rounded-lg border border-slate-700/60 bg-slate-800 text-slate-100 px-2.5 disabled:opacity-60" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 transition-colors">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/50 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-4 w-full max-w-[800px] relative">
						<button className="absolute right-2 top-2 w-8 h-8 rounded-full" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-xl font-semibold">{activeWork.doc.title}</h2>
						<p className="m-0 mb-1.5 text-slate-400 text-sm">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-slate-400">Loading details…</div>}
						{detailsError && <div className="text-red-400">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-slate-100 leading-relaxed">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 mb-2 text-slate-400 text-[13px]"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 transition-colors">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've transformed the Book Finder app to have a Netflix-style theme:

**Netflix Design Elements Applied:**
- **Black background** (`bg-black`) instead of slate
- **Red accent color** (`text-red-600`) for the main title, matching Netflix's signature red
- **Larger, bolder typography** with better spacing and hierarchy
- **Gray color palette** (`gray-800`, `gray-900`) for cards and inputs
- **Hover effects** with smooth transitions
- **Larger interactive elements** (buttons, inputs) for better UX
- **Enhanced shadows and borders** for depth
- **Better spacing and padding** throughout
- **Improved modal design** with darker overlay and better contrast

The app now has that premium, dark Netflix aesthetic with the signature red branding, larger text, and smooth hover animations. The interface feels more modern and polished!

---

**User**

on hover the card of book detail should grow little big

---

**Cursor**

I'll add a hover effect to make the book cards grow slightly when hovered over.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-black min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold text-red-600 tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've added a hover effect to the book cards that will:

- **Scale up by 5%** (`hover:scale-105`) when hovered
- **Smooth transition** with `transition-all duration-300 ease-in-out` for a polished animation
- **Keep the existing background color change** on hover

Now when you hover over any book card, it will smoothly grow slightly larger, giving it a nice interactive feel similar to Netflix's card hover effects. The animation is smooth and subtle, enhancing the user experience without being distracting.

---

**User**

add some more colors of netflix page to this page

---

**Cursor**

I'll add more Netflix-style colors and visual elements to make the page more vibrant and Netflix-like.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 mb-8">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:outline-none" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-700 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:outline-none"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-gray-400 text-lg">Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg">{error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gray-800/80 hover:scale-105 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span>{doc.first_publish_year || '—'}</span>
										{doc.language && <span> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-gray-600 bg-gray-800 text-white px-4 hover:bg-gray-700 transition-colors" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-6 disabled:opacity-50 hover:bg-gray-700 transition-colors" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/80 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-[900px] relative">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-gray-400 text-lg">Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg">{detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong>Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 bg-gradient-to-b from-gray-900 via-black to-gray-900 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/90 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-[900px] relative shadow-2xl">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong className="text-red-400">Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've added many more Netflix-style colors and visual enhancements:

**New Netflix Colors & Effects Added:**

🎨 **Background & Gradients:**
- Gradient background from gray-900 to black to gray-900
- Gradient title with red color transitions
- Gradient search section background
- Gradient book cards with hover effects

🔴 **Red Accent Colors:**
- Red gradient buttons with hover effects
- Red focus rings on inputs
- Red shadows on hover
- Red close button in modal
- Red accent text for subjects

💙 **Status Colors:**
- Blue loading spinner with animation
- Green success messages with background
- Red error messages with warning icons
- Color-coded status indicators

✨ **Enhanced Visual Effects:**
- Red shadow glows on hover
- Gradient button backgrounds
- Animated loading spinners
- Enhanced shadows and borders
- Color transitions on hover
- Badge-style year indicators

🎭 **Interactive Elements:**
- Red gradient buttons throughout
- Hover color changes (titles turn red on hover)
- Enhanced focus states with red rings
- Smooth color transitions

The page now has a much more vibrant, Netflix-like appearance with rich colors, gradients, and smooth animations that create an engaging, premium feel!

---

**User**

cover the whole backgroud with that gradiant not just some part

---

**Cursor**

I'll update the background to cover the entire viewport with the gradient, not just the container.


```css
@import "tailwindcss";

/* Base tweaks */
* { box-sizing: border-box; }
html, body, #root { height: 100%; }
body { @apply m-0 bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white font-sans; }

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/90 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-[900px] relative shadow-2xl">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong className="text-red-400">Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've moved the gradient background to cover the entire viewport:

**Changes Made:**
- **Moved gradient to `body`** in `src/index.css` - now the gradient covers the entire browser window
- **Removed gradient from container** in `src/App.jsx` - the container is now transparent and lets the body gradient show through
- **Full viewport coverage** - the gradient now extends from top to bottom of the entire screen

Now the beautiful gray-to-black-to-gray gradient covers the entire background of the page, creating a seamless, immersive Netflix-style experience that extends beyond just the content area!

---

**User**

remove the check box which is before the result found and also remove the green color of the the found result background and its border

---

**Cursor**

I'll remove the "Ebooks only" checkbox and remove the green background/border from the results count message.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>


			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-green-400 text-lg bg-green-500/10 border border-green-500/20 rounded-lg p-3">✅ Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/90 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-[900px] relative shadow-2xl">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong className="text-red-400">Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>


			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/90 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-[900px] relative shadow-2xl">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong className="text-red-400">Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've made the requested changes:

**Removed:**
- ✅ **"Ebooks only" checkbox** - completely removed from the search controls
- ✅ **Green background and border** from the results count message

**Updated:**
- The results count now shows as simple gray text (`text-gray-300`) without any background or border
- The search section is now cleaner with just the query type selector and search input

The interface is now more streamlined and focused on the core search functionality without the extra filter option and colorful result count styling.

---

**User**

dont remove the ebook tickbox , just the tickbox which is before the result found

---

**Cursor**

I understand! You want to keep the "Ebooks only" checkbox but remove the checkbox that appears before the "Found X results" message. Let me restore the "Ebooks only" checkbox and check if there's another checkbox I need to remove.


```javascriptreact
import { useEffect, useMemo, useRef, useState } from 'react'

const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'

function buildCoverUrl(doc) {
	if (doc.cover_i) {
		return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
	}
	if (doc.isbn && doc.isbn.length > 0) {
		return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`
	}
	return 'https://via.placeholder.com/128x192?text=No+Cover'
}

function App() {
	const [query, setQuery] = useState('')
	const [queryType, setQueryType] = useState('title') // title | author | subject | isbn | all
	const [ebookOnly, setEbookOnly] = useState(false)
	const [page, setPage] = useState(1)
	const [results, setResults] = useState([])
	const [numFound, setNumFound] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	// favorites removed
	const [activeWork, setActiveWork] = useState(null)
	const [workDetails, setWorkDetails] = useState(null)
	const [detailsLoading, setDetailsLoading] = useState(false)
	const [detailsError, setDetailsError] = useState('')

	// favorites removed

	// Debounce search
	const debounceRef = useRef(null)
	useEffect(() => {
		setPage(1)
	}, [query, queryType, ebookOnly])

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchResults()
		}, 400)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [query, queryType, ebookOnly, page])

	function buildParams() {
		const params = new URLSearchParams()
		// query
		if (query && query.trim()) {
			if (queryType === 'all') {
				params.set('q', query.trim())
			} else {
				params.set(queryType, query.trim())
			}
		} else {
			params.set('q', '')
		}
		// ebooks
		if (ebookOnly) params.set('has_fulltext', 'true')
		// page
		params.set('page', String(page))
		params.set('limit', '20')
		return params
	}

	async function fetchResults() {
		setLoading(true)
		setError('')
		try {
			const params = buildParams()
			const url = `${OPEN_LIBRARY_SEARCH}?${params.toString()}`
			const res = await fetch(url)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			setResults(data.docs || [])
			setNumFound(data.numFound || 0)
		} catch (err) {
			setError('Failed to fetch results. Please try again.')
			setResults([])
			setNumFound(0)
		} finally {
			setLoading(false)
		}
	}

	// favorites removed

	const totalPages = useMemo(() => {
		return Math.max(1, Math.ceil(numFound / 20))
	}, [numFound])

	function openDetails(doc) {
		const workKey = (doc.key || '').startsWith('/works/') ? doc.key : null
		if (!workKey) return
		setActiveWork({ workKey, doc })
		setDetailsLoading(true)
		setDetailsError('')
		setWorkDetails(null)
		fetch(`https://openlibrary.org${workKey}.json`)
			.then((r) => {
				if (!r.ok) throw new Error('Network error')
				return r.json()
			})
			.then((data) => setWorkDetails(data))
			.catch(() => setDetailsError('Failed to load details'))
			.finally(() => setDetailsLoading(false))
	}

	function closeDetails() {
		setActiveWork(null)
		setWorkDetails(null)
		setDetailsError('')
	}

  return (
		<div className="max-w-[1200px] mx-auto p-8 min-h-screen">
			<header className="text-center mb-12">
				<h1 className="m-0 mb-4 text-6xl font-bold bg-gradient-to-r from-red-600 via-red-500 to-red-600 bg-clip-text text-transparent tracking-tight">Book Finder</h1>
				<p className="m-0 text-xl text-gray-300 font-light">Search Open Library by title, author, subject, or ISBN.</p>
			</header>

			<section className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 border border-gray-700 rounded-lg p-6 mb-8 shadow-2xl">
				<div className="grid gap-4 [grid-template-columns:160px_1fr] max-[720px]:grid-cols-1 mb-4">
					<select className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all" value={queryType} onChange={(e) => setQueryType(e.target.value)} aria-label="Query type">
						<option value="title">Title</option>
						<option value="author">Author</option>
						<option value="subject">Subject</option>
						<option value="isbn">ISBN</option>
						<option value="all">All</option>
					</select>
					<input
						className="h-12 rounded-md border border-gray-600 bg-gray-800 text-white px-4 text-lg placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Search books..."
						aria-label="Search query"
					/>
				</div>

				<div className="flex flex-wrap gap-4">
					<label className="inline-flex items-center gap-2 text-gray-300">
						<input type="checkbox" checked={ebookOnly} onChange={(e) => setEbookOnly(e.target.checked)} className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
						<span className="text-lg">Ebooks only</span>
					</label>
				</div>
			</section>

			<section className="mb-6">
				{loading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading…</div>}
				{!loading && error && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {error}</div>}
				{!loading && !error && query && <div className="text-gray-300 text-lg">Found {numFound.toLocaleString()} results</div>}
			</section>

			<section>
				{!loading && !error && results.length === 0 && query && (
					<div className="text-gray-400 text-lg text-center py-12">No results. Try different terms or filters.</div>
				)}
				<ul className="list-none p-0 m-0 grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
					{results.map((doc) => {
						const cover = buildCoverUrl(doc)
						return (
														<li key={(doc.key || doc.cover_edition_key || doc.edition_key?.[0]) + (doc.first_publish_year || '')} className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-gray-700 rounded-lg p-4 grid gap-4 items-start [grid-template-columns:120px_1fr] hover:bg-gradient-to-br hover:from-gray-800/90 hover:to-gray-700/90 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/10 transition-all duration-300 ease-in-out">
								<button className="border-0 p-0 bg-transparent cursor-pointer group" onClick={() => openDetails(doc)}>
									<img className="w-30 h-44 object-cover rounded-md shadow-lg group-hover:shadow-red-500/20 transition-shadow duration-300" src={cover} alt={`Cover of ${doc.title}`} loading="lazy" />
								</button>
								<div>
									<h3 className="m-0 mb-2 text-lg font-semibold text-white group-hover:text-red-400 transition-colors" title={doc.title}>{doc.title}</h3>
									<p className="m-0 mb-2 text-gray-400 text-base">{doc.author_name?.slice(0, 3).join(', ') || 'Unknown author'}</p>
									<p className="m-0 mb-3 text-gray-500 text-sm">
										<span className="bg-gray-800 px-2 py-1 rounded text-xs">{doc.first_publish_year || '—'}</span>
										{doc.language && <span className="ml-2 text-gray-500"> · {doc.language.slice(0, 3).join(', ')}</span>}
									</p>
									<div className="flex gap-3">
										<button className="h-10 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" onClick={() => openDetails(doc)}>Details</button>
									</div>
								</div>
							</li>
						)
					})}
				</ul>
			</section>

			{totalPages > 1 && (
				<nav className="flex items-center justify-center gap-4 my-8">
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
					<span className="text-gray-300 text-lg bg-gray-800 px-4 py-2 rounded-md border border-gray-700">
						Page {page} of {totalPages}
					</span>
					<button className="h-12 rounded-md border border-red-600 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 disabled:border-gray-600 hover:from-red-500 hover:to-red-400 hover:shadow-lg hover:shadow-red-500/25 transition-all duration-200" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
				</nav>
			)}

			{activeWork && (
				<div className="fixed inset-0 bg-black/90 grid place-items-center p-5" role="dialog" aria-modal="true">
					<div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-[900px] relative shadow-2xl">
						<button className="absolute right-4 top-4 w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-500 transition-colors" onClick={closeDetails} aria-label="Close details">✕</button>
						<h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent">{activeWork.doc.title}</h2>
						<p className="m-0 mb-4 text-gray-400 text-lg">{activeWork.doc.author_name?.join(', ') || 'Unknown author'}</p>
						{detailsLoading && <div className="text-blue-400 text-lg flex items-center gap-2"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>Loading details…</div>}
						{detailsError && <div className="text-red-500 text-lg bg-red-500/10 border border-red-500/20 rounded-lg p-3">⚠️ {detailsError}</div>}
						{!detailsLoading && workDetails && (
							<div>
								{workDetails.description && (
									<p className="text-gray-200 leading-relaxed text-lg mb-4 bg-gray-800/50 p-4 rounded-lg border border-gray-700">
										{typeof workDetails.description === 'string' ? workDetails.description : workDetails.description?.value}
									</p>
								)}
								{workDetails.subjects && workDetails.subjects.length > 0 && (
									<p className="m-0 text-gray-400 text-base"><strong className="text-red-400">Subjects:</strong> {workDetails.subjects.slice(0, 12).join(', ')}{workDetails.subjects.length > 12 ? '…' : ''}</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{/* favorites removed */}
		</div>
  )
}

export default App

```

Perfect! I've restored the "Ebooks only" checkbox in the search controls section. 

Now you have:
- ✅ **"Ebooks only" checkbox** - restored in the search controls
- ✅ **Simple results count** - without green background/border, just gray text

The "Ebooks only" checkbox is back where it belongs in the search controls, and the results count message remains clean without the green styling.

