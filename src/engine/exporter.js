import * as XLSX from 'xlsx';

export function generateEnrichedDescription(match) {
  const b = match.bankItems[0] || {};
  const s = match.supplierItems[0] || {};
  const isNtoOne = match.supplierItems.length > 1;

  const supplierName = s.supplierName || s.description || '';
  const doc = s.document || b.document || '';

  if (isNtoOne) {
    const docs = match.supplierItems.map(item => item.document).filter(Boolean).join(', ');
    return `PGTO NFS ${docs || 'DIVERSAS'} - ${supplierName}`.substring(0, 100);
  }

  if (doc && supplierName) {
    if (supplierName.toUpperCase().startsWith('PGTO NF') || supplierName.toUpperCase().startsWith('PAGAMENTO')) {
      return supplierName.substring(0, 100);
    }
    return `PGTO NF ${doc} - ${supplierName}`.substring(0, 100);
  }

  if (supplierName) {
    return `PGTO - ${supplierName}`.substring(0, 100);
  }

  return (b.description || 'CONCILIADO CONTAHUB').substring(0, 100);
}

export function exportReport(reconciliationResult) {
  const { matches, suggestions, missingInBank, missingInSupplier, totalBankCount, totalSupplierCount, reconciledRate } = reconciliationResult;

  const wb = XLSX.utils.book_new();

  // 1. Resumo Executivo
  const resumoData = [
    ['contaHUB — Resumo Executivo da Conciliação'],
    [],
    ['Métrica', 'Valor'],
    ['Total de Lançamentos - Banco', totalBankCount],
    ['Total de Lançamentos - Fornecedor', totalSupplierCount],
    ['Lançamentos Conciliados', `${matches.length} vínculos`],
    ['Taxa de Conciliação (%)', `${reconciledRate.toFixed(2)}%`],
    ['Pendentes - Banco', missingInSupplier.length],
    ['Pendentes - Fornecedor', missingInBank.length],
    [],
    ['Detalhamento por Passos']
  ];
  
  const passCounts = {};
  matches.forEach(m => {
    passCounts[m.passName] = (passCounts[m.passName] || 0) + 1;
  });
  
  for (const [pass, count] of Object.entries(passCounts)) {
    resumoData.push([pass, count]);
  }

  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Executivo');

  // 2. Conciliados (com Histórico Contábil Enriquecido)
  const conciliadosData = [
    ['Confiança', 'Passo', 'Histórico Contábil Enriquecido (Domínio)', 'Data Banco', 'Desc Banco', 'Valor Banco', 'Data Forn', 'Desc Forn', 'Valor Forn', 'Nota/Justificativa']
  ];
  
  matches.forEach(m => {
    const maxLen = Math.max(m.bankItems.length, m.supplierItems.length);
    const enrichedHist = generateEnrichedDescription(m);

    for (let i = 0; i < maxLen; i++) {
      const b = m.bankItems[i] || {};
      const s = m.supplierItems[i] || {};
      conciliadosData.push([
        i === 0 ? `${m.confidence}%` : '',
        i === 0 ? m.passName : '',
        i === 0 ? enrichedHist : '',
        b.date || '',
        b.description || '',
        b.amount !== undefined ? b.amount : '',
        s.date || '',
        s.description || '',
        s.amount !== undefined ? s.amount : '',
        i === 0 ? (m.notes || m.justificativa || '') : ''
      ]);
    }
  });

  const wsConciliados = XLSX.utils.aoa_to_sheet(conciliadosData);
  XLSX.utils.book_append_sheet(wb, wsConciliados, 'Conciliados');

  // 3. Sugestões Pendentes (Juros / Descontos)
  const sugestoesData = [
    ['Tipo', 'Diferença (R$)', 'Data Banco', 'Desc Banco', 'Valor Banco', 'Data Forn', 'Desc Forn', 'Valor Forn', 'Observação']
  ];
  
  suggestions.forEach(sug => {
    const b = sug.bankItem;
    const s = sug.supplierItem;
    sugestoesData.push([
      sug.type === 'JUROS_MULTA' ? 'Juros / Encargos' : 'Desconto Obtido',
      sug.diff,
      b.date,
      b.description,
      b.amount,
      s.date,
      s.description,
      s.amount,
      sug.notes
    ]);
  });

  const wsSugestoes = XLSX.utils.aoa_to_sheet(sugestoesData);
  XLSX.utils.book_append_sheet(wb, wsSugestoes, 'Sugestões Pendentes');

  // 4. Ausentes no Banco
  const ausentesBancoData = [
    ['Data Fornecedor', 'Descrição Fornecedor', 'Documento', 'Valor']
  ];
  missingInBank.forEach(s => {
    ausentesBancoData.push([s.date, s.description, s.document || '', s.amount]);
  });
  const wsAusentesBanco = XLSX.utils.aoa_to_sheet(ausentesBancoData);
  XLSX.utils.book_append_sheet(wb, wsAusentesBanco, 'Ausentes no Banco');

  // 5. Ausentes no Fornecedor
  const ausentesFornData = [
    ['Data Banco', 'Descrição Banco', 'Documento', 'Valor']
  ];
  missingInSupplier.forEach(b => {
    ausentesFornData.push([b.date, b.description, b.document || '', b.amount]);
  });
  const wsAusentesForn = XLSX.utils.aoa_to_sheet(ausentesFornData);
  XLSX.utils.book_append_sheet(wb, wsAusentesForn, 'Ausentes no Fornecedor');

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `contahub_conciliacao_${today}.xlsx`);
}

export function exportDominioTxt(reconciliationResult) {
  const { matches = [] } = reconciliationResult;
  const lines = [];

  matches.forEach(m => {
    const b = m.bankItems[0] || {};
    const s = m.supplierItems[0] || {};

    const dataFormatada = (b.date || s.date || '').split('-').reverse().join('/');
    const debito = s.lote || s.contrapartida || '555';
    const credito = b.lote || b.contrapartida || '777';
    const valor = (b.amount || s.amount || 0).toFixed(2).replace('.', ',');
    const historico = generateEnrichedDescription(m);

    // Formato padrão de importação Domínio Sistemas: DATA|DEBITO|CREDITO|VALOR|HISTORICO
    lines.push(`${dataFormatada}|${debito}|${credito}|${valor}|${historico}`);
  });

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=windows-1252' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contahub_importacao_dominio_${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
