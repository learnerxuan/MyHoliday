export const DEFAULT_MARKETPLACE_PLATFORM_FEE_RATE = 0.1

export function resolveMarketplacePlatformFeeRate(value?: string | number | null) {
  const configured = Number(value)

  if (!Number.isFinite(configured) || configured < 0 || configured >= 1) {
    return DEFAULT_MARKETPLACE_PLATFORM_FEE_RATE
  }

  return configured
}
