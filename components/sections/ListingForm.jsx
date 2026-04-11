'use client'

import { useState, useEffect } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'

export default function ListingForm({ itineraries, initialItineraryId, onSubmit, isSubmitting }) {
  const [itineraryId, setItineraryId] = useState(initialItineraryId || '')
  const [desiredBudget, setDesiredBudget] = useState('')
  const [destinationName, setDestinationName] = useState('')
  const [destinationId, setDestinationId] = useState('')

  // Map itineraries to Select options
  const itineraryOptions = [
    { label: 'Select an itinerary...', value: '' },
    ...itineraries.map(plan => ({
      label: plan.title,
      value: plan.id
    }))
  ]

  // Auto-populate the read-only destination city when an itinerary is selected
  useEffect(() => {
    if (itineraryId) {
      const selectedPlan = itineraries.find(p => p.id === itineraryId)
      if (selectedPlan) {
        setDestinationName(selectedPlan.city_name || 'Unknown City')
        setDestinationId(selectedPlan.destination_id)
      }
    } else {
      setDestinationName('')
      setDestinationId('')
    }
  }, [itineraryId, itineraries])

  const handleSubmitClick = () => {
    if (!itineraryId || !desiredBudget || !destinationId) return
    
    onSubmit({
      itinerary_id: selectedItineraryId,
      destination_id: selectedDestinationId,
      desired_budget: Number(desiredBudget)
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="block font-body text-sm font-semibold text-charcoal mb-2">
          Select Saved Itinerary
        </label>
        <Select 
          value={itineraryId} 
          onChange={(e) => setItineraryId(e.target.value)}
          options={itineraryOptions}
        />
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-charcoal mb-2">
          Destination City
        </label>
        <Input 
          type="text" 
          value={destinationName} 
          disabled 
          placeholder="Auto-filled from itinerary"
        />
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-charcoal mb-2">
          Desired Budget (MYR)
        </label>
        <Input 
          type="number" 
          min="0"
          step="0.01"
          value={desiredBudget} 
          onChange={(e) => setDesiredBudget(e.target.value)}
          placeholder="e.g. 2500.00"
        />
      </div>

      <div className="pt-2">
        <Button 
          variant="primary" 
          onClick={handleSubmitClick} 
          disabled={isSubmitting || !itineraryId || !desiredBudget}
          className="w-full justify-center"
        >
          {isSubmitting ? <Spinner /> : 'Post Listing'}
        </Button>
      </div>
    </div>
  )
}