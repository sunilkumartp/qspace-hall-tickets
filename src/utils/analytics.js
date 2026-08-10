import { supabase } from '../db/supabase';

/**
 * Detect browser name from user agent string.
 */
const getBrowser = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
};

/**
 * Detect OS from user agent string.
 */
const getOS = () => {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
};

/**
 * Log a generation event to Supabase.
 * Fire-and-forget: errors are silently caught so they never
 * disrupt the user's PDF generation flow.
 */
export const logGeneration = async ({ documentType, studentCount, year, metadata = {} }) => {
  try {
    await supabase.from('generation_logs').insert({
      event_type: 'generation',
      document_type: documentType,
      student_count: studentCount,
      year: year || null,
      browser: getBrowser(),
      os: getOS(),
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      metadata
    });
  } catch {
    // Silently ignore – analytics should never break the app
  }
};

/**
 * Log a page visit event.
 */
export const logPageVisit = async () => {
  try {
    await supabase.from('generation_logs').insert({
      event_type: 'page_visit',
      document_type: 'n/a',
      student_count: 0,
      browser: getBrowser(),
      os: getOS(),
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      language: navigator.language || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    });
  } catch {
    // Silently ignore
  }
};
