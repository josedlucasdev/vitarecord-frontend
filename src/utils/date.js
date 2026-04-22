export const formatHumanDate = (dateString) => {
  if (!dateString) return 'Sin fecha'
  
  // Parse date handling YYYY-MM-DD safely as local if it doesn't contain T (ISO)
  let date;
  if (typeof dateString === 'string' && dateString.includes('-') && !dateString.includes('T')) {
    const [year, month, day] = dateString.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateString)
  }

  const now = new Date()
  
  // Set times to 0 for accurate day comparison
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const diffTime = dNow - dDate
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  
  // Format: "22 abr, 2024"
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).replace('.', '')
}
