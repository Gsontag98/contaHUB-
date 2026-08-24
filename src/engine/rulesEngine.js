/**
 * Motor de Regras De-Para Contábeis do contaHUB
 * Suporta regras dinâmicas, regras fixas, filtros de valor (+/-), histórico por colunas e persistência local/backup JSON.
 */

export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

export const matchTransactionRule = (description, value, rules = [], defaultCounterpart = '', historicText = '', rawRow = []) => {
  if (!rules || !Array.isArray(rules)) return null;

  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;

  const cleanDescription = normalizeText(description);
  const cleanHistoric = normalizeText(historicText);
  const cleanRawRow = Array.isArray(rawRow)
    ? rawRow.map(cell => normalizeText(cell)).filter(Boolean)
    : [];

  const unifiedSearchText = [cleanDescription, cleanHistoric, ...cleanRawRow].join(' ');

  for (const rule of rules) {
    if (!rule.pattern) continue;

    const keywords = rule.pattern
      .split(',')
      .map(term => normalizeText(term.trim()))
      .filter(Boolean);

    if (keywords.length === 0) continue;

    const isMatch = keywords.every(keyword => unifiedSearchText.includes(keyword));

    if (isMatch) {
      // 2. Condição de valor
      const cond = rule.valueCondition || 'any';
      if (cond === 'positive' && numericValue <= 0) continue;
      if (cond === 'negative' && numericValue >= 0) continue;

      // 3. Resolver débito/crédito
      let debit = rule.debitAccount || '';
      let credit = rule.creditAccount || '';
      const rType = rule.ruleType || 'dynamic';

      if (rType === 'dynamic') {
        const target = rule.targetAccount || '';
        if (numericValue < 0) {
          debit = target;
          credit = defaultCounterpart || '';
        } else {
          debit = defaultCounterpart || '';
          credit = target;
        }
      }

      return {
        ...rule,
        debitAccount: debit,
        creditAccount: credit
      };
    }
  }

  return null;
};

export const suggestPattern = (description) => {
  if (!description) return '';
  let text = description.toString().trim();
  text = text.replace(/\b\d+\b/g, '');
  text = text.replace(/REF\..*$/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  const words = text.split(' ');
  if (words.length > 3) {
    return words.slice(0, 3).join(' ');
  }
  return text;
};

export const exportRulesAsJson = (rules = [], companyName = 'geral') => {
  const jsonStr = JSON.stringify(rules, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanComp = String(companyName).toLowerCase().replace(/[^a-z0-9]/gi, '_');
  link.download = `contahub_regras_depara_${cleanComp}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importRulesFromJson = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else {
          reject(new Error('Formato inválido de arquivo de regras. O arquivo deve conter uma lista JSON.'));
        }
      } catch (err) {
        reject(new Error('Falha ao processar o JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.readAsText(file);
  });
};
