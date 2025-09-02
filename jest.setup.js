import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    refresh: jest.fn(),
  }),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock Next.js cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock FormData for server actions
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }
  
  append(key, value) {
    this.data.set(key, value)
  }
  
  get(key) {
    return this.data.get(key)
  }
  
  getAll(key) {
    const values = []
    for (const [k, v] of this.data.entries()) {
      if (k === key) values.push(v)
    }
    return values
  }
  
  has(key) {
    return this.data.has(key)
  }
  
  delete(key) {
    this.data.delete(key)
  }
  
  entries() {
    return this.data.entries()
  }
  
  keys() {
    return this.data.keys()
  }
  
  values() {
    return this.data.values()
  }
}
