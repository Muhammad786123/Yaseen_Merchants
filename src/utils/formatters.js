// Currency, number, and date formatters

/**
 * Format a number with thousands separators, never showing decimals unless the amount has them
 * @param {number|string} n
 * @returns {string}
 */
export function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return '0';
  const num = Number(n);
  const hasDecimals = num % 1 !== 0;
  return num.toLocaleString('en-PK', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a number as Pakistani Rupee (PKR) with thousands separators and no decimals unless present
 * @param {number|string} n
 * @returns {string}
 */
export function fmt(n) {
  if (n === null || n === undefined || isNaN(n) || n === '') return 'Rs. 0';
  return 'Rs. ' + fmtNum(n);
}

/**
 * Format date string (YYYY-MM-DD) to friendly format
 * @param {string} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string}
 */
export function getTodayStr() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Convert numbers to Roman Urdu words (e.g. Panch lakh chhiyanway hazaar teen sau rupay)
 * @param {number|string} n
 * @returns {string}
 */
const URDU_1_TO_99 = [
  'sifar', 'ek', 'do', 'teen', 'chaar', 'panch', 'chhe', 'saat', 'aath', 'nau', 'das',
  'gyarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'sattrah', 'atharah', 'unnees', 'bees',
  'ikkees', 'baees', 'teyees', 'chaubees', 'pachees', 'chhabees', 'sattaees', 'atthaees', 'untees', 'tees',
  'ikattees', 'battees', 'tentees', 'chauntees', 'paintees', 'chhattees', 'saintees', 'adhtees', 'untaalees', 'chaalees',
  'iktaalees', 'bayaalees', 'tentaalees', 'chawalees', 'paintaalees', 'chhiyaalees', 'saintaalees', 'adhtaalees', 'unachaas', 'pachaas',
  'ikkyawan', 'baawan', 'tirepan', 'chawwan', 'pachpan', 'chhappan', 'sattawan', 'atthaawan', 'unsath', 'saath',
  'iksath', 'baasath', 'tirasath', 'chaunsath', 'painsath', 'chhiyasath', 'sarsath', 'adhsath', 'unhattar', 'sattar',
  'ikhattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhiyahattar', 'sathattar', 'athahattar', 'unasi', 'assi',
  'ikyasi', 'bayasi', 'tirasi', 'chaurasi', 'pachasi', 'chhiyasi', 'sattasi', 'athasi', 'unasi', 'navve',
  'ikyanway', 'bayanway', 'tiranway', 'chauranway', 'pachanway', 'chhiyanway', 'sattanway', 'atthanway', 'ninyanway'
];

export function numberToRomanUrduWords(n) {
  let num = Math.round(Math.abs(Number(n) || 0));
  if (num === 0) return 'Sifar rupay';

  const parts = [];

  const crore = Math.floor(num / 10000000);
  if (crore > 0) {
    const croreWords = numberToRomanUrduWords(crore).replace(/ rupay$/i, '');
    parts.push(`${croreWords} crore`);
    num %= 10000000;
  }

  const lakh = Math.floor(num / 100000);
  if (lakh > 0) {
    parts.push(`${URDU_1_TO_99[lakh] || lakh} lakh`);
    num %= 100000;
  }

  const hazaar = Math.floor(num / 1000);
  if (hazaar > 0) {
    parts.push(`${URDU_1_TO_99[hazaar] || hazaar} hazaar`);
    num %= 1000;
  }

  const sau = Math.floor(num / 100);
  if (sau > 0) {
    parts.push(`${URDU_1_TO_99[sau] || sau} sau`);
    num %= 100;
  }

  if (num > 0) {
    parts.push(URDU_1_TO_99[num] || String(num));
  }

  const text = parts.join(' ') + ' rupay';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Helper to get display label for a line item.
 * For service lines, returns line.serviceDescription (or 'Service Line' if empty).
 * For stock lines, returns line.itemName.
 * @param {object} line
 * @returns {string}
 */
export function getLineLabel(line) {
  if (!line) return '';
  if (line.type === 'service') {
    return line.serviceDescription?.trim() || 'Service Line';
  }
  return line.itemName || '';
}

