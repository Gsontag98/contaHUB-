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
  X
} from 'lucide-react';
import { normalizeText } from '../../engine/rulesEngine.js';

export default function MappingModal({ 
  isOpen,
  onClose,
  columnMapping = {}, 
  setColumnMapping, 
  importedRawData, 
  onProcess, 
  addToast
}) {
  const [dateCol, setDateCol] = useState(columnMapping.date || '');
  const [valueCol, setValueCol] = useState(columnMapping.value || '');
  const [descColsText, setDescColsText] = useState((columnMapping.description || []).join(', '));
  const [histColsText, setHistColsText] = useState((columnMapping.historyCols || []).join(', '));
  const [historyTemplate, setHistoryTemplate] = useState(columnMapping.historyTextTemplate || '');

  const historyInputRef = useRef(null);

  useEffect(() => {
    setDateCol(columnMapping.date || '');
    setValueCol(columnMapping.value || '');
    setDescColsText((columnMapping.description || []).join(', '));
    setHistColsText((columnMapping.historyCols || []).join(', '));
    setHistoryTemplate(columnMapping.historyTextTemplate || '');
  }, [columnMapping, isOpen]);

  if (!isOpen) return null;

  const headers = importedRawData ? importedRawData.headers : [];
  const demoHeaders = ['Data', 'Classificação', 'Pessoa', 'Descrição do lançamento', 'Valor'];
  const activeHeaders = headers.length > 0 ? headers : demoHeaders;

  const demoRows = [
    ['2026-05-02', 'Despesa Bancária', 'BANCO ITAU', 'TARIFA BANCARIA REF CARTAO', -42.50],
    ['2026-05-03', 'Recebimento', 'JOAO DA SILVA', 'PIX RECEBIDO DE JOAO DA SILVA', 1500.00],
    ['2026-05-04', 'Receita Financeira', 'BANCO ITAU', 'RENDIMENTO APLICACAO AUTOMATICA', 12.84]
  ];
  const previewRows = importedRawData ? importedRawData.rows.slice(0, 3) : demoRows;

  const handleAutoDetect = () => {
    const list = activeHeaders;
    const mapping = { date: '', description: [], value: '', historyCols: [], historyTextTemplate: '' };
    
    list.forEach((header) => {
      const lower = header.toLowerCase();
      if (lower.includes('data') || lower.includes('dt') || lower.includes('dia') || lower === 'date') {
        mapping.date = header;
      }
      if (lower.includes('desc') || lower.includes('hist') || lower.includes('deta') || lower.includes('lança') || lower.includes('transa') || lower.includes('pessoa') || lower.includes('fornecedor')) {
        mapping.description.push(header);
      }
      if (lower.includes('val') || lower.includes('vlr') || lower.includes('quant') || lower.includes('entr') || lower.includes('saí') || lower === 'amount' || lower.includes('valor')) {
        mapping.value = header;
      }
    });

    if (mapping.description.length > 0) {
      mapping.historyCols = [...mapping.description];
      mapping.historyTextTemplate = mapping.description.map(c => `{${c}}`).join(' - ');
    }

    setDateCol(mapping.date);
    setValueCol(mapping.value);
    setDescColsText(mapping.description.join(', '));
    setHistColsText(mapping.historyCols.join(', '));
    setHistoryTemplate(mapping.historyTextTemplate);

    addToast('Colunas detectadas automaticamente!', 'success');
  };

  const parseCommaString = (str) => {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleSave = () => {
    const descCols = parseCommaString(descColsText);
    const histCols = parseCommaString(histColsText);

    if (!dateCol) {
      addToast('A coluna de Data é obrigatória.', 'warning');
      return;
    }
    if (descCols.length === 0) {
      addToast('Informe pelo menos uma coluna de Descrição.', 'warning');
      return;
    }
    if (!valueCol) {
      addToast('A coluna de Valor é obrigatória.', 'warning');
      return;
    }

    const newMapping = {
      date: dateCol,
      description: descCols,
      value: valueCol,
      historyCols: histCols.length > 0 ? histCols : descCols,
      historyTextTemplate: historyTemplate || descCols.map(c => `{${c}}`).join(' - ')
    };

    setColumnMapping(newMapping);
    if (onProcess) {
      onProcess(newMapping);
    }
    addToast('Layout de colunas configurado com sucesso!', 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.15rem' }}>
            <Settings size={20} color="var(--accent-cyan)" />
            Configurar Layout da Planilha
          </h3>
          <button onClick={onClose} className="btn-outline btn-sm" style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            Configure o mapeamento entre as colunas do seu arquivo importado e os campos contábeis do Domínio Sistemas.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleAutoDetect} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-cyan)" /> Auto-Detectar Colunas
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Coluna de Data:</label>
              <select className="form-input" value={dateCol} onChange={(e) => setDateCol(e.target.value)}>
                <option value="">-- Selecione a coluna --</option>
                {activeHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Coluna de Valor:</label>
              <select className="form-input" value={valueCol} onChange={(e) => setValueCol(e.target.value)}>
                <option value="">-- Selecione a coluna --</option>
                {activeHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Colunas de Descrição / Fornecedor (separadas por vírgula):
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={descColsText} 
              onChange={(e) => setDescColsText(e.target.value)}
              placeholder="Ex: Pessoa, Descrição do lançamento" 
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
              {activeHeaders.map(h => (
                <button
                  key={h}
                  type="button"
                  className="chip-btn"
                  onClick={() => {
                    const current = parseCommaString(descColsText);
                    if (!current.includes(h)) {
                      setDescColsText([...current, h].join(', '));
                    }
                  }}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  + {h}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
              Modelo de Histórico do Lançamento (Template):
            </label>
            <input 
              ref={historyInputRef}
              type="text" 
              className="form-input" 
              value={historyTemplate} 
              onChange={(e) => setHistoryTemplate(e.target.value)}
              placeholder="Ex: PGTO {Pessoa} - {Descrição do lançamento}" 
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Use chaves como <code>{'{Pessoa}'}</code> para concatenar os campos da planilha no histórico final.
            </span>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={15} /> Aplicar Mapeamento
          </button>
        </div>
      </div>
    </div>
  );
}
