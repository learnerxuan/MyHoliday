import { NextResponse } from 'next/server'
import { COUNTRIES } from '@/lib/countries'
import { query } from '@/lib/supabase/db'
import { ACCOMMODATION_TYPES, TRANSPORTATION_TYPES } from '@/lib/survey-options'

const GENDERS = ['Male', 'Female']

export async function POST(request: Request) {
  try {
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

    const destinationResult = await query(
      'select city from destinations where city = $1 limit 1',
      [destination]
    )

    if (destinationResult.rowCount === 0) {
      return NextResponse.json({
        error: 'Invalid survey submission.',
        errors: { destination: 'Please select a destination from the list.' }
      }, { status: 400 })
    }

    await query(`
      insert into historical_trips (
        destination,
        duration_days,
        traveler_age,
        traveler_gender,
        traveler_nationality,
        accommodation_type,
        accommodation_cost,
        transportation_type,
        transportation_cost
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      destination,
      duration,
      age,
      gender,
      nationality,
      accommodationType,
      accommodationCost,
      transportationType,
      transportationCost
    ])

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit survey.' }, { status: 500 })
  }
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}
