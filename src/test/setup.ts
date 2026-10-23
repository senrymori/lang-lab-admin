import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Offline: any fetch a test didn't answer fails it (the admin's API is stood in for by src/test/api.ts).
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => { throw new Error(`unanswered request: ${url}`) }))
  localStorage.clear()
  location.hash = ''
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
