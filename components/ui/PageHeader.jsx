export default function PageHeader({ tag, title }) {
  return (
    <div className="flex flex-col items-start gap-2">
      {tag && <span className="text-sm font-semibold tracking-wider text-amber uppercase font-body">{tag}</span>}
      <h1 className="text-3xl md:text-4xl font-display font-bold text-charcoal leading-tight">
        {title}
      </h1>
    </div>
  )
}
