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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-950 to-black text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Confirmation success</h1>
      <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded-lg">
        <span className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          Your registration has been confirmed!
        </span>
      </div>
      <p className="mt-4 text-gray-300">
        Redirecting you to login page in {countdown.toFixed(1)}s...
      </p>
    </div>
  )
}