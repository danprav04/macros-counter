// src/utils/versionUtils.ts

/**
 * Compares two semantic version strings (e.g., "1.2.3").
 * @param v1 The first version string.
 * @param v2 The second version string.
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2.
 */
export function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;

    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }

  return 0;
}