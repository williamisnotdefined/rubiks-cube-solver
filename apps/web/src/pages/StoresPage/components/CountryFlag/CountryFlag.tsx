import { AU, BR, CN, ES, GB, IN, JP, US } from 'country-flag-icons/react/3x2'
import type { ComponentProps } from 'react'
import type { StoreCountryCode } from '../../stores'

type CountryFlagProps = ComponentProps<typeof US> & {
  countryCode: StoreCountryCode
}

const flags: Record<StoreCountryCode, typeof US> = {
  AU,
  BR,
  CN,
  ES,
  GB,
  IN,
  JP,
  US,
}

export function CountryFlag({ countryCode, ...props }: CountryFlagProps) {
  const Flag = flags[countryCode]

  return <Flag aria-hidden='true' {...props} />
}
