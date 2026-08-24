import { extractCnpj, extractCnpjRoot, extractDocNumbers } from './similarity.js';
import { parseDate, parseAmount } from './parser.js';

export function cleanHeader(str) {
  if (!str) return '';
  return String(str)
    .toUpperCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FIELDS = [
  {
    key: 'date',
    label: 'Data',
    required: true,
    synonyms: ['DATA', 'DT', 'DATE', 'EMISSAO', 'LANCAMENTO', 'VENCTO', 'VENCIMENTO', 'DATA LANCAMENTO', 'DATA LANC', 'DT LCTO', 'DT LANC', 'DATA LOTE', 'DATA MOVIMENTO', 'DATA MOV', 'DT MOV']
  },
  {
    key: 'amount',
    label: 'Valor / Movimento',
    required: false,
    synonyms: ['VALOR', 'VALOR R$', 'VALOR BRUTO', 'VALOR LIQUIDO', 'VALOR TOTAL', 'VALOR DOCUMENTO', 'AMOUNT', 'MOVIMENTO', 'LIQUIDO', 'TOTAL', 'VLR', 'VL TOTAL', 'VALOR R']
  },
  {
    key: 'debit',
    label: 'Débito',
    required: false,
    synonyms: ['DEBITO', 'DEB', 'VALOR DEBITO', 'VL DEBITO', 'SAIDA', 'DEBITO BAIXA R$', 'BAIXA', 'PAGAMENTO', 'VL DEB', 'VLR DEBITO']
  },
  {
    key: 'credit',
    label: 'Crédito',
    required: false,
    synonyms: ['CREDITO', 'CRED', 'VALOR CREDITO', 'VL CREDITO', 'ENTRADA', 'CREDITO SAIDA R$', 'EMISSAO', 'VL CRED', 'VLR CREDITO']
  },
  {
    key: 'description',
    label: 'Histórico / Descrição',
    required: true,
    synonyms: ['HISTORICO / DESCRICAO', 'HISTORICO', 'DESCRICAO', 'HIST', 'COMPLEMENTO', 'FORNECEDOR', 'NOME', 'OBSERVACAO', 'DETALHES', 'MEMO', 'HISTORICO COMPLETO', 'HISTORICO DO LANCAMENTO']
  },
  {
    key: 'document',
    label: 'Documento / NF',
    required: false,
    synonyms: ['DOCUMENTO', 'DOC', 'NF', 'NUMERO', 'NR DOC', 'Nº', 'DUPLICATA', 'TITULO', 'SEU NUMERO', 'NUMERO DOCUMENTO', 'NRO DOCUMENTO']
  },
  {
    key: 'contrapartida',
    label: 'Cta. Contrapartida',
    required: false,
    synonyms: ['CTA CONTRAPARTIDA', 'CONTRAPARTIDA', 'CTA C PART', 'CTA C PARTIDA', 'CONTRAPART', 'CTA PARTIDA']
  },
  {
    key: 'lote',
    label: 'Lote / Conta',
    required: false,
    synonyms: ['LOTE', 'NR LOTE', 'NUMERO LOTE', 'N LOTE', 'CONTA', 'CODIGO CONTA', 'COD CONTA', 'CTA']
  }
];

export { FIELDS };

export function autoDetect(headers) {
  const mapping = {};
  const usedHeaders = new Set();

  for (const field of FIELDS) {
    let bestMatch = null;
    let highestScore = 0;

    for (const header of headers) {
      if (usedHeaders.has(header)) continue;

      const normHeader = cleanHeader(header);
      if (!normHeader) continue;

      for (const syn of field.synonyms) {
        const normSyn = cleanHeader(syn);
        if (!normSyn) continue;

        if (normHeader === normSyn) {
          bestMatch = header;
          highestScore = 1;
          break;
        } else if (normHeader.startsWith(normSyn) || normSyn.startsWith(normHeader)) {
          if (highestScore < 0.9) {
            bestMatch = header;
            highestScore = 0.9;
          }
        } else if (normHeader.includes(normSyn) || normSyn.includes(normHeader)) {
          if (highestScore < 0.8) {
            bestMatch = header;
            highestScore = 0.8;
          }
        }
      }
      if (highestScore === 1) break;
    }

    if (bestMatch) {
      mapping[field.key] = bestMatch;
      usedHeaders.add(bestMatch);
    }
  }

  // Fallbacks:
  if (!mapping.date && headers.length > 0) {
    const dHeader = headers.find(h => cleanHeader(h).includes('DATA') || cleanHeader(h).includes('DT'));
    if (dHeader) mapping.date = dHeader;
    else mapping.date = headers[0];
  }

  if (!mapping.description && headers.length > 1) {
    const hHeader = headers.find(h => cleanHeader(h).includes('HIST') || cleanHeader(h).includes('DESC') || cleanHeader(h).includes('FORNECEDOR'));
    if (hHeader) mapping.description = hHeader;
    else mapping.description = headers[1];
  }

  if (!mapping.amount && !mapping.debit && !mapping.credit) {
    const vHeader = headers.find(h => cleanHeader(h).includes('VALOR') || cleanHeader(h).includes('VLR') || cleanHeader(h).includes('TOTAL'));
    if (vHeader) mapping.amount = vHeader;
  }

  return mapping;
}

export function normalizeItems(headers, rows, mapping, source = 'bank') {
  const dateIdx = headers.indexOf(mapping.date);
  const descIdx = headers.indexOf(mapping.description);
  const debitIdx = headers.indexOf(mapping.debit);
  const creditIdx = headers.indexOf(mapping.credit);
  const amountIdx = headers.indexOf(mapping.amount);
  const docIdx = headers.indexOf(mapping.document);
  const contraIdx = headers.indexOf(mapping.contrapartida);
  const loteIdx = headers.indexOf(mapping.lote);

  const items = [];

  rows.forEach((row, i) => {
    const rawDate = dateIdx >= 0 ? row[dateIdx] : null;
    const date = parseDate(rawDate);
    if (!date) return; // Skip invalid or title rows

    const desc = descIdx >= 0 ? String(row[descIdx] || '').trim() : '';
    if (!desc && !row[amountIdx] && !row[debitIdx] && !row[creditIdx]) return;

    let amount = 0;
    let isDebit = false;
    let isCredit = false;

    if (debitIdx >= 0 && row[debitIdx] !== null && row[debitIdx] !== undefined && String(row[debitIdx]).trim() !== '') {
      const dVal = parseAmount(row[debitIdx]);
      if (dVal > 0) {
        amount = dVal;
        isDebit = true;
      }
    }

    if (creditIdx >= 0 && row[creditIdx] !== null && row[creditIdx] !== undefined && String(row[creditIdx]).trim() !== '') {
      const cVal = parseAmount(row[creditIdx]);
      if (cVal > 0) {
        amount = cVal;
        isCredit = true;
      }
    }

    if (amount === 0 && amountIdx >= 0 && row[amountIdx] !== null && row[amountIdx] !== undefined) {
      amount = parseAmount(row[amountIdx]);
    }

    if (amount <= 0) return; // Filter out zero/balance rows

    const doc = docIdx >= 0 ? String(row[docIdx] || '').trim() : '';
    const contrapartida = contraIdx >= 0 ? String(row[contraIdx] || '').trim() : '';
    const lote = loteIdx >= 0 ? String(row[loteIdx] || '').trim() : '';

    const cnpj = extractCnpj(desc) || extractCnpj(doc);
    const cnpjRoot = extractCnpjRoot(desc) || extractCnpjRoot(doc);

    items.push({
      id: `${source}_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      source,
      date,
      description: desc,
      amount: Math.round(amount * 100) / 100,
      debit: isDebit ? amount : 0,
      credit: isCredit ? amount : 0,
      document: doc,
      contrapartida,
      lote,
      cnpj,
      cnpjRoot,
      originalIndex: i,
      rawRow: row
    });
  });

  return items;
}
