type VisualizationLoadLayerProps = {
  error?: boolean
  errorLabel?: string
  label: string
  loadingLabel: string
  loadRequested: boolean
  onLoadRequest: () => void
  retryLabel?: string
}

export function VisualizationLoadLayer({
  error = false,
  errorLabel,
  label,
  loadingLabel,
  loadRequested,
  onLoadRequest,
  retryLabel,
}: VisualizationLoadLayerProps) {
  if (error) {
    return (
      <button
        className='grid size-full place-items-center gap-2 px-5 text-center text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
        type='button'
        onClick={onLoadRequest}
      >
        <span>{errorLabel}</span>
        <span className='text-foreground'>{retryLabel}</span>
      </button>
    )
  }

  if (!loadRequested) {
    return (
      <button
        className='grid size-full place-items-center px-5 text-center text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
        type='button'
        onClick={onLoadRequest}
      >
        <span className='flex flex-col items-center gap-3'>
          <span
            className='size-7 animate-spin rounded-full border-2 border-border border-t-muted-foreground'
            aria-hidden='true'
          />
          <span>{label}</span>
        </span>
      </button>
    )
  }

  return (
    <div
      className='grid size-full place-items-center px-5 text-center text-sm text-muted-foreground'
      role='status'
    >
      {loadingLabel}
    </div>
  )
}
