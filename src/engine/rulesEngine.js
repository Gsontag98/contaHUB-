/**
 * Motor de Regras De-Para Contábeis Avançado do contaHUB
 * Suporta lógica booleana completa (E, OU, NÃO), condições rigorosas de valores financeiros,
 * templates dinâmicos de histórico contábil com tags e simulação em tempo real.
 */

export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/s+/g, ' ')
    .trim();
};

/**
 * Formata um valor numérico para exibição em moeda brasileira.
 */
const formatCurrency = (val) => {
  const num = typeof val === 'number' ? Math.abs(val) : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

/**
 * Avalia se uma transação bate com os critérios de uma regra avançada ou legada.
 * Retorna o objeto enriquecido com contas e histórico gerado ou null se não bater.
 */
export const evaluateRule = (rule, transaction, defaultCounterpart = '') => {
  if (!rule || !transaction) return null;

  const desc = transaction.description || transaction.historico || '';
  const supplier = transaction.supplierName || transaction.favorecido || transaction.razaoSocial || '';
  const doc = transaction.document || transaction.doc || '';
  const date = transaction.date || transaction.data || '';
  const rawValue = transaction.value !== undefined ? transaction.value : (transaction.amount || 0);
  const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue) || 0;
  const absVal = Math.abs(numVal);
  const isDebit = transaction.isDebit !== undefined ? transaction.isDebit : (numVal < 0);

  const cleanDesc = normalizeText(desc);
  const cleanSupplier = normalizeText(supplier);
  const cleanDoc = normalizeText(doc);
  const unifiedSearchText = [cleanDesc, cleanSupplier, cleanDoc].filter(Boolean).join(' ');

  // =========================================================================
  // 1. AVALIAÇÃO DE TERMOS E OPERADORES LÓGICOS (E, OU, NÃO)
  // =========================================================================

  // 1.1 Termos Obrigatórios (Operador E / AND)
  const mustAll = (rule.mustContainAll && Array.isArray(rule.mustContainAll) && rule.mustContainAll.length > 0)
    ? rule.mustContainAll.map(t => normalizeText(t)).filter(Boolean)
    : (rule.pattern ? rule.pattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mustAll.length > 0) {
    const hasAll = mustAll.every(term => unifiedSearchText.includes(term));
    if (!hasAll) return null;
  }

  // 1.2 Termos Opcionais / Alternativos (Operador OU / OR)
  const mayAny = (rule.mayContainAny && Array.isArray(rule.mayContainAny) && rule.mayContainAny.length > 0)
    ? rule.mayContainAny.map(t => normalizeText(t)).filter(Boolean)
    : (rule.orPattern ? rule.orPattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mayAny.length > 0) {
    const hasAny = mayAny.some(term => unifiedSearchText.includes(term));
    if (!hasAny) return null;
  }

  // 1.3 Termos Proibidos / Exceções (Operador NÃO / NOT)
  const mustNot = (rule.mustNotContain && Array.isArray(rule.mustNotContain) && rule.mustNotContain.length > 0)
    ? rule.mustNotContain.map(t => normalizeText(t)).filter(Boolean)
    : (rule.notPattern ? rule.notPattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mustNot.length > 0) {
    const hasForbidden = mustNot.some(term => unifiedSearchText.includes(term));
    if (hasForbidden) return null;
  }

  // Se não houver nenhum termo configurado, rejeita
  if (mustAll.length === 0 && mayAny.length === 0) return null;

  // =========================================================================
  // 2. AVALIAÇÃO DE CONDIÇÕES DE VALOR FINANCEIRO & SINAL
  // =========================================================================

  // 2.1 Sinal / Tipo de Movimento
  const signalCond = rule.signalCondition || rule.valueCondition || 'any';
  if ((signalCond === 'debit_only' || signalCond === 'negative') && !isDebit && numVal > 0) {
    return null;
  }
  if ((signalCond === 'credit_only' || signalCond === 'positive') && isDebit && numVal < 0) {
    return null;
  }

  // 2.2 Condição Numérica do Valor
  const vType = rule.valueType || 'any';
  if (vType === 'exact') {
    const exact = parseFloat(rule.exactValue || 0);
    if (Math.abs(absVal - exact) > 0.005) return null;
  } else if (vType === 'range') {
    const min = parseFloat(rule.minValue || 0);
    const max = parseFloat(rule.maxValue || Infinity);
    if (absVal < min || absVal > max) return null;
  } else if (vType === 'greater') {
    const min = parseFloat(rule.minValue || rule.exactValue || 0);
    if (absVal <= min) return null;
  } else if (vType === 'less') {
    const max = parseFloat(rule.maxValue || rule.exactValue || 0);
    if (absVal >= max) return null;
  }

  // =========================================================================
  // 3. RESOLUÇÃO DE CONTAS CONTÁBEIS (DÉBITO E CRÉDITO)
  // =========================================================================
  let debit = rule.debitAccount || '';
  let credit = rule.creditAccount || '';
  const rType = rule.ruleType || 'dynamic';

  if (rType === 'dynamic') {
    const target = rule.targetAccount || '';
    if (isDebit) {
      debit = target;
      credit = defaultCounterpart || '';
    } else {
      debit = defaultCounterpart || '';
      credit = target;
    }
  }

   // =========================================================================
  // 4. GERAÇÃO DINÂMICA DE HISTÓRICO COM TAGS / PLACEHOLDERS
  // =========================================================================
  let generatedHistory = rule.historicText || rule.historicTextTemplate || desc;

  if (rule.historicTextTemplate) {
    generatedHistory = rule.historicTextTemplate.replace(
      /\[(HISTORICO|FORNECEDOR|DOC|NF|DATA|VALOR)\]/gi,
      (match, token) => {
        const upper = token.toUpperCase();
        if (upper === 'HISTORICO') return desc;
        if (upper === 'FORNECEDOR') return supplier || desc;
        if (upper === 'DOC' || upper === 'NF') return doc;
        if (upper === 'DATA') return date ? date.split('-').reverse().join('/') : '';
        if (upper === 'VALOR') return formatCurrency(absVal);
        return match;
      }
    ).replace(/\s+/g, ' ').trim();
  }

  return {
    ...rule,
    debitAccount: debit,
    creditAccount: credit,
    historicCode: rule.historicCode || '10',
    historicText: generatedHistory
  };
};

/**
 * Função compatível com a chamada padrão do motor.
 */
export const matchTransactionRule = (description, value, rules = [], defaultCounterpart = '', historicText = '', rawRow = []) => {
  if (!rules || !Array.isArray(rules) || rules.length === 0) return null;

  const mockTx = {
    description,
    value,
    amount: typeof value === 'number' ? Math.abs(value) : Math.abs(parseFloat(value) || 0),
    isDebit: (typeof value === 'number' ? value : parseFloat(value) || 0) < 0,
    historicText,
    rawRow
  };

  for (const rule of rules) {
    const match = evaluateRule(rule, mockTx, defaultCounterpart);
    if (match) return match;
  }

  return null;
};

/**
 * Simulador de regras em tempo real: testa uma regra contra uma lista de transações.
 * Retorna as transações afetadas e exemplos de transformação contábil.
 */
export const simulateRule = (rule, transactions = [], defaultCounterpart = '') => {
  if (!rule || !transactions || transactions.length === 0) {
    return { count: 0, matches: [], sample: null };
  }

  const matches = [];
  transactions.forEach(tx => {
    const evalResult = evaluateRule(rule, tx, defaultCounterpart);
    if (evalResult) {
      matches.push({
        original: tx,
        result: evalResult
      });
    }
  });

  return {
    count: matches.length,
    matches,
    sample: matches.length > 0 ? matches[0] : null
  };
};

export const suggestPattern = (description) => {
  if (!description) return '';
  let text = description.toString().trim();
  text = text.replace(/d+/g, '');
  text = text.replace(/REF..*$/i, '');
  text = text.replace(/s+/g, ' ').trim();
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
    if (!file) return reject(new Error('Nenhum arquivo selecionado.'));
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          resolve(parsed);
        } else if (parsed && Array.isArray(parsed.rules)) {
          resolve(parsed.rules);
        } else {
          reject(new Error('O arquivo JSON não contém uma lista válida de regras De-Para.'));
        }
      } catch (err) {
        reject(new Error('Falha ao processar arquivo JSON: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Erro de leitura do arquivo.'));
    reader.readAsText(file);
  });
};
