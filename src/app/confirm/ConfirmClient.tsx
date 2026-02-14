"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfirmClient() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(1.5)

  useEffect(() => {
    // Redirect after a brief delay to show confirmation
    const timer = setTimeout(() => {
      router.push('/login?confirmed=true')
    }, 1500)

    // Optional countdown display
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 0.1))
    }, 100)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--bg-base))] text-[hsl(var(--text-primary))]">
      <h1 className="text-2xl font-bold mb-6">Confirmation réussie</h1>
      <div className="bg-[hsl(var(--success-muted))] border border-[hsl(var(--success)_/_0.3)] text-[hsl(var(--success))] px-4 py-3 rounded-lg">
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Votre inscription a été confirmée !
        </span>
      </div>
      <p className="mt-4 text-[hsl(var(--text-tertiary))]">
        Redirection vers la page de connexion dans {countdown.toFixed(1)}s...
      </p>
    </div>
  )
}
