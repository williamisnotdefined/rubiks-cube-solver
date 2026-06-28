import { useTranslation } from 'react-i18next'
import type { NotationGuide } from '../../notationGuides'

type NotationSymbolsProps = {
  guide: NotationGuide
}

export function NotationSymbols({ guide }: NotationSymbolsProps) {
  const { t } = useTranslation()

  return (
    <section className="grid gap-3 border border-app-border bg-app-surface p-4">
      <h2 className="text-xl font-black uppercase tracking-[-0.03em] text-app-text sm:text-2xl">
        {t('notations.page.symbolsTitle')}
      </h2>
      <div className="overflow-x-auto border border-app-text bg-app-surface">
        <table className="w-full min-w-[34rem] border-collapse text-app-text">
          <thead>
            <tr className="bg-app-control text-sm font-black uppercase tracking-[0.08em]">
              <th className="w-32 border border-app-text px-3 py-2 text-center">{t('notations.page.symbol')}</th>
              <th className="border border-app-text px-3 py-2 text-center">{t('notations.page.meaning')}</th>
              <th className="w-36 border border-app-text px-3 py-2 text-center">{t('notations.page.example')}</th>
            </tr>
          </thead>
          <tbody>
            {guide.symbols.map((symbol) => (
              <tr key={`${symbol.symbol}-${symbol.example}`}>
                <td className="border border-app-text px-3 py-3 text-center font-mono text-base font-black">
                  {symbol.symbol}
                </td>
                <td className="border border-app-text px-4 py-3 text-sm font-semibold leading-6 text-app-muted">
                  {t(symbol.meaningKey)}
                </td>
                <td className="border border-app-text px-3 py-3 text-center font-mono text-base font-black">
                  {symbol.example}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
