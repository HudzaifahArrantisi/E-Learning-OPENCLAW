export function normalizeLoginIdentifier(identifier) {
  return (identifier || '').trim()
}

export function getIdentifierError(identifier) {
  const value = (identifier || '').trim()
  if (!value) {
    return 'ID akun tidak boleh kosong.'
  }
  if (/\s/.test(value)) {
    return 'ID akun tidak boleh mengandung spasi.'
  }
  if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Format email tidak valid. Gunakan NIM atau NIM@nurulfikri.ac.id.'
  }
  return null
}
