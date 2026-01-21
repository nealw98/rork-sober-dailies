/**
 * Get sobriety milestone range from a sobriety date
 * Returns only a range category - NEVER the actual date (privacy protection)
 * 
 * @param sobrietyDate - Date string in ISO format (YYYY-MM-DD) or null
 * @returns Milestone range string
 */
export function getSobrietyMilestone(sobrietyDate: string | null): string {
  // No date set
  if (!sobrietyDate) {
    return 'not_set';
  }

  try {
    const soberDate = new Date(sobrietyDate);
    const today = new Date();
    
    // Future date (invalid)
    if (soberDate > today) {
      return 'future_date';
    }

    // Calculate days sober
    const diffTime = Math.abs(today.getTime() - soberDate.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Return milestone ranges
    if (days < 30) return '0-30_days';
    if (days < 90) return '31-90_days';
    if (days < 180) return '3-6_months';
    if (days < 365) return '6-12_months';
    if (days < 730) return '1-2_years';
    if (days < 1825) return '2-5_years';
    if (days < 3650) return '5-10_years';
    if (days < 5475) return '10-15_years';
    if (days < 7300) return '15-20_years';
    if (days < 10950) return '20-30_years';
    return '30+_years';
  } catch (error) {
    console.error('[Sobriety] Error calculating milestone:', error);
    return 'not_set';
  }
}

/**
 * Get user-friendly display name for milestone
 */
export function getMilestoneDisplayName(milestone: string): string {
  const displayNames: Record<string, string> = {
    'not_set': 'Not Set',
    'future_date': 'Invalid Date',
    '0-30_days': '0-30 Days',
    '31-90_days': '31-90 Days',
    '3-6_months': '3-6 Months',
    '6-12_months': '6-12 Months',
    '1-2_years': '1-2 Years',
    '2-5_years': '2-5 Years',
    '5-10_years': '5-10 Years',
    '10-15_years': '10-15 Years',
    '15-20_years': '15-20 Years',
    '20-30_years': '20-30 Years',
    '30+_years': '30+ Years',
  };
  
  return displayNames[milestone] || milestone;
}
