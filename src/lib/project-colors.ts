/**
 * Project color palette
 * Auto-assigned to new projects in rotation
 */
export const PROJECT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
] as const;

/**
 * Get next available color from palette
 * Rotates through colors, reuses when exhausted
 */
export function getNextProjectColor(existingProjects: Array<{ color: string }>): string {
  const usedColors = existingProjects.map(p => p.color);
  
  // Try to find unused color
  for (const color of PROJECT_COLORS) {
    if (!usedColors.includes(color)) {
      return color;
    }
  }
  
  // All colors used, pick based on count (least used)
  const colorCounts = PROJECT_COLORS.map(color => ({
    color,
    count: usedColors.filter(c => c === color).length,
  }));
  
  colorCounts.sort((a, b) => a.count - b.count);
  return colorCounts[0].color;
}