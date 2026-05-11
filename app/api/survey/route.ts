import { NextResponse } from 'next/server'
import { COUNTRIES } from '@/lib/countries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ACCOMMODATION_TYPES, TRANSPORTATION_TYPES } from '@/lib/survey-options'

const GENDERS = ['Male', 'Female']

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const destination = cleanString(body.destination)
    const duration = Number(body.duration_days)
    const age = Number(body.traveler_age)
    const gender = cleanString(body.traveler_gender)
    const nationality = cleanString(body.traveler_nationality)
    const accommodationType = cleanString(body.accommodation_type)
    const accommodationCost = Number(body.accommodation_cost)
    const transportationType = cleanString(body.transportation_type)
    const transportationCost = Number(body.transportation_cost)

    const errors: Record<string, string> = {}

    if (!destination) errors.destination = 'Please select a destination.'
    if (!Number.isInteger(duration) || duration < 1 || duration > 365) {
      errors.duration_days = 'Duration must be between 1 and 365 days.'
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      errors.traveler_age = 'Age must be between 1 and 120.'
    }
    if (!GENDERS.includes(gender)) errors.traveler_gender = 'Please select a valid gender.'
    if (!COUNTRIES.includes(nationality)) errors.traveler_nationality = 'Please select a valid nationality.'
    if (!ACCOMMODATION_TYPES.includes(accommodationType)) errors.accommodation_type = 'Please select a valid accommodation type.'
    if (!Number.isFinite(accommodationCost) || accommodationCost <= 0) {
      errors.accommodation_cost = 'Accommodation cost must be greater than 0.'
    }
    if (!TRANSPORTATION_TYPES.includes(transportationType)) errors.transportation_type = 'Please select a valid transportation type.'
    if (!Number.isFinite(transportationCost) || transportationCost <= 0) {
      errors.transportation_cost = 'Transportation cost must be greater than 0.'
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ error: 'Invalid survey submission.', errors }, { status: 400 })
    }

    const { data: destinationRow, error: destinationError } = await supabase
      .from('destinations')
      .select('city')
      .eq('city', destination)
      .maybeSingle()

    if (destinationError || !destinationRow) {
      return NextResponse.json({
        error: 'Invalid survey submission.',
        errors: { destination: 'Please select a destination from the list.' }
      }, { status: 400 })
    }

    const { error: insertError } = await supabase
      .from('historical_trips')
      .insert({
        destination,
        duration_days: duration,
        traveler_age: age,
        traveler_gender: gender,
        traveler_nationality: nationality,
        accommodation_type: accommodationType,
        accommodation_cost: accommodationCost,
        transportation_type: transportationType,
        transportation_cost: transportationCost
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit survey.' }, { status: 500 })
  }
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
