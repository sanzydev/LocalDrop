export function generateAlternativeFilename(
  existingFilenames: string[],
  originalFilename: string
): string {
  const normalizedExisting = new Set(existingFilenames.map(f => f.toLowerCase()));
  if (!normalizedExisting.has(originalFilename.toLowerCase())) {
    return originalFilename;
  }

  const dotIndex = originalFilename.lastIndexOf('.');
  const ext = dotIndex > 0 ? originalFilename.substring(dotIndex) : '';
  const baseName = dotIndex > 0 ? originalFilename.substring(0, dotIndex) : originalFilename;

  const match = baseName.match(/^(.*) \((\d+)\)$/);
  let cleanBase = baseName;
  let counter = 1;

  if (match) {
    cleanBase = match[1];
    counter = parseInt(match[2], 10) + 1;
  }

  while (true) {
    const candidate = `${cleanBase} (${counter})${ext}`;
    if (!normalizedExisting.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }
}
