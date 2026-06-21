// src/utils/semesterUtils.js
// Reusable utility for automatic semester calculation based on enrollment year.

const MAX_SEMESTER = 14

/**
 * Calculate the current active semester for a student based on their
 * enrollment year (angkatan) and the current date.
 *
 * Rules:
 *   - July–December → Semester Ganjil (odd)
 *   - January–June  → Semester Genap (even)
 *   - Semester = (currentYear - angkatan) * 2 + (1 if Ganjil, 2 if Genap)
 *
 * For Genap periods (Jan–Jun), the academic year started the previous
 * calendar year, so we use (currentYear - 1) as the base year for the
 * difference calculation.
 *
 * @param {number} angkatan - The student's enrollment year.
 * @param {Date}   [now]    - Optional date override (defaults to current date).
 * @returns {{
 *   angkatan: number,
 *   tahunSaatIni: number,
 *   periode: 'Ganjil' | 'Genap',
 *   semester: number,
 *   estimasiLulus: number,
 *   exceedsLimit: boolean,
 *   error: string | null
 * }}
 */
export function calculateCurrentSemester(angkatan, now) {
  if (now == null) now = new Date()

  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-indexed

  // Validation: angkatan must not be in the future.
  if (typeof angkatan !== 'number' || !Number.isInteger(angkatan)) {
    return { angkatan, tahunSaatIni: currentYear, periode: null, semester: 0, estimasiLulus: 0, exceedsLimit: false, error: 'Angkatan harus berupa bilangan bulat.' }
  }
  if (angkatan > currentYear) {
    return { angkatan, tahunSaatIni: currentYear, periode: null, semester: 0, estimasiLulus: 0, exceedsLimit: false, error: 'Tahun angkatan tidak boleh lebih besar dari tahun saat ini.' }
  }

  // Determine the academic period.
  const isGanjil = currentMonth >= 7 // July–December = Ganjil
  const periode = isGanjil ? 'Ganjil' : 'Genap'

  // For Genap (Jan–Jun), the academic year actually started the previous
  // calendar year, so we subtract 1 from currentYear for the diff.
  const academicStartYear = isGanjil ? currentYear : currentYear - 1
  const yearDiff = academicStartYear - angkatan

  if (yearDiff < 0) {
    return { angkatan, tahunSaatIni: currentYear, periode, semester: 0, estimasiLulus: angkatan + 4, exceedsLimit: false, error: 'Tahun angkatan belum memasuki masa perkuliahan.' }
  }

  const semester = yearDiff * 2 + (isGanjil ? 1 : 2)
  const exceedsLimit = semester > MAX_SEMESTER
  const estimasiLulus = angkatan + 4

  return {
    angkatan,
    tahunSaatIni: currentYear,
    periode,
    semester,
    estimasiLulus,
    exceedsLimit,
    error: null,
  }
}

/**
 * Convenience wrapper that returns a human-readable semester info object.
 *
 * @param {number} angkatan
 * @returns {ReturnType<typeof calculateCurrentSemester>}
 */
export function getSemesterInfo(angkatan) {
  return calculateCurrentSemester(angkatan)
}

export { MAX_SEMESTER }
