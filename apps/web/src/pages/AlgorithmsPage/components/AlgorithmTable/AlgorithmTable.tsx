import { useTranslation } from 'react-i18next'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/Table'
import type { AlgorithmCase } from '../../sets/types'

export function AlgorithmTable({ altPrefix, cases }: { altPrefix: string; cases: AlgorithmCase[] }) {
  const { t } = useTranslation()

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      <Table className="min-w-[44rem]">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-20 text-center">{t('algorithms.table.name')}</TableHead>
            <TableHead className="w-44 text-center">{t('algorithms.table.case')}</TableHead>
            <TableHead className="text-center">{t('algorithms.table.algorithm')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem, index) => (
            <TableRow key={`${caseItem.name}-${index}`}>
              <TableCell className="px-3 py-4 text-center text-base font-medium">
                {caseItem.name}
              </TableCell>
              <TableCell className="px-3 py-3 text-center">
                <img
                  alt={`${altPrefix} ${caseItem.name}`}
                  className="mx-auto max-h-28 max-w-40 object-contain"
                  loading="lazy"
                  src={caseItem.image}
                />
              </TableCell>
              <TableCell className="px-4 py-4 text-center font-mono text-sm sm:text-base">
                {caseItem.algorithm}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
