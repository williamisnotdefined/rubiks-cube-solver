import cls from 'classnames'

type LoadingIndicatorProps = {
  className?: string
  decorative?: boolean
  label?: string
}

export function LoadingIndicator({
  className,
  decorative = false,
  label = 'Loading',
}: LoadingIndicatorProps) {
  return (
    <span
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : label}
      className={cls(
        'inline-block size-5 border-2 border-current border-t-transparent align-middle animate-spin',
        className,
      )}
    />
  )
}
