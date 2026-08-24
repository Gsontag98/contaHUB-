import React, { useState, useMemo, useRef } from 'react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Download, 
  UploadCloud, 
  Search, 
  Edit2, 
  Check, 
  AlertTriangle, 
  Sparkles,
  BookOpen,
  ArrowRight,
  X
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { exportRulesAsJson, importRulesFromJson } from '../../engine/rulesEngine.js';

export default function RulesPanel() {
  const { 
    deParaRules, 
    setDeParaRules, 
    addDeParaRule, 
    deleteDeParaRule, 
    planosList, 
    activePlanoId, 
    addToast 
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const formRef = useRef(null);

  // Active accounts for autocomplete
  const activePlan = useMemo(() => {
    return planosList.find(p => p.id === activePlanoId) || null;
  }, [planosList, activePlanoId]);

  const planoContas = activePlan?.accounts || [];

  const [newRule, setNewRule] = useState({
    pattern: '',
    ruleType: 'dynamic', // 'dynamic' | 'fixed'
    valueCondition: 'any', // 'any' | 'positive' | 'negative'
    debitAccount: '',
    creditAccount: '',
    targetAccount: '',
    historicCode: '',
    historicText: '',
    historyCols: []
  });

  // Autocomplete states
  const [activeInput, setActiveInput] = useState(null); // 'debit' | 'credit' | 'target'
  const [autoSearch, setAutoSearch] = useState('');

  const resetForm = () => {
    setEditingRuleId(null);
    setNewRule({
      pattern: '',
      ruleType: 'dynamic',
      valueCondition: 'any',
      debitAccount: '',
      creditAccount: '',
      targetAccount: '',
      historicCode: '',
      historicText: '',
      historyCols: []
    });
  };

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    setNewRule({ ...rule });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSaveRule = (e) => {
    e.preventDefault();
    if (!newRule.pattern.trim()) {
      addToast('Informe ao menos uma palavra-chave para a regra.', 'warning');
      return;
    }

    if (newRule.ruleType === 'dynamic' && !newRule.targetAccount.trim()) {
      addToast('Informe a conta contábil de destino para a regra dinâmica.', 'warning');
      return;
    }

    if (newRule.ruleType === 'fixed' && (!newRule.debitAccount.trim() || !newRule.creditAccount.trim())) {
      addToast('Informe a conta de Débito e de Crédito para a regra fixa.', 'warning');
      return;
    }

    if (editingRuleId) {
      const updatedList = deParaRules.map(r => r.id === editingRuleId ? { ...newRule, id: editingRuleId } : r);
      setDeParaRules(updatedList);
      addToast('Regra De-Para atualizada com sucesso!', 'success');
    } else {
      const created = {
        ...newRule,
        id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString()
      };
      addDeParaRule(created);
      addToast('Nova regra De-Para cadastrada com sucesso!', 'success');
    }

    resetForm();
  };

  const handleDeleteRule = (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    deleteDeParaRule(id);
    addToast('Regra excluída.', 'info');
  };

  const handleExportBackup = () => {
    if (deParaRules.length === 0) {
      addToast('Não há regras para exportar.', 'warning');
      return;
    }
    exportRulesAsJson(deParaRules, `contahub_regras_backup_${new Date().toISOString().split('T')[0]}.json`);
    addToast('Backup das regras baixado com sucesso!', 'success');
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const imported = await importRulesFromJson(file);
      setDeParaRules(imported);
      addToast(`Backup restaurado: ${imported.length} regras carregadas!`, 'success');
    } catch (err) {
      addToast('Falha ao restaurar arquivo JSON de regras.', 'error');
    } finally {
      e.target.value = null;
    }
  };

  // Autocomplete options
  const autocompleteOptions = useMemo(() => {
    if (!autoSearch || planoContas.length === 0) return [];
    const upper = autoSearch.toUpperCase();
    return planoContas.filter(acc =>
      acc.isSynthetic !== true && (
        acc.code.includes(upper) ||
        acc.name.toUpperCase().includes(upper) ||
        (acc.classification && acc.classification.includes(upper))
      )
    ).slice(0, 8);
  }, [planoContas, autoSearch]);

  const selectAutocompleteOption = (field, code) => {
    setNewRule(prev => ({ ...prev, [field]: code }));
    setActiveInput(null);
    setAutoSearch('');
  };

  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) return deParaRules;
    const q = searchTerm.toLowerCase().trim();
    return deParaRules.filter(r =>
      (r.pattern && r.pattern.toLowerCase().includes(q)) ||
      (r.debitAccount && r.debitAccount.toLowerCase().includes(q)) ||
      (r.creditAccount && r.creditAccount.toLowerCase().includes(q)) ||
      (r.targetAccount && r.targetAccount.toLowerCase().includes(q)) ||
      (r.historicText && r.historicText.toLowerCase().includes(q))
    );
  }, [deParaRules, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.3rem' }}>
              <Settings size={24} color="var(--accent-cyan)" />
              Regras De-Para Contábeis (Domínio Sistemas)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
              Defina regras inteligentes com filtros de sinal, contas do plano contábil e composição de históricos contábeis para automatizar lançamentos.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={handleExportBackup} title="Fazer Backup JSON">
              <Download size={14} /> Exportar Backup JSON
            </button>
            <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }} title="Restaurar Backup">
              <UploadCloud size={14} /> Importar Backup
              <input type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      {/* Grid: Form | Rules List */}
      <div style={{ display: 'grid', gridTemplateColumns: '440px 1fr', gap: '20px' }}>
        {/* Left: Form */}
        <div ref={formRef} className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingRuleId ? <Edit2 size={18} color="var(--accent-cyan)" /> : <Plus size={18} color="var(--accent-cyan)" />}
              {editingRuleId ? 'Editar Regra De-Para' : 'Nova Regra De-Para'}
            </h3>
            {editingRuleId && (
              <button className="btn btn-secondary btn-sm" onClick={resetForm}>Cancelar Edição</button>
            )}
          </div>

          <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Termo / Palavra-chave (no extrato/descrição):
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: TARIFA BANCARIA, PIX ENVIADO, ALUGUEL"
                value={newRule.pattern}
                onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Tipo de Regra:</label>
                <select
                  className="form-input"
                  value={newRule.ruleType}
                  onChange={(e) => setNewRule(prev => ({ ...prev, ruleType: e.target.value }))}
                >
                  <option value="dynamic">Dinâmica (Contrapartida)</option>
                  <option value="fixed">Fixa (Débito e Crédito)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Filtro de Sinal:</label>
                <select
                  className="form-input"
                  value={newRule.valueCondition}
                  onChange={(e) => setNewRule(prev => ({ ...prev, valueCondition: e.target.value }))}
                >
                  <option value="any">Qualquer Valor</option>
                  <option value="positive">Só Positivos (+)</option>
                  <option value="negative">Só Negativos (-)</option>
                </select>
              </div>
            </div>

            {/* Account Selector */}
            {newRule.ruleType === 'dynamic' ? (
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">
                  Conta Contábil de Destino:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Código da conta (ex: 1586 ou digite para buscar)"
                  value={newRule.targetAccount}
                  onChange={(e) => {
                    setNewRule(prev => ({ ...prev, targetAccount: e.target.value }));
                    setActiveInput('target');
                    setAutoSearch(e.target.value);
                  }}
                  onFocus={() => {
                    setActiveInput('target');
                    setAutoSearch(newRule.targetAccount);
                  }}
                  onBlur={() => setTimeout(() => setActiveInput(null), 250)}
                />

                {/* Autocomplete Dropdown */}
                {activeInput === 'target' && autocompleteOptions.length > 0 && (
                  <div className="autocomplete-dropdown">
                    {autocompleteOptions.map(acc => (
                      <div
                        key={acc.code}
                        className="autocomplete-item"
                        onMouseDown={() => selectAutocompleteOption('targetAccount', acc.code)}
                      >
                        <strong style={{ color: 'var(--accent-cyan)' }}>{acc.code}</strong> — {acc.name}
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{acc.classification}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Conta Débito:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Código Débito"
                    value={newRule.debitAccount}
                    onChange={(e) => {
                      setNewRule(prev => ({ ...prev, debitAccount: e.target.value }));
                      setActiveInput('debit');
                      setAutoSearch(e.target.value);
                    }}
                    onFocus={() => {
                      setActiveInput('debit');
                      setAutoSearch(newRule.debitAccount);
                    }}
                    onBlur={() => setTimeout(() => setActiveInput(null), 250)}
                  />

                  {activeInput === 'debit' && autocompleteOptions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autocompleteOptions.map(acc => (
                        <div
                          key={acc.code}
                          className="autocomplete-item"
                          onMouseDown={() => selectAutocompleteOption('debitAccount', acc.code)}
                        >
                          <strong>{acc.code}</strong> — {acc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Conta Crédito:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Código Crédito"
                    value={newRule.creditAccount}
                    onChange={(e) => {
                      setNewRule(prev => ({ ...prev, creditAccount: e.target.value }));
                      setActiveInput('credit');
                      setAutoSearch(e.target.value);
                    }}
                    onFocus={() => {
                      setActiveInput('credit');
                      setAutoSearch(newRule.creditAccount);
                    }}
                    onBlur={() => setTimeout(() => setActiveInput(null), 250)}
                  />

                  {activeInput === 'credit' && autocompleteOptions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {autocompleteOptions.map(acc => (
                        <div
                          key={acc.code}
                          className="autocomplete-item"
                          onMouseDown={() => selectAutocompleteOption('creditAccount', acc.code)}
                        >
                          <strong>{acc.code}</strong> — {acc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Historic Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Cód. Hist:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="10"
                  value={newRule.historicCode}
                  onChange={(e) => setNewRule(prev => ({ ...prev, historicCode: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Histórico Complementar:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: PGTO REF TARIFA MENSAL"
                  value={newRule.historicText}
                  onChange={(e) => setNewRule(prev => ({ ...prev, historicText: e.target.value }))}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
              <Check size={16} />
              <span>{editingRuleId ? 'Salvar Alterações da Regra' : 'Cadastrar Regra De-Para'}</span>
            </button>
          </form>
        </div>

        {/* Right: List of Rules */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-cyan)" />
              Regras De-Para Ativas ({filteredRules.length})
            </h3>
          </div>

          {/* Search Box */}
          <div className="panel-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-input panel-search-input"
              placeholder="Buscar regras por palavra-chave, conta ou histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                type="button"
                className="clear-search-btn" 
                onClick={() => setSearchTerm('')}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Rules Table */}
          <div style={{ maxHeight: '520px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table className="classic-data-table">
              <thead>
                <tr>
                  <th>Palavra-Chave</th>
                  <th style={{ width: '90px' }}>Tipo</th>
                  <th style={{ width: '80px' }}>Sinal</th>
                  <th>Contas</th>
                  <th>Histórico</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)' }}>
                      Nenhuma regra De-Para encontrada. Crie sua primeira regra no formulário ao lado.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map(rule => (
                    <tr key={rule.id}>
                      <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {rule.pattern}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
                          {rule.ruleType === 'dynamic' ? 'Dinâmica' : 'Fixa'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: rule.valueCondition === 'negative' ? 'var(--color-danger)' : rule.valueCondition === 'positive' ? 'var(--color-success)' : 'var(--text-muted)' }}>
                          {rule.valueCondition === 'negative' ? '(-) Débito' : rule.valueCondition === 'positive' ? '(+) Crédito' : 'Qualquer'}
                        </span>
                      </td>
                      <td>
                        {rule.ruleType === 'dynamic' ? (
                          <span>Destino: <strong>{rule.targetAccount}</strong></span>
                        ) : (
                          <span>D: <strong>{rule.debitAccount}</strong> | C: <strong>{rule.creditAccount}</strong></span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {rule.historicCode && `[${rule.historicCode}] `}{rule.historicText || '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          <button
                            className="card-action-btn edit-btn"
                            onClick={() => handleEditClick(rule)}
                            title="Editar Regra"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="card-action-btn delete-btn"
                            onClick={() => handleDeleteRule(rule.id)}
                            title="Excluir Regra"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
