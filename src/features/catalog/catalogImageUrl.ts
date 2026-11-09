export function catalogImageUrl(source?: string | null): string | undefined {
  const value = source?.trim()
  if (!value) return undefined

  try {
    return new URL(value, window.location.origin).toString()
  } catch {
    return value
  }
}
