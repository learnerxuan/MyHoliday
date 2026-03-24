'use client'

const TYPE_LABEL = {
  hotel:      'Hotel',
  restaurant: 'Restaurant',
  attraction: 'Attraction',
}

const TYPE_COLOUR = {
  hotel:      'bg-amber text-warmwhite',
  restaurant: 'bg-success text-warmwhite',
  attraction: 'bg-charcoal text-warmwhite',
}

// Renders filled + empty stars from a numeric rating (e.g. 4.2 → ★★★★☆)
function StarRating({ rating }) {
  if (!rating) return null
  const full  = Math.floor(rating)
  const half  = rating - full >= 0.5 ? 1 : 0
  const empty = 5 - full - half

  return (
    <span className="text-amber text-xs tracking-tight" aria-label={`${rating} out of 5`}>
      {'★'.repeat(full)}
      {half ? '½' : ''}
      <span className="text-border">{'★'.repeat(empty)}</span>
      <span className="ml-1 text-secondary">{rating.toFixed(1)}</span>
    </span>
  )
}

export default function OptionsPanel({ options = [], selectedNames = new Set(), onSelect, onDone }) {
  if (options.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-3 px-4">
        <span className="text-4xl">🏨</span>
        <p className="text-sm font-body text-secondary">
          Options will appear here when the AI suggests alternatives.
        </p>
        <p className="text-xs text-tertiary">
          Try asking: "Find me a halal restaurant near the hotel."
        </p>
      </div>
    )
  }

  const addedCount = [...selectedNames].filter(n => options.some(o => o.name === n)).length

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-white shrink-0">
        <p className="text-xs text-secondary font-body">
          {options.length} option{options.length > 1 ? 's' : ''}
          {addedCount > 0 && (
            <span className="ml-1.5 text-success font-semibold">· {addedCount} added</span>
          )}
        </p>
        {addedCount > 0 && (
          <button
            onClick={onDone}
            className="text-xs font-semibold font-body bg-charcoal text-warmwhite px-3 py-1 rounded-md hover:bg-amber transition-colors"
          >
            Done ✓
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {options.map((option, i) => (
          <OptionCard
            key={i}
            option={option}
            index={i + 1}
            isAdded={selectedNames.has(option.name)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

// ── Option Card ──────────────────────────────────────────────

function OptionCard({ option, index, isAdded, onSelect }) {
  const typeLabel  = TYPE_LABEL[option.type]  ?? option.type
  const typeColour = TYPE_COLOUR[option.type] ?? 'bg-muted text-charcoal'

  return (
    <div className={`border rounded-xl overflow-hidden bg-white transition-colors
      ${isAdded ? 'border-success' : 'border-border hover:border-amber'}`}>

      {/* Image */}
      <div className="relative w-full h-36 bg-muted">
        {option.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.image_url}
            alt={option.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div
          className="flex items-center justify-center h-full text-3xl"
          style={{ display: option.image_url ? 'none' : 'flex' }}
        >
          {option.type === 'hotel' ? '🏨' : option.type === 'restaurant' ? '🍽' : '🎯'}
        </div>

        {/* Type badge overlaid on image */}
        <span className={`absolute top-2 left-2 text-xs font-semibold font-body px-2 py-0.5 rounded-md ${typeColour}`}>
          {typeLabel}
        </span>

        {/* Option number */}
        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-charcoal text-warmwhite text-xs font-bold flex items-center justify-center">
          {index}
        </span>
      </div>

      {/* Details */}
      <div className="p-3 space-y-1">
        <h4 className="text-sm font-semibold font-body text-charcoal leading-snug">
          {option.name}
        </h4>

        <div className="flex items-center justify-between gap-2">
          {option.rating && <StarRating rating={option.rating} />}
          {(option.price ?? option.price_estimate) && (
            <span className="text-xs font-semibold text-amber">
              {option.price ?? option.price_estimate}
            </span>
          )}
        </div>

        {option.notes && (
          <p className="text-xs text-tertiary leading-snug">{option.notes}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSelect(option)}
            className={`flex-1 text-xs font-semibold font-body py-2 rounded-lg transition-colors
              ${isAdded
                ? 'bg-success-bg text-success cursor-default'
                : 'bg-amber text-warmwhite hover:bg-amberdark'}`}
          >
            {isAdded ? 'Added ✓' : 'Select'}
          </button>
          {option.booking_url && (
            <a
              href={option.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 border border-border rounded-lg text-xs font-semibold text-secondary hover:border-amber hover:text-amber transition-colors"
            >
              View on Maps
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
