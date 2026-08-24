/**
 * Utilitário oficial de exportação de arquivos TXT no padrão Domínio Sistemas
 * Registros |0000| (Empresa), |6000| (Lote) e |6100| (Lançamentos Contábeis com pipes |)
 */

export const sanitizeDominioText = (text) => {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/g, 'C')
    .replace(/Ç/g, 'C')
    .toUpperCase()
    .replace(/[\r\n|]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const generateDominioTxtContent = (transactions = [], company = {}, defaultBankCounterpart = '') => {
  const rawCnpj = (company.cnpj || company.document || '').toString().replace(/[^\d]/g, '');
  const companyCnpj = rawCnpj || '00000000000191';

  const lines = [];

  transactions.forEach(tx => {
    // 1. Registro 0000: Identificação da Empresa
    lines.push(`|0000|${companyCnpj}|`);

    // 2. Registro 6000: Indicador do Lote
    lines.push(`|6000|X||||`);

    // 3. Registro 6100: Detalhamento do Lançamento Contábil
    let dateStr = '';
    if (tx.date) {
      const d = String(tx.date).trim();
      if (d.includes('-')) {
        const parts = d.split('T')[0].split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          dateStr = d;
        }
      } else {
        dateStr = d;
      }
    }

    const numVal = Math.abs(Number(tx.value || tx.amount || 0));
    const isIncome = Number(tx.value || tx.amount || 0) > 0;

    let debit = String(tx.debitAccount || tx.debito || tx.debit || '').trim();
    let credit = String(tx.creditAccount || tx.credito || tx.credit || '').trim();

    // If default bank counterpart account is set and accounts need filling
    if (defaultBankCounterpart) {
      if (!debit && !credit) {
        if (isIncome) {
          debit = defaultBankCounterpart;
          credit = '1101';
        } else {
          debit = '2101';
          credit = defaultBankCounterpart;
        }
      } else if (!debit && credit) {
        debit = defaultBankCounterpart;
      } else if (debit && !credit) {
        credit = defaultBankCounterpart;
      }
    }

    const valorStr = numVal.toFixed(2).replace('.', ',');
    const codHist = String(tx.historicCode || tx.codHist || '10').trim();
    const rawHistText = tx.historicText || tx.description || tx.historico || 'PAGAMENTO CONCILIADO CONTAHUB';
    const histText = sanitizeDominioText(rawHistText);

    lines.push(`|6100|${dateStr}|${debit}|${credit}|${valorStr}|${codHist}|${histText}||||`);
  });

  // Linha final de fechamento 0000 com CNPJ da empresa
  if (transactions.length > 0) {
    lines.push(`|0000|${companyCnpj}|`);
  }

  return lines.join('\r\n');
};

export const downloadTxtFile = (content, filename = 'lancamentos_dominio_sistemas.txt') => {
  const blob = new Blob([content], { type: 'text/plain;charset=windows-1252' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
