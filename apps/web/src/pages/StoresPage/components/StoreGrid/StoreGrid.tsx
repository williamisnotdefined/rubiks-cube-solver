import type { CubingStore } from '../../stores'
import { StoreCard } from '../StoreCard'

type StoreGridProps = {
  stores: readonly CubingStore[]
}

export function StoreGrid({ stores }: StoreGridProps) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
      {stores.map((store) => (
        <StoreCard key={store.id} store={store} />
      ))}
    </div>
  )
}
