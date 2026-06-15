export function normalizeLoginIdentifier(identifier) {
  return (identifier || '').trim()
}

export function getIdentifierError(identifier) {
  const value = (identifier || '').trim()
  if (!value || /\s/.test(value) || (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) {
    return 'Masukkan ID akun, NIM/NIP, username, atau email yang valid.'
  }
  return null
}
