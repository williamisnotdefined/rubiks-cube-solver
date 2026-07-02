import { useTranslation } from 'react-i18next'
import type { AlgorithmCase } from '../../sets/types'

export function AlgorithmTable({ altPrefix, cases }: { altPrefix: string; cases: AlgorithmCase[] }) {
  const { t } = useTranslation()

  return (
    <div className="overflow-x-auto border border-app-text bg-app-surface">
      <table className="w-full min-w-[44rem] border-collapse text-app-text">
        <thead>
          <tr className="bg-app-control text-sm font-black uppercase tracking-[0.08em]">
            <th className="w-20 border border-app-text px-3 py-2 text-center">{t('algorithms.table.name')}</th>
            <th className="w-44 border border-app-text px-3 py-2 text-center">{t('algorithms.table.case')}</th>
            <th className="border border-app-text px-3 py-2 text-center">{t('algorithms.table.algorithm')}</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((caseItem, index) => (
            <tr key={`${caseItem.name}-${index}`}>
              <td className="border border-app-text px-3 py-4 text-center text-base font-semibold">
                {caseItem.name}
              </td>
              <td className="border border-app-text px-3 py-3 text-center">
                <img
                  alt={`${altPrefix} ${caseItem.name}`}
                  className="mx-auto max-h-28 max-w-40 object-contain"
                  loading="lazy"
                  src={caseItem.image}
                />
              </td>
              <td className="border border-app-text px-4 py-4 text-center font-mono text-sm font-semibold sm:text-base">
                {caseItem.algorithm}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
