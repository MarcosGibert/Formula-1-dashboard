/** Shared wrapper: title, description, filter bar, loading & error states. */
export default function ChartFrame({ title, description, filters, query, children }) {
  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold mb-1">{title}</h1>
      {description && <p className="text-gray-400 text-sm mb-4">{description}</p>}
      {filters && (
        <div className="flex flex-wrap gap-3 items-end bg-panel rounded-lg p-4 mb-6">
          {filters}
        </div>
      )}
      {query?.isLoading && (
        <div className="py-16 text-center text-gray-400">
          <div className="animate-pulse text-lg mb-2">Loading data…</div>
          <p className="text-sm">
            First load can take up to a minute: the free-tier backend wakes from
            sleep and multi-season charts are aggregated from many API calls,
            then cached.
          </p>
        </div>
      )}
      {query?.isError && (
        <div className="py-12 text-center text-red-400">
          <p className="font-semibold mb-1">Couldn&apos;t load this chart.</p>
          <p className="text-sm text-gray-400">{String(query.error?.message)}</p>
        </div>
      )}
      {query?.isSuccess && children}
    </div>
  )
}
