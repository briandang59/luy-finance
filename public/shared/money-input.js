import {MAX_MONEY,parseMoney} from './model.js';

export function formatMoneyInput(value) {
  const text = String(value ?? '');
  // Commas may be temporarily out of place while editing a formatted value.
  // Keep other invalid input visible so validation can report it on submit.
  if (/^-?[\d,\s]*$/.test(text)) return text.replace(/[,\s]/g,'').replace(/\B(?=(\d{3})+(?!\d))/g,',');
  try {return formatMoneyInput(parseMoney(text));} catch {return text;}
}

export function moneySuggestions(value) {
  if (!String(value).trim() || /^0+$/.test(String(value))) return [50000,100000,500000,1000000];
  try {
    const amount = parseMoney(value);
    if (!amount) return [50000,100000,500000,1000000];
    const multipliers = amount < 1000 ? [1000,10000,100000,1000000] : [10,100,1000];
    return multipliers.map(multiplier => amount * multiplier).filter(amount => Number.isSafeInteger(amount) && amount <= MAX_MONEY);
  } catch {return [];}
}

export function updateMoneyInput(input) {
  const previous = input.value, start = input.selectionStart, end = input.selectionEnd;
  const formatted = formatMoneyInput(previous);
  if (formatted === previous) return;
  input.value = formatted;
  if (start === null || end === null) return;
  const position = offset => {
    const digits = previous.slice(0,offset).replace(/\D/g,'').length;
    if (!digits) return formatted.startsWith('-') ? Math.min(offset,1) : 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i]) && ++count === digits) return i + 1;
    }
    return formatted.length;
  };
  input.setSelectionRange(position(start),position(end),input.selectionDirection);
}
