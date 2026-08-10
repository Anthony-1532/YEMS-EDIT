export function normalizeClass(className: string | null | undefined): string {
  if (!className) return '';
  // Split by dash to remove stream (e.g., "JSS 1 - Victory" -> "JSS 1")
  const levelPart = className.split('-')[0].trim();
  // Remove all whitespace and uppercase (e.g., "JSS 1" -> "JSS1")
  let normalized = levelPart.replace(/\s+/g, '').toUpperCase();
  // Interchange SS and SSS (e.g. "SS1" -> "SSS1", "SS2" -> "SSS2", "SS3" -> "SSS3")
  if (normalized.startsWith('SS') && !normalized.startsWith('SSS')) {
    normalized = 'SSS' + normalized.slice(2);
  }
  return normalized;
}
