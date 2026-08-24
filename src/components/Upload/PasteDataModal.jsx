import { useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { parsePastedText } from '../../engine/parser.js';
import { autoDetect, normalizeItems } from '../../engine/mapper.js';

export default function PasteDataModal() {
  const { pasteModalType, setPasteModalType, setBankFile, setSupplierFile, addToast } = useAppStore();
  const [text, setText] = useState('');

  if (!pasteModalType) return null;

  const isBank = pasteModalType === 'bank';

  const handleProcessPaste = () => {
    if (!text.trim()) {
      addToast('Cole o conteúdo da planilha no campo de texto.', 'warning');
      return;
    }

    try {
      const parsed = parsePastedText(text);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        throw new Error('Nenhum dado tabulado reconhecido.');
      }

      const mapping = autoDetect(parsed.headers);
      const items = normalizeItems(parsed.headers, parsed.rows, mapping, pasteModalType);

      const payload = {
        name: `Colado_${isBank ? 'Banco' : 'Fornecedor'}_${new Date().toLocaleTimeString().replace(/:/g, '')}`,
        size: text.length,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping,
        items,
        logs: [`[${new Date().toLocaleTimeString()}] Importado via Colar Direto (${items.length} itens)`]
      };

      if (isBank) setBankFile(payload);
      else setSupplierFile(payload);

      addToast(`✅ Planilha colada com sucesso: ${items.length} lançamentos detectados!`, 'success');
      setPasteModalType(null);
    } catch (err) {
      addToast(`❌ Erro ao processar texto: ${err.message}`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setPasteModalType(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clipboard size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Colar Dados do Excel — {isBank ? 'Extrato Bancário' : 'Razão de Fornecedores'}
            </h3>
          </div>
          <button className="btn-icon" onClick={() => setPasteModalType(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '14px', fontSize: '0.9rem' }}>
            Copie as linhas da planilha no Excel (Ctrl+C) incluindo os cabeçalhos de coluna e cole (Ctrl+V) abaixo:
          </p>
          <textarea
            className="form-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Exemplo:&#10;Data	Histórico	Débito	Crédito	Documento&#10;05/08/2026	PAG BOLETO FORNECEDOR ABC	1500,00		123456"
            style={{
              height: '240px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.85rem'
            }}
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setPasteModalType(null)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleProcessPaste}>
            <Check size={16} /> Processar Dados Colados
          </button>
        </div>
      </div>
    </div>
  );
}
