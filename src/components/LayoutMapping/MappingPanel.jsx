import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  HelpCircle, 
  RefreshCw, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  ArrowRight,
  Info,
  Layers,
  Code
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { normalizeText } from '../../engine/rulesEngine.js';

export default function MappingPanel() {
  const {
    bankFile,
    supplierFile,
    transactions,
    setTransactions,
    activeCompany,
    addToast
  } = useAppStore();

  const importedRawData = useMemoData(bankFile, supplierFile);

  const [dateCol, setDateCol] = useState('Data');
  const [valueCol, setValueCol] = useState('Valor');
  const [descColsText, setDescColsText] = useState('Histórico, Descrição');
  const [histColsText, setHistColsText] = useState('Histórico, Descrição');
  const [historyTemplate, setHistoryTemplate] = useState('{Histórico}');

  const historyInputRef = useRef(null);

  // Headers list from currently loaded file or demo fallback
  const headers = importedRawData ? importedRawData.headers : [];
  const demoHeaders = ['Data', 'Classificação', 'Pessoa', 'Descrição do lançamento', 'Valor'];
  const activeHeaders = headers.length > 0 ? headers : demoHeaders;

  const demoRows = [
    ['2026-05-02', 'Despesa Bancária', 'BANCO ITAU', 'TARIFA BANCARIA REF CARTAO', -42.50],
    ['2026-05-03', 'Recebimento', 'JOAO DA SILVA', 'PIX RECEBIDO DE JOAO DA SILVA', 1500.00],
    ['2026-05-04', 'Receita Financeira', 'BANCO ITAU', 'RENDIMENTO APLICACAO AUTOMATICA', 12.84]
  ];
  const previewRows = importedRawData ? importedRawData.rows.slice(0, 3) : demoRows;

  // Auto-detect columns heuristics
  const handleAutoDetect = () => {
    const list = activeHeaders;
    let detectedDate = '';
    let detectedValue = '';
    const detectedDesc = [];

    list.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('data') || lower.includes('dt') || lower.includes('dia') || lower === 'date') {
        detectedDate = header;
      }
      if (lower.includes('desc') || lower.includes('hist') || lower.includes('deta') || lower.includes('lança') || lower.includes('transa') || lower.includes('pessoa') || lower.includes('fornecedor') || lower.includes('nome')) {
        detectedDesc.push(header);
      }
      if (lower.includes('val') || lower.includes('vlr') || lower.includes('quant') || lower.includes('entr') || lower.includes('saí') || lower === 'amount' || lower.includes('valor')) {
        detectedValue = header;
      }
    });

    if (detectedDate) setDateCol(detectedDate);
    if (detectedValue) setValueCol(detectedValue);
    if (detectedDesc.length > 0) {
      setDescColsText(detectedDesc.join(', '));
      setHistColsText(detectedDesc.join(', '));
      setHistoryTemplate(detectedDesc.map(c => `{${c}}`).join(' - '));
    }

    addToast('Colunas detectadas automaticamente!', 'success');
  };

  const parseCommaString = (str) => {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const findHeaderIndex = (activeHeadersList, columnName) => {
    if (!columnName) return -1;
    const target = normalizeText(columnName);
    let idx = activeHeadersList.findIndex(h => normalizeText(h) === target);
    if (idx !== -1) return idx;
    return activeHeadersList.findIndex(h => normalizeText(h).includes(target));
  };

  const evaluateTemplateOnRow = (template, row, activeHeadersList) => {
    if (!template) return '';
    return template.replace(/\{([^}]+)\}/g, (match, colName) => {
      const idx = findHeaderIndex(activeHeadersList, colName);
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
        return String(row[idx]).trim();
      }
      return '';
    });
  };

  const insertPlaceholder = (colName) => {
    const input = historyInputRef.current;
    if (!input) {
      setHistoryTemplate(prev => `${prev} {${colName}}`);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = input.value || '';
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    const token = `{${colName}}`;
    const newValue = `${before}${token}${after}`;
    
    setHistoryTemplate(newValue);
    
    setTimeout(() => {
      input.focus();
      const newCursorPos = start + token.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleCheckboxToggle = (colName) => {
    const arr = parseCommaString(descColsText);
    const isChecked = arr.includes(colName);
    const newArr = isChecked ? arr.filter(x => x !== colName) : [...arr, colName];
    setDescColsText(newArr.join(', '));
  };

  const handleSave = (e) => {
    if (e) e.preventDefault();

    if (!dateCol.trim()) {
      addToast('A coluna de Data é obrigatória.', 'error');
      return;
    }
    if (!valueCol.trim()) {
      addToast('A coluna de Valor é obrigatória.', 'error');
      return;
    }
    if (!descColsText.trim()) {
      addToast('Ao menos uma coluna de Descrição deve ser definida.', 'error');
      return;
    }

    // If transactions loaded, update their history texts using the template
    if (transactions.length > 0) {
      const updated = transactions.map(tx => {
        let newHist = tx.historicText || tx.description;
        if (tx.rawRow && importedRawData) {
          const templated = evaluateTemplateOnRow(historyTemplate, tx.rawRow, importedRawData.headers);
          if (templated) newHist = templated;
        }
        return {
          ...tx,
          historicText: newHist
        };
      });
      setTransactions(updated);
    }

    addToast('Configurações de mapeamento de layout salvas com sucesso!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
            <Settings size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Configuração de Layout da Planilha</h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Parametrize as colunas de data, valores e fórmulas dinâmicas de histórico contábil para o Domínio Sistemas.
            </span>
          </div>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleAutoDetect} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={14} /> Auto-Detectar Colunas
        </button>
      </div>

      {/* Grid Layout: Left form, Right preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '20px' }}>
        {/* Form Card */}
        <form onSubmit={handleSave} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Layers size={18} color="var(--accent-cyan)" /> Parametrizar Colunas
          </h3>

          {/* 1. Coluna de Data */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Coluna da Data</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mapeia a data do lançamento</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Data" 
                value={dateCol} 
                onChange={(e) => setDateCol(e.target.value)} 
                style={{ flex: 1, height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
                required
              />
              {headers.length > 0 && (
                <select 
                  className="form-input" 
                  value={headers.includes(dateCol) ? dateCol : ''} 
                  onChange={(e) => setDateCol(e.target.value)} 
                  style={{ width: '150px', height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Selecionar --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* 2. Coluna de Valor */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Coluna de Valor</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mapeia o valor bruto ou líquido</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ex: Valor" 
                value={valueCol} 
                onChange={(e) => setValueCol(e.target.value)} 
                style={{ flex: 1, height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
                required
              />
              {headers.length > 0 && (
                <select 
                  className="form-input" 
                  value={headers.includes(valueCol) ? valueCol : ''} 
                  onChange={(e) => setValueCol(e.target.value)} 
                  style={{ width: '150px', height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
                >
                  <option value="">-- Selecionar --</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* 3. Coluna de Descrição */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 700, fontSize: '0.82rem' }}>
              Colunas para Descrição (separadas por vírgula):
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Ex: Pessoa, Descrição do lançamento" 
              value={descColsText} 
              onChange={(e) => setDescColsText(e.target.value)} 
              style={{ height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
            />
            {headers.length > 0 && (
              <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {headers.map(h => {
                  const activeArr = parseCommaString(descColsText);
                  const isChecked = activeArr.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      className={`chip-btn ${isChecked ? 'active' : ''}`}
                      style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                      onClick={() => handleCheckboxToggle(h)}
                    >
                      {isChecked ? '✓ ' : '+ '}{h}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Histórico Template */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>Histórico Contábil Padrão (Template)</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Use {"{Coluna}"} para campos</span>
            </label>
            <input 
              ref={historyInputRef}
              type="text" 
              className="form-input" 
              placeholder="Ex: PGTO {Pessoa} - {Descrição do lançamento}" 
              value={historyTemplate} 
              onChange={(e) => setHistoryTemplate(e.target.value)} 
              style={{ height: '38px', minHeight: '38px', boxSizing: 'border-box' }}
            />

            <div style={{ marginTop: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                Clique nas colunas detectadas para inserir no cursor:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeHeaders.map(h => (
                  <button
                    key={h}
                    type="button"
                    className="chip-btn"
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderColor: 'rgba(56,189,248,0.3)', color: 'var(--accent-cyan)' }}
                    onClick={() => insertPlaceholder(h)}
                  >
                    +{h}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 24px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} /> Salvar e Aplicar Layout
            </button>
          </div>
        </form>

        {/* Live Preview Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', margin: 0, color: 'var(--accent-cyan)', fontWeight: 700 }}>
              <Sparkles size={18} />
              Visualização em Tempo Real (Primeiras 3 Linhas)
            </h4>

            {!importedRawData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.15)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--color-warning)' }}>
                <Info size={15} style={{ flexShrink: 0 }} />
                <span>Exibindo dados de simulação. Carregue uma planilha para visualizar seus dados reais.</span>
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table className="classic-data-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                    <th>Histórico Gerado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => {
                    const dIdx = findHeaderIndex(activeHeaders, dateCol);
                    const vIdx = findHeaderIndex(activeHeaders, valueCol);
                    const descCols = parseCommaString(descColsText);
                    const descVal = descCols.map(c => {
                      const cIdx = findHeaderIndex(activeHeaders, c);
                      return cIdx !== -1 && row[cIdx] ? row[cIdx] : '';
                    }).filter(Boolean).join(' - ');

                    const genHistory = evaluateTemplateOnRow(historyTemplate, row, activeHeaders);

                    return (
                      <tr key={idx}>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{dIdx !== -1 && row[dIdx] ? String(row[dIdx]) : '-'}</td>
                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{descVal || '-'}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          {vIdx !== -1 && row[vIdx] !== undefined ? String(row[vIdx]) : '-'}
                        </td>
                        <td style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>{genHistory || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ padding: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Code size={20} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Como funciona o Template de Histórico:</strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                Você pode combinar qualquer coluna da planilha escrevendo entre chaves, por exemplo: <code>PGTO {'{Pessoa}'} REF NF {'{Documento}'}</code>. O sistema substitui automaticamente em cada linha!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useMemoData(bankFile, supplierFile) {
  return React.useMemo(() => {
    if (bankFile && bankFile.headers && bankFile.headers.length > 0) {
      return { headers: bankFile.headers, rows: bankFile.rows || [] };
    }
    if (supplierFile && supplierFile.headers && supplierFile.headers.length > 0) {
      return { headers: supplierFile.headers, rows: supplierFile.rows || [] };
    }
    return null;
  }, [bankFile, supplierFile]);
}
