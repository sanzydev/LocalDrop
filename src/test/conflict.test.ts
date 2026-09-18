import { describe, it, expect } from 'vitest';
import { generateAlternativeFilename } from '../utils/conflict';

describe('generateAlternativeFilename', () => {
  it('returns original name if not in existing list', () => {
    const existing = ['document.pdf', 'notes.txt'];
    expect(generateAlternativeFilename(existing, 'photo.jpg')).toBe('photo.jpg');
  });

  it('appends (1) if filename exists', () => {
    const existing = ['photo.jpg'];
    expect(generateAlternativeFilename(existing, 'photo.jpg')).toBe('photo (1).jpg');
  });

  it('increments counter to (2) if photo (1).jpg already exists', () => {
    const existing = ['photo.jpg', 'photo (1).jpg'];
    expect(generateAlternativeFilename(existing, 'photo.jpg')).toBe('photo (2).jpg');
  });

  it('handles case-insensitive duplicates on Windows', () => {
    const existing = ['PHOTO.JPG'];
    expect(generateAlternativeFilename(existing, 'photo.jpg')).toBe('photo (1).jpg');
  });

  it('handles files without extension', () => {
    const existing = ['README'];
    expect(generateAlternativeFilename(existing, 'README')).toBe('README (1)');
  });
});
