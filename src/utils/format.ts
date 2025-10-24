export function formatPhoneRu(value: string) {
  if (!value) return ''
  // Keep digits only
  const digits = value.replace(/\D/g, '')
  // Remove leading 8 or 7 if entered twice
  let d = digits
  if (d.startsWith('8')) d = '7' + d.slice(1)
  if (!d.startsWith('7')) {
    // allow numbers without country code — assume 7
    if (d.length <= 10) d = '7' + d
  }
  // Now format as +7 (XXX) XXX XX-XX
  const match = d.match(/^7?(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/)
  if (!match) return value
  const part1 = match[1] || ''
  const part2 = match[2] || ''
  const part3 = match[3] || ''
  const part4 = match[4] || ''

  let out = '+7'
  if (part1) out += ` (${part1}` + (part1.length === 3 ? ')' : '')
  if (part2) out += (part1.length === 3 ? ' ' : '') + part2
  if (part3) out += (part2 ? ' ' : '') + part3
  if (part4) out += '-' + part4
  return out
}

export function formatCardNumber(value: string) {
  if (!value) return ''
  const digits = value.replace(/\D/g, '').slice(0, 16)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

export function normalizePhoneForServer(masked: string) {
  if (!masked) return ''
  return masked.replace(/\D/g, '')
}
