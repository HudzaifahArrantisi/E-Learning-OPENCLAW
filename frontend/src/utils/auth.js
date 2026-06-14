export const NURULFIKRI_DOMAIN = '@nurulfikri.ac.id'

export function normalizeLoginIdentifier(identifier) {
  const value = (identifier || '').trim()
  return value.includes('@') ? value : `${value}${NURULFIKRI_DOMAIN}`
}

export function getIdentifierError(identifier) {
  const value = (identifier || '').trim()
  if (!value || (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    return 'Masukkan NIM atau email yang valid.'
  }
  return null
}
