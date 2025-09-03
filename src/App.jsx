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
