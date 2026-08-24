// Common accounting & banking noise words to remove during normalization
export const STOP_WORDS = new Set([
  'PGTO', 'PAGTO', 'PAG', 'PAGO', 'PAGAMENTO',
  'RECEBIDO', 'RECEB', 'RECEBIMENTO', 'REC',
  'ENVIADO', 'ENV', 'ENVIO',
  'CREDITO', 'CRED', 'DEBITO', 'DEB',
  'TED', 'DOC', 'PIX', 'TRANSF', 'TRANSFERENCIA', 'TEV',
  'NF', 'NFE', 'NOTA', 'FISCAL', 'DUPLICATA', 'DUP', 'DOCUMENTO',
  'LIQUIDACAO', 'LIQ', 'COBRANCA', 'COB', 'TITULO', 'BOLETO', 'BOL',
  'AUT', 'AUTENTICACAO', 'TARIFA', 'TAR', 'REMUNERACAO', 'REM', 'COMPENSACAO',
  'CHQ', 'CHEQUE', 'ESTORNO', 'VALOR', 'SALDO', 'DEP', 'DEPOSITO',
  'APLICACAO', 'RESGATE', 'IOF', 'IRRF', 'JUROS', 'MULTA', 'ENCARGOS',
  'DEV', 'DEVOLUCAO',
  'REF', 'REFERENTE', 'REFE',
  'DE', 'DO', 'DA', 'DOS', 'DAS', 'E', 'EM', 'POR', 'PARA', 'COM',
  'BANCO', 'SA', 'LTDA', 'ME', 'EPP', 'EIRELI', 'S/A', 'S.A.', 'SS', 'CIA'
]);

const STOP_REGEX = new RegExp('\\b(' + Array.from(STOP_WORDS).join('|') + ')\\b', 'gi');

export function normalizeText(text) {
  if (!text) return '';
  let normalized = String(text).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^A-Z0-9\s]/g, ' ') // replace special chars with space
    .replace(/\s+/g, ' ') // remove extra spaces
    .trim();

  // Remove stop words
  const words = normalized.split(' ');
  const filteredWords = words.filter(word => !STOP_WORDS.has(word));

  return filteredWords.join(' ');
}

export function cleanCompanyName(text) {
  if (!text) return '';
  let clean = String(text).toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(STOP_REGEX, ' ')
    .replace(/\b\d+\b/g, ' ') // remove isolated numbers/IDs/CNPJs
    .replace(/[^A-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return clean;
}

export function hasTokenOverlap(clean1, clean2) {
  if (!clean1 || !clean2) return false;
  const tokens1 = clean1.split(' ').filter(t => t.length >= 3);
  const tokens2 = clean2.split(' ').filter(t => t.length >= 3);
  if (tokens1.length === 0 || tokens2.length === 0) return false;

  // Check if at least one meaningful token matches or is prefix
  for (const t1 of tokens1) {
    for (const t2 of tokens2) {
      if (t1 === t2 || (t1.length >= 4 && t2.startsWith(t1)) || (t2.length >= 4 && t1.startsWith(t2))) {
        return true;
      }
    }
  }
  return false;
}

export function extractCnpj(text) {
  if (!text) return null;
  const str = String(text);
  // Match formatted CNPJ: 00.000.000/0000-00
  const matchFormatted = str.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  if (matchFormatted) return matchFormatted[0].replace(/\D/g, '');

  // Match 14 consecutive digits
  const matchPlain = str.match(/\b\d{14}\b/);
  if (matchPlain) return matchPlain[0];

  return null;
}

export function extractCnpjRoot(text) {
  const cnpj = extractCnpj(text);
  if (cnpj && cnpj.length === 14) {
    return cnpj.substring(0, 8); // First 8 digits identify Matriz/Filial group
  }
  return null;
}

export function extractDocNumbers(text) {
  if (!text) return [];
  const str = String(text);
  const matches = str.match(/\b\d{3,10}\b/g);
  if (!matches) return [];
  // Filter out dates (like 2024, 2025, 2026) and common small noise
  return matches.filter(num => !['2022', '2023', '2024', '2025', '2026', '2027'].includes(num));
}

export function shareDocNumber(text1, text2) {
  const docs1 = extractDocNumbers(text1);
  const docs2 = extractDocNumbers(text2);
  if (docs1.length === 0 || docs2.length === 0) return false;

  for (const d1 of docs1) {
    for (const d2 of docs2) {
      if (d1 === d2 || (d1.length >= 4 && d2.length >= 4 && (d1.endsWith(d2) || d2.endsWith(d1)))) {
        return true;
      }
    }
  }
  return false;
}

export function jaroWinkler(s1, s2) {
  const str1 = normalizeText(s1);
  const str2 = normalizeText(s2);

  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;

  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);

    for (let j = start; j < end; j++) {
      if (!matches2[j] && str1[i] === str2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (matches1[i]) {
      while (!matches2[k]) k++;
      if (str1[i] !== str2[k]) transpositions++;
      k++;
    }
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

export function jaccardSimilarity(s1, s2) {
  const str1 = normalizeText(s1);
  const str2 = normalizeText(s2);

  if (!str1 || !str2) return 0.0;

  const set1 = new Set(str1.split(' ').filter(Boolean));
  const set2 = new Set(str2.split(' ').filter(Boolean));

  if (set1.size === 0 && set2.size === 0) return 1.0;
  if (set1.size === 0 || set2.size === 0) return 0.0;

  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }

  const union = set1.size + set2.size - intersection;
  return intersection / union;
}

export function calculateSimilarity(str1, str2) {
  const jaro = jaroWinkler(str1, str2);
  const jaccard = jaccardSimilarity(str1, str2);
  return (jaro * 0.6) + (jaccard * 0.4);
}
