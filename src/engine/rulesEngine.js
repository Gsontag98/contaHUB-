/**
 * Motor de Regras De-Para Contábeis Avançado do contaHUB
 * Inspirado nos importadores contábeis da Domínio Sistemas.
 * Suporta fatiamento de tokens do extrato, modos de comparação (Contendo, Iniciando, Terminando),
 * operadores lógicos (E, OU, NÃO), catálogo completo de variáveis contábeis e simulação em tempo real.
 */

export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Fatiador de Tokens / Palavras do Extrato (Word Tokenizer)
 * Quebra a descrição em palavras e termos individuais para seleção visual.
 */
export const tokenizeDescription = (description) => {
  if (!description) return [];
  const clean = normalizeText(description);
  const words = clean
    .split(/\s+/)
    .map(w => w.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '').trim())
    .filter(Boolean);

  // Retorna tokens únicos mantendo a ordem original
  const unique = [];
  words.forEach(w => {
    if (w.length >= 2 && !unique.includes(w)) {
      unique.push(w);
    }
  });

  return unique;
};

/**
 * Limpeza de Códigos / Ruído Numérico (Dicionário de Remoção)
 * Remove sequências numéricas longas, códigos de barras, hashes e autenticações bancárias.
 */
export const cleanJunkNumbers = (text) => {
  if (!text) return '';
  return text
    .replace(/\b\d{6,}\b/g, '')         // Números com 6+ dígitos (documentos longos, autenticações)
    .replace(/\b[A-Z]{2}\d{5,}\b/gi, '')  // Códigos tipo CX609426, TB12345
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Formata um valor numérico para exibição em moeda brasileira.
 */
export const formatCurrency = (val) => {
  const num = typeof val === 'number' ? Math.abs(val) : parseFloat(val) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
};

/**
 * Avalia se um texto corresponde a um padrão de acordo com o modo de comparação.
 */
export const matchPatternMode = (sourceText, pattern, mode = 'contains') => {
  if (!sourceText || !pattern) return false;
  const src = normalizeText(sourceText);
  const pat = normalizeText(pattern);

  switch (mode) {
    case 'startsWith':
      return src.startsWith(pat);
    case 'endsWith':
      return src.endsWith(pat);
    case 'exact':
      return src === pat;
    case 'contains':
    default:
      return src.includes(pat);
  }
};

/**
 * Gera a representação textual / fórmula lógica da regra montada (estilo SQL/Domínio).
 */
export const generateLogicalFormula = (rule) => {
  if (!rule) return '';

  const mustAll = (rule.mustContainAll && Array.isArray(rule.mustContainAll))
    ? rule.mustContainAll
    : (rule.pattern ? rule.pattern.split(',').map(s => s.trim()).filter(Boolean) : []);

  const mayAny = (rule.mayContainAny && Array.isArray(rule.mayContainAny))
    ? rule.mayContainAny
    : (rule.orPattern ? rule.orPattern.split(',').map(s => s.trim()).filter(Boolean) : []);

  const mustNot = (rule.mustNotContain && Array.isArray(rule.mustNotContain))
    ? rule.mustNotContain
    : (rule.notPattern ? rule.notPattern.split(',').map(s => s.trim()).filter(Boolean) : []);

  const mode = rule.matchMode || 'contains';
  const getLike = (t) => {
    if (mode === 'startsWith') return `'${t}%'`;
    if (mode === 'endsWith') return `'%${t}'`;
    if (mode === 'exact') return `'${t}'`;
    return `'%${t}%'`;
  };

  const parts = [];

  if (mustAll.length > 0) {
    const andGroup = mustAll.map(t => `(unaccent(#field_historico#) like ${getLike(t)})`).join(' and ');
    parts.push(mustAll.length > 1 ? `(${andGroup})` : andGroup);
  }

  if (mayAny.length > 0) {
    const orGroup = mayAny.map(t => `(unaccent(#field_historico#) like ${getLike(t)})`).join(' or ');
    parts.push(`(${orGroup})`);
  }

  if (mustNot.length > 0) {
    const notGroup = mustNot.map(t => `not (unaccent(#field_historico#) like ${getLike(t)})`).join(' and ');
    parts.push(mustNot.length > 1 ? `(${notGroup})` : notGroup);
  }

  if (rule.signalCondition === 'debit_only') {
    parts.push('(#tipo_movimento# = "D")');
  } else if (rule.signalCondition === 'credit_only') {
    parts.push('(#tipo_movimento# = "C")');
  }

  if (rule.valueType === 'exact' && rule.exactValue) {
    parts.push(`(#valor# = ${rule.exactValue})`);
  } else if (rule.valueType === 'range' && (rule.minValue || rule.maxValue)) {
    parts.push(`(#valor# between ${rule.minValue || 0} and ${rule.maxValue || 999999})`);
  }

  return parts.join(' and ') || '(nenhuma condição configurada)';
};

/**
 * Avalia se uma transação bate com os critérios de uma regra avançada ou legada.
 * Retorna o objeto enriquecido com contas e histórico gerado ou null se não bater.
 */
export const evaluateRule = (rule, transaction, defaultCounterpart = '', companyContext = {}) => {
  if (!rule || !transaction) return null;

  const desc = transaction.description || transaction.historico || '';
  const supplier = transaction.supplierName || transaction.favorecido || transaction.razaoSocial || '';
  const doc = transaction.document || transaction.doc || '';
  const date = transaction.date || transaction.data || '';
  const rawValue = transaction.value !== undefined ? transaction.value : (transaction.amount || 0);
  const numVal = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue) || 0;
  const absVal = Math.abs(numVal);
  const isDebit = transaction.isDebit !== undefined ? transaction.isDebit : (numVal < 0);
  const bankName = transaction.bankName || transaction.banco || 'BANCO';
  const companyName = companyContext.name || transaction.empresa || 'EMPRESA';
  const supplierCnpj = transaction.supplierCnpj || transaction.cnpj || '';

  const cleanDesc = normalizeText(desc);
  const cleanSupplier = normalizeText(supplier);
  const cleanDoc = normalizeText(doc);
  const unifiedSearchText = [cleanDesc, cleanSupplier, cleanDoc].filter(Boolean).join(' ');

  const mode = rule.matchMode || 'contains';

  // =========================================================================
  // 1. AVALIAÇÃO DE TERMOS E OPERADORES LÓGICOS (E, OU, NÃO)
  // =========================================================================

  // 1.1 Termos Obrigatórios (Operador E / AND)
  const mustAll = (rule.mustContainAll && Array.isArray(rule.mustContainAll) && rule.mustContainAll.length > 0)
    ? rule.mustContainAll.map(t => normalizeText(t)).filter(Boolean)
    : (rule.pattern ? rule.pattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mustAll.length > 0) {
    const hasAll = mustAll.every(term => matchPatternMode(unifiedSearchText, term, mode));
    if (!hasAll) return null;
  }

  // 1.2 Termos Opcionais / Alternativos (Operador OU / OR)
  const mayAny = (rule.mayContainAny && Array.isArray(rule.mayContainAny) && rule.mayContainAny.length > 0)
    ? rule.mayContainAny.map(t => normalizeText(t)).filter(Boolean)
    : (rule.orPattern ? rule.orPattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mayAny.length > 0) {
    const hasAny = mayAny.some(term => matchPatternMode(unifiedSearchText, term, mode));
    if (!hasAny) return null;
  }

  // 1.3 Termos Proibidos / Exceções (Operador NÃO / NOT)
  const mustNot = (rule.mustNotContain && Array.isArray(rule.mustNotContain) && rule.mustNotContain.length > 0)
    ? rule.mustNotContain.map(t => normalizeText(t)).filter(Boolean)
    : (rule.notPattern ? rule.notPattern.split(',').map(t => normalizeText(t.trim())).filter(Boolean) : []);

  if (mustNot.length > 0) {
    const hasForbidden = mustNot.some(term => matchPatternMode(unifiedSearchText, term, 'contains'));
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
  // 4. GERAÇÃO DINÂMICA DE HISTÓRICO COM VARIÁVEIS DO SISTEMA & TRECHOS
  // =========================================================================
  let generatedHistory = rule.historicTextTemplate ? rule.historicTextTemplate : (rule.historicText || desc);
  if (rule.historicTextTemplate && rule.historicTextTemplate.trim()) {
    // Parse date components
    let dayStr = '', monthStr = '', yearStr = '', prevMonthStr = '';
    if (date) {
      const parts = date.split('-');
      if (parts.length === 3) {
        yearStr = parts[0];
        monthStr = parts[1];
        dayStr = parts[2];
        const mNum = parseInt(monthStr, 10);
        prevMonthStr = mNum > 1 ? String(mNum - 1).padStart(2, '0') : '12';
      }
    }

    generatedHistory = rule.historicTextTemplate.replace(
      /\[(HISTORICO|FORNECEDOR|DOC|NF|DATA|VALOR|BANCO|EMPRESA|DIA|MES|ANO|MES_ANTERIOR|CNPJ_FORNECEDOR)\]/gi,
      (match, token) => {
        const upper = token.toUpperCase();
        if (upper === 'HISTORICO') return desc;
        if (upper === 'FORNECEDOR') return supplier || desc;
        if (upper === 'DOC' || upper === 'NF') return doc;
        if (upper === 'DATA') return date ? (date.includes('-') ? date.split('-').reverse().join('/') : date) : '';
        if (upper === 'VALOR') return formatCurrency(absVal);
        if (upper === 'BANCO') return bankName;
        if (upper === 'EMPRESA') return companyName;
        if (upper === 'DIA') return dayStr;
        if (upper === 'MES') return monthStr;
        if (upper === 'ANO') return yearStr;
        if (upper === 'MES_ANTERIOR') return prevMonthStr;
        if (upper === 'CNPJ_FORNECEDOR') return supplierCnpj;
        return match;
      }
    ).replace(/\s+/g, ' ').trim();
  }

  return {
    ...rule,
    debitAccount: debit,
    creditAccount: credit,
    historicCode: rule.historicCode || '',
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
 */
export const simulateRule = (rule, transactions = [], defaultCounterpart = '', companyContext = {}) => {
  if (!rule || !transactions || transactions.length === 0) {
    return { count: 0, matches: [], sample: null };
  }

  const matches = [];
  transactions.forEach(tx => {
    const evalResult = evaluateRule(rule, tx, defaultCounterpart, companyContext);
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
  text = text.replace(/\b\d+\b/g, '');
  text = text.replace(/REF..*$/i, '');
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
