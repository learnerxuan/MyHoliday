import { resolveMarketplacePlatformFeeRate } from './payment-config'

export function getPlatformFeeRate() {
  return resolveMarketplacePlatformFeeRate(process.env.MARKETPLACE_PLATFORM_FEE_RATE)
}

export function calculateMarketplaceAmounts(totalAmount: number) {
  const rate = getPlatformFeeRate()
  const serviceCharge = Math.round(totalAmount * rate * 100) / 100
  const guidePayout = Math.round((totalAmount - serviceCharge) * 100) / 100

  return {
    serviceCharge,
    guidePayout,
    platformFeeRate: rate,
  }
}
