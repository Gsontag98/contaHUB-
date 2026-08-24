import { useState, useEffect } from 'react';
import { X, BookOpen, Plus, Trash2, Check, ArrowRight } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { getDeParaRules, saveDeParaRule, deleteDeParaRule } from '../../engine/deParaStorage.js';

export default function DeParaModal() {
  const { isDeParaModalOpen, setIsDeParaModalOpen, addToast } = useAppStore();
  const [rules, setRules] = useState([]);
  const [bankPattern, setBankPattern] = useState('');
  const [supplierPattern, setSupplierPattern] = useState('');
  const [description, setDescription] = useState('');

  const refreshRules = () => {
    setRules(getDeParaRules());
  };

  useEffect(() => {
    if (isDeParaModalOpen) {
      refreshRules();
    }
  }, [isDeParaModalOpen]);

  if (!isDeParaModalOpen) return null;

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!bankPattern.trim() || !supplierPattern.trim()) {
      addToast('Preencha os padrões do Banco e do Fornecedor.', 'warning');
      return;
    }

    saveDeParaRule(bankPattern.trim(), supplierPattern.trim(), description.trim());
    setBankPattern('');
    setSupplierPattern('');
    setDescription('');
    refreshRules();
    addToast('Regra De-Para salva com sucesso!', 'success');
  };

  const handleDeleteRule = (id) => {
    deleteDeParaRule(id);
    refreshRules();
    addToast('Regra removida do dicionário.', 'info');
  };

  return (
    <div className="modal-overlay" onClick={() => setIsDeParaModalOpen(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Dicionário de Regras Aprendidas De-Para
            </h3>
          </div>
          <button className="btn-outline btn-sm" onClick={() => setIsDeParaModalOpen(false)}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* ADD RULE FORM */}
          <form onSubmit={handleAddRule} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '10px' }}>
              + Adicionar Nova Regra De-Para
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <input
                type="text"
                placeholder="Padrão no Banco (ex: SISPAG EMBRAER)"
                value={bankPattern}
                onChange={(e) => setBankPattern(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
              <input
                type="text"
                placeholder="Padrão no Fornecedor (ex: EMBRAER SA)"
                value={supplierPattern}
                onChange={(e) => setSupplierPattern(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Descrição / Observação (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                <Plus size={14} /> Salvar Regra
              </button>
            </div>
          </form>

          {/* RULES LIST */}
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Regras Ativas ({rules.length})
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
            {rules.map(rule => (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--bank-color)' }}>{rule.bankPattern}</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                  <span style={{ fontWeight: 700, color: 'var(--supplier-color)' }}>{rule.supplierPattern}</span>
                  {rule.description && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({rule.description})</span>
                  )}
                </div>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteRule(rule.id)}
                  title="Excluir regra"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={() => setIsDeParaModalOpen(false)}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
