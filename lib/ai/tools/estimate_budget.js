// Pure JS calculation — no external API

export function estimate_budget({
  hotel_price_per_night,
  days,
  guests = 1,
  budget_profile,
  meal_budget_per_day,
  activities_budget,
}) {
  const nights = Math.max(days - 1, 1)

  // Parse RM values — accept numbers or strings like "RM 220/night"
  const parseRM = (val) => {
    if (typeof val === 'number') return val
    const match = String(val).match(/[\d,]+/)
    return match ? parseFloat(match[0].replace(',', '')) : 0
  }

  const hotelRate    = parseRM(hotel_price_per_night)
  const mealRate     = parseRM(meal_budget_per_day) || estimateMealBudget(budget_profile)
  const activitiesRM = parseRM(activities_budget) || estimateActivitiesBudget(days, budget_profile)

  const accommodation = hotelRate * nights
  const food          = mealRate * days * guests
  const activities    = activitiesRM
  const misc          = Math.round((accommodation + food + activities) * 0.1) // 10% buffer

  const total = accommodation + food + activities + misc

  return {
    total_estimate:  `RM ${total.toLocaleString()}`,
    breakdown: {
      accommodation: `RM ${accommodation.toLocaleString()} (${nights} nights × RM ${hotelRate}/night)`,
      food:          `RM ${food.toLocaleString()} (RM ${mealRate}/day × ${days} days × ${guests} pax)`,
      activities:    `RM ${activities.toLocaleString()}`,
      misc:          `RM ${misc.toLocaleString()} (10% buffer)`,
    },
    per_person: guests > 1 ? `RM ${Math.round(total / guests).toLocaleString()} per person` : null,
    budget_profile: budget_profile ?? 'mid-range',
  }
}

function estimateMealBudget(budgetProfile) {
  if (budgetProfile === 'budget') return 45
  if (budgetProfile === 'luxury') return 140
  return 80
}

function estimateActivitiesBudget(days, budgetProfile) {
  if (budgetProfile === 'budget') return days * 50
  if (budgetProfile === 'luxury') return days * 180
  return days * 90
}
