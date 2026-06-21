import { useTranslation } from 'react-i18next'
import type { ScanFaceSymbol } from '@api/solver/types'
import { scanColorCode } from './scanColorSymbols'
import { scanSymbolDetails, scanSymbols } from './scanState'
import { scanColorLabel } from './scanTranslations'

type ScanColorPaletteProps = {
  selectedSymbol?: ScanFaceSymbol
  onSelect: (symbol: ScanFaceSymbol) => void
}

export function ScanColorPalette({ selectedSymbol, onSelect }: ScanColorPaletteProps) {
  const { t } = useTranslation()

  return (
    <div className="grid gap-2" aria-label={t('scan.editor.paletteLabel')} role="group">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-app-muted">
        {t('scan.editor.pickColor')}
      </span>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {scanSymbols.map((symbol) => {
          const details = scanSymbolDetails[symbol]
          const selected = selectedSymbol === symbol

          return (
            <button
              className="min-h-11 border px-2 py-2 text-xs font-extrabold uppercase tracking-[0.12em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-app-focus/50"
              style={{
                backgroundColor: details.background,
                borderColor: selected ? 'var(--app-text)' : 'var(--app-border)',
                color: details.foreground,
              }}
              type="button"
              aria-label={scanColorLabel(t, symbol)}
              aria-pressed={selected}
              title={scanColorLabel(t, symbol)}
              key={symbol}
              onClick={() => onSelect(symbol)}
            >
              {scanColorCode(symbol)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
