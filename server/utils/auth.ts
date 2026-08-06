import { H3Event } from 'h3'

export async function requireAuth(_event?: H3Event) {
  // Return standard user context
  return {
    id: 'mock-user-123',
    given_name: 'Local',
    family_name: 'Developer',
    email: 'local.dev@example.com'
  }
}

