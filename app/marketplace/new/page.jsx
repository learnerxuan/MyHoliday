'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import ListingForm from '@/components/sections/ListingForm'

function NewListingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedItineraryId = searchParams.get('itinerary_id')

  const [loading, setLoading] = useState(true)
  const [itineraries, setItineraries] = useState([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        // Auth & Role check
        const profileRes = await fetch('/api/profile')
        if (!profileRes.ok) {
          router.push('/auth/login')
          return
        }
        
        const user = await profileRes.json()
        if (user.role === 'guide') {
          router.push('/')
          return
        }

        // Fetch user's saved itineraries
        const plansRes = await fetch('/api/itinerary/my-plans')
        if (plansRes.ok) {
          const plansData = await plansRes.json()
          setItineraries(plansData)
        } else {
          setError('Failed to fetch your saved itineraries.')
        }
      } catch (err) {
        setError('An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/marketplace/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), // { itinerary_id, destination_id, desired_budget }
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create listing')
      }

      const newListing = await res.json()
      router.push(`/marketplace/${newListing.id}`)
    } catch (err) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    )
  }

  if (itineraries.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <p className="text-secondary mb-6">You need to save an itinerary first.</p>
        <Button variant="primary" onClick={() => router.push('/itinerary')}>
          Create an Itinerary
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <PageHeader tag="Marketplace" title="Post New Itinerary" />
      <div className="mt-8 bg-white p-6 rounded-xl border border-border">
        <ListingForm 
          itineraries={itineraries} 
          initialItineraryId={preselectedItineraryId}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
        {error && <p className="text-error mt-4 text-sm text-center">{error}</p>}
      </div>
    </div>
  )
}

export default function CreateListingPage() {
  return (
    <section className="py-20 px-12 max-w-5xl mx-auto">
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
        <NewListingContent />
      </Suspense>
    </section>
  )
}