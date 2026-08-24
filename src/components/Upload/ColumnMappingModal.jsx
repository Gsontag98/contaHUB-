import { useState } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { FIELDS, normalizeItems } from '../../engine/mapper.js';

export default function ColumnMappingModal() {
  const { mappingModalType, setMappingModalType, bankFile, supplierFile, setBankFile, setSupplierFile, addToast } = useAppStore();

  if (!mappingModalType) return null;

  const isBank = mappingModalType === 'bank';
  const fileData = isBank ? bankFile : supplierFile;
  const setFile = isBank ? setBankFile : setSupplierFile;

  if (!fileData) return null;

  const [currentMapping, setCurrentMapping] = useState({ ...fileData.mapping });

  const handleSave = () => {
    try {
      const updatedItems = normalizeItems(fileData.headers, fileData.rows, currentMapping, mappingModalType);
      setFile({
        ...fileData,
        mapping: currentMapping,
        items: updatedItems
      });
      addToast(`✅ Mapeamento atualizado: ${updatedItems.length} lançamentos processados!`, 'success');
      setMappingModalType(null);
    } catch (err) {
      addToast(`❌ Erro ao aplicar mapeamento: ${err.message}`, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setMappingModalType(null)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SlidersHorizontal size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Mapeamento de Colunas — {isBank ? 'Banco' : 'Fornecedor'}
            </h3>
          </div>
          <button className="btn-icon" onClick={() => setMappingModalType(null)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.88rem' }}>
            Selecione qual coluna do arquivo corresponde a cada campo do sistema contábil:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {FIELDS.map(field => (
              <div key={field.key} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: '12px' }}>
                <label className="form-label" style={{ color: field.required ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>
                  {field.label} {field.required && '*'}
                </label>
                <select
                  className="form-input"
                  value={currentMapping[field.key] || ''}
                  onChange={(e) => setCurrentMapping({ ...currentMapping, [field.key]: e.target.value || null })}
                >
                  <option value="">(Não mapeado / Vazio)</option>
                  {fileData.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={() => setMappingModalType(null)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Check size={16} /> Aplicar Mapeamento
          </button>
        </div>
      </div>
    </div>
  );
}
