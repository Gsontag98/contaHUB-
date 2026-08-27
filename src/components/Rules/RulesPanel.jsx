import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  X,
  Layers,
  HelpCircle,
  Play,
  RotateCcw,
  Tag,
  DollarSign,
  FileText,
  Copy,
  CheckCircle2,
  Filter
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  exportRulesAsJson, 
  importRulesFromJson, 
  simulateRule 
} from '../../engine/rulesEngine.js';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function RulesPanel() {
  const { 
    deParaRules, 
    setDeParaRules, 
    addDeParaRule, 
    deleteDeParaRule, 
    planosList, 
    activePlanoId, 
    activeCompany,
    transactions,
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

  // Default empty form state
  const initialFormState = {
    name: '',
    // 1. Text Logic
    mustContainAllInput: '', // AND (comma-separated or string)
    mayContainAnyInput: '',  // OR (comma-separated or string)
    mustNotContainInput: '', // NOT (comma-separated or string)
    
    // 2. Value Logic
    valueType: 'any', // 'any' | 'exact' | 'range' | 'greater' | 'less'
    exactValue: '',
    minValue: '',
    maxValue: '',
    signalCondition: 'any', // 'any' | 'debit_only' | 'credit_only'
    
    // 3. Accounting resolution
    ruleType: 'dynamic', // 'dynamic' | 'fixed'
    targetAccount: '',
    debitAccount: '',
    creditAccount: '',
    
    // 4. History Template & Code
    historicCode: '10',
    historicTextTemplate: ''
  };

  const [formState, setFormState] = useState(initialFormState);

  // Autocomplete state
  const [activeInput, setActiveInput] = useState(null); // 'debit' | 'credit' | 'target'
  const [autoSearch, setAutoSearch] = useState('');

  // Convert formState into rule object for simulation and saving
  const currentRuleObj = useMemo(() => {
    const mustAll = formState.mustContainAllInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const mayAny = formState.mayContainAnyInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const mustNot = formState.mustNotContainInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    return {
      id: editingRuleId || 'temp_rule',
      name: formState.name.trim() || (mustAll.length > 0 ? mustAll.join(' + ') : 'Nova Regra'),
      mustContainAll: mustAll,
      mayContainAny: mayAny,
      mustNotContain: mustNot,
      pattern: mustAll.join(','),
      orPattern: mayAny.join(','),
      notPattern: mustNot.join(','),
      valueType: formState.valueType,
      exactValue: formState.exactValue ? parseFloat(formState.exactValue) : null,
      minValue: formState.minValue ? parseFloat(formState.minValue) : null,
      maxValue: formState.maxValue ? parseFloat(formState.maxValue) : null,
      signalCondition: formState.signalCondition,
      ruleType: formState.ruleType,
      targetAccount: formState.targetAccount.trim(),
      debitAccount: formState.debitAccount.trim(),
      creditAccount: formState.creditAccount.trim(),
      historicCode: formState.historicCode.trim() || '10',
      historicTextTemplate: formState.historicTextTemplate.trim()
    };
  }, [formState, editingRuleId]);

  // Live Simulator against current transactions in store
  const simulationResult = useMemo(() => {
    if (!transactions || transactions.length === 0) return { count: 0, matches: [], sample: null };
    if (!formState.mustContainAllInput.trim() && !formState.mayContainAnyInput.trim()) {
      return { count: 0, matches: [], sample: null };
    }
    return simulateRule(currentRuleObj, transactions, '1001');
  }, [currentRuleObj, transactions]);

  const resetForm = () => {
    setEditingRuleId(null);
    setFormState(initialFormState);
  };

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    setFormState({
      name: rule.name || '',
      mustContainAllInput: (rule.mustContainAll && Array.isArray(rule.mustContainAll)) 
        ? rule.mustContainAll.join(', ') 
        : (rule.pattern || ''),
      mayContainAnyInput: (rule.mayContainAny && Array.isArray(rule.mayContainAny)) 
        ? rule.mayContainAny.join(', ') 
        : (rule.orPattern || ''),
      mustNotContainInput: (rule.mustNotContain && Array.isArray(rule.mustNotContain)) 
        ? rule.mustNotContain.join(', ') 
        : (rule.notPattern || ''),
      valueType: rule.valueType || 'any',
      exactValue: rule.exactValue !== null && rule.exactValue !== undefined ? String(rule.exactValue) : '',
      minValue: rule.minValue !== null && rule.minValue !== undefined ? String(rule.minValue) : '',
      maxValue: rule.maxValue !== null && rule.maxValue !== undefined ? String(rule.maxValue) : '',
      signalCondition: rule.signalCondition || rule.valueCondition || 'any',
      ruleType: rule.ruleType || 'dynamic',
      targetAccount: rule.targetAccount || '',
      debitAccount: rule.debitAccount || '',
      creditAccount: rule.creditAccount || '',
      historicCode: rule.historicCode || '10',
      historicTextTemplate: rule.historicTextTemplate || rule.historicText || ''
    });

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDuplicateRule = (rule) => {
    const duplicated = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${rule.name || 'Regra'} (Cópia)`,
      createdAt: new Date().toISOString()
    };
    addDeParaRule(duplicated);
    addToast('Regra duplicada com sucesso!', 'info');
  };

  const handleSaveRule = (e) => {
    e.preventDefault();

    if (!formState.mustContainAllInput.trim() && !formState.mayContainAnyInput.trim()) {
      addToast('Informe ao menos uma condição de texto (E ou OU) para a regra.', 'warning');
      return;
    }

    if (formState.ruleType === 'dynamic' && !formState.targetAccount.trim()) {
      addToast('Informe a conta contábil de destino para a regra dinâmica.', 'warning');
      return;
    }

    if (formState.ruleType === 'fixed' && (!formState.debitAccount.trim() || !formState.creditAccount.trim())) {
      addToast('Informe a conta de Débito e de Crédito para a regra fixa.', 'warning');
      return;
    }

    const savedRule = {
      ...currentRuleObj,
      id: editingRuleId || `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: editingRuleId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingRuleId) {
      const updatedList = deParaRules.map(r => r.id === editingRuleId ? savedRule : r);
      setDeParaRules(updatedList);
      addToast('Regra De-Para atualizada com sucesso!', 'success');
    } else {
      addDeParaRule(savedRule);
      addToast('Nova regra De-Para inteligente cadastrada com sucesso!', 'success');
    }

    resetForm();
  };

  const handleDeleteRule = (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    deleteDeParaRule(id);
    addToast('Regra excluída.', 'info');
  };

  // Helper to insert placeholders into the history template
  const insertTag = (tag) => {
    const current = formState.historicTextTemplate;
    const next = current ? `${current} ${tag}` : tag;
    setFormState(prev => ({ ...prev, historicTextTemplate: next }));
  };

  // Filtered accounts for autocomplete
  const filteredAccounts = useMemo(() => {
    if (!autoSearch.trim()) return planoContas.slice(0, 8);
    const q = autoSearch.toLowerCase().trim();
    return planoContas.filter(acc => 
      String(acc.code).toLowerCase().includes(q) || 
      acc.name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [planoContas, autoSearch]);

  const selectAccount = (code) => {
    if (activeInput === 'target') {
      setFormState(prev => ({ ...prev, targetAccount: String(code) }));
    } else if (activeInput === 'debit') {
      setFormState(prev => ({ ...prev, debitAccount: String(code) }));
    } else if (activeInput === 'credit') {
      setFormState(prev => ({ ...prev, creditAccount: String(code) }));
    }
    setActiveInput(null);
    setAutoSearch('');
  };

  // Filter rules list by search term
  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) return deParaRules;
    const q = searchTerm.toLowerCase().trim();
    return deParaRules.filter(r => {
      const nameMatch = (r.name || '').toLowerCase().includes(q);
      const patternMatch = (r.pattern || '').toLowerCase().includes(q) ||
        (r.mustContainAll || []).some(t => t.toLowerCase().includes(q));
      const accMatch = (r.targetAccount || '').includes(q) || 
        (r.debitAccount || '').includes(q) || 
        (r.creditAccount || '').includes(q);
      const histMatch = (r.historicTextTemplate || r.historicText || '').toLowerCase().includes(q);
      return nameMatch || patternMatch || accMatch || histMatch;
    });
  }, [deParaRules, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '50px' }}>
      {/* Header Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: '12px' }}>
            <Sparkles size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>Motor de Regras De-Para Inteligente</h2>
              <span className="badge badge-accent">
                {deParaRules.length} {deParaRules.length === 1 ? 'Regra Ativa' : 'Regras Ativas'}
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Crie regras com lógica booleana (<strong>E</strong>, <strong>OU</strong>, <strong>NÃO</strong>), filtros de valores exatos/faixas e geração dinâmica de histórico com variáveis.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UploadCloud size={15} />
            <span>Importar JSON</span>
            <input 
              type="file" 
              accept=".json" 
              style={{ display: 'none' }} 
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const imported = await importRulesFromJson(file);
                    setDeParaRules([...imported, ...deParaRules]);
                    addToast(`✅ ${imported.length} regras importadas com sucesso!`, 'success');
                  } catch (err) {
                    addToast(`❌ Erro ao importar: ${err.message}`, 'error');
                  }
                }
              }} 
            />
          </label>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => exportRulesAsJson(deParaRules, activeCompany?.name || 'empresa')}
            disabled={deParaRules.length === 0}
          >
            <Download size={15} />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form Builder (Left) + Live Simulation / Diagnostics (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(450px, 1.4fr) minmax(320px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* ========================================================================= */}
        {/* RULE FORM BUILDER */}
        {/* ========================================================================= */}
        <div ref={formRef} className="card" style={{ border: editingRuleId ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
                {editingRuleId ? '✏️ Editando Regra De-Para' : '➕ Construtor de Nova Regra De-Para'}
              </h3>
            </div>
            {editingRuleId && (
              <button className="btn btn-secondary btn-sm" onClick={resetForm} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                <RotateCcw size={12} /> Cancelar Edição
              </button>
            )}
          </div>

          <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Rule Name */}
            <div>
              <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                Nome / Identificador da Regra
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Tarifas Mensais Conta Itaú, Posto de Combustível..."
                value={formState.name}
                onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* BLOCO 1: LÓGICA TEXTUAL (E, OU, NÃO) */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                <Tag size={15} />
                <span>1. Lógica Textual & Palavras-Chave (E, OU, NÃO)</span>
              </div>

              {/* 1.1 E (AND) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    🟢 Contém TODAS as palavras (Operador E / AND)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Separe por vírgula</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: TARIFA, ITAU (ambas obrigatórias)"
                  value={formState.mustContainAllInput}
                  onChange={(e) => setFormState(prev => ({ ...prev, mustContainAllInput: e.target.value }))}
                />
              </div>

              {/* 1.2 OU (OR) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    🔵 Contém QUALQUER uma destas (Operador OU / OR)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Opcional</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: MENSALIDADE, COBRANCA, DOC, TED (basta 1)"
                  value={formState.mayContainAnyInput}
                  onChange={(e) => setFormState(prev => ({ ...prev, mayContainAnyInput: e.target.value }))}
                />
              </div>

              {/* 1.3 NÃO (NOT / EXCEÇÃO) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                    🔴 NÃO PODE Conter (Operador NÃO / NOT - Exceções)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Bloqueia se encontrar</span>
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: ESTORNO, CANCELAMENTO, DEVOLUCAO"
                  value={formState.mustNotContainInput}
                  onChange={(e) => setFormState(prev => ({ ...prev, mustNotContainInput: e.target.value }))}
                />
              </div>
            </div>

            {/* BLOCO 2: CONDIÇÕES DE VALOR & SINAL */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                <DollarSign size={15} />
                <span>2. Condições de Valor Financeiro & Sinal</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Condição de Valor
                  </label>
                  <select
                    className="form-input"
                    value={formState.valueType}
                    onChange={(e) => setFormState(prev => ({ ...prev, valueType: e.target.value }))}
                  >
                    <option value="any">Qualquer Valor (Sem restrição)</option>
                    <option value="exact">Valor Exato (== R$)</option>
                    <option value="range">Faixa de Valor (Entre Min e Max)</option>
                    <option value="greater">Maior que (&gt; R$)</option>
                    <option value="less">Menor que (&lt; R$)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Sinal / Movimento
                  </label>
                  <select
                    className="form-input"
                    value={formState.signalCondition}
                    onChange={(e) => setFormState(prev => ({ ...prev, signalCondition: e.target.value }))}
                  >
                    <option value="any">Qualquer Movimento (+ / -)</option>
                    <option value="debit_only">Apenas Saídas (Débito [-])</option>
                    <option value="credit_only">Apenas Entradas (Crédito [+])</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Value Inputs */}
              {formState.valueType === 'exact' && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Valor Exato (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Ex: 49.90"
                    value={formState.exactValue}
                    onChange={(e) => setFormState(prev => ({ ...prev, exactValue: e.target.value }))}
                    required
                  />
                </div>
              )}

              {formState.valueType === 'range' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Valor Mínimo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="Ex: 10.00"
                      value={formState.minValue}
                      onChange={(e) => setFormState(prev => ({ ...prev, minValue: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem' }}>Valor Máximo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="Ex: 100.00"
                      value={formState.maxValue}
                      onChange={(e) => setFormState(prev => ({ ...prev, maxValue: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}

              {(formState.valueType === 'greater' || formState.valueType === 'less') && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    {formState.valueType === 'greater' ? 'Valor Limite Mínimo (> R$)' : 'Valor Limite Máximo (< R$)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Ex: 500.00"
                    value={formState.exactValue}
                    onChange={(e) => setFormState(prev => ({ ...prev, exactValue: e.target.value }))}
                    required
                  />
                </div>
              )}
            </div>

            {/* BLOCO 3: CONTAS CONTÁBEIS & PLANO */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-petroleum)' }}>
                  <BookOpen size={15} />
                  <span>3. Contas Contábeis & Resolução</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ruleTypeRadio"
                      checked={formState.ruleType === 'dynamic'}
                      onChange={() => setFormState(prev => ({ ...prev, ruleType: 'dynamic' }))}
                    />
                    <span>Dinâmica (Recomendada)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ruleTypeRadio"
                      checked={formState.ruleType === 'fixed'}
                      onChange={() => setFormState(prev => ({ ...prev, ruleType: 'fixed' }))}
                    />
                    <span>Fixa (Débito e Crédito)</span>
                  </label>
                </div>
              </div>

              {formState.ruleType === 'dynamic' ? (
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    Conta Contábil de Destino (Despesa / Fornecedor / Receita)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Código ou Nome (ex: 3101 - Tarifas Bancárias)"
                      value={formState.targetAccount}
                      onFocus={() => { setActiveInput('target'); setAutoSearch(formState.targetAccount); }}
                      onChange={(e) => {
                        setFormState(prev => ({ ...prev, targetAccount: e.target.value }));
                        setAutoSearch(e.target.value);
                      }}
                      required
                    />
                    {activeInput === 'target' && planoContas.length > 0 && (
                      <div className="autocomplete-dropdown glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', marginTop: '4px', padding: '4px' }}>
                        {filteredAccounts.map(acc => (
                          <div
                            key={acc.id || acc.code}
                            style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', borderBottom: '1px solid var(--border-subtle)' }}
                            onMouseDown={() => selectAccount(acc.code)}
                          >
                            <strong>{acc.code}</strong> — {acc.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Conta Débito</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 3101"
                      value={formState.debitAccount}
                      onChange={(e) => setFormState(prev => ({ ...prev, debitAccount: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Conta Crédito</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 1001"
                      value={formState.creditAccount}
                      onChange={(e) => setFormState(prev => ({ ...prev, creditAccount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO 4: HISTÓRICO COM TAGS */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                <FileText size={15} />
                <span>4. Histórico Contábil & Variáveis Inteligentes</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Código Histórico</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="10"
                    value={formState.historicCode}
                    onChange={(e) => setFormState(prev => ({ ...prev, historicCode: e.target.value }))}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700 }}>
                      Template do Histórico Complementar
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Clique nas tags abaixo para inserir</span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: PAGAMENTO A [FORNECEDOR] REF [HISTORICO] - NF [DOC]"
                    value={formState.historicTextTemplate}
                    onChange={(e) => setFormState(prev => ({ ...prev, historicTextTemplate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Tag Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Variáveis Rápidas:</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[HISTORICO]')} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  + [HISTORICO]
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[FORNECEDOR]')} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  + [FORNECEDOR]
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[DOC]')} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  + [DOC]
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[DATA]')} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  + [DATA]
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[VALOR]')} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  + [VALOR]
                </button>
              </div>
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {editingRuleId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn btn-primary">
                <Check size={16} />
                <span>{editingRuleId ? 'Salvar Alterações da Regra' : 'Cadastrar Regra De-Para'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* LIVE SIMULATOR & DIAGNOSTIC CARD */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Real-Time Simulator Box */}
          <div className="card glass-card" style={{ border: simulationResult.count > 0 ? '1.5px solid var(--color-success)' : '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={18} color={simulationResult.count > 0 ? 'var(--color-success)' : 'var(--accent-cyan)'} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>
                Simulador em Tempo Real
              </h4>
            </div>

            <div style={{ 
              padding: '12px', 
              borderRadius: '8px', 
              background: simulationResult.count > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)', 
              border: `1px solid ${simulationResult.count > 0 ? 'var(--color-success)' : 'var(--border-subtle)'}`,
              marginBottom: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  Lançamentos Atendidos:
                </span>
                <span style={{ 
                  fontSize: '0.95rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)',
                  color: simulationResult.count > 0 ? 'var(--color-success)' : 'var(--text-muted)'
                }}>
                  {simulationResult.count} {simulationResult.count === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {transactions.length === 0 
                  ? 'Importe um extrato bancário para testar em tempo real.'
                  : `Testado contra ${transactions.length} lançamentos da tabela atual.`}
              </span>
            </div>

            {simulationResult.sample ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Prévia do 1º Lançamento Afetado:
                </span>

                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Original:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{simulationResult.sample.original.description}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Valor:</span>
                    <span style={{ fontWeight: 700, color: simulationResult.sample.original.value < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                      {formatCurrency(simulationResult.sample.original.value)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>Débito / Crédito:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {simulationResult.sample.result.debitAccount || '—'} / {simulationResult.sample.result.creditAccount || '—'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>Histórico Gerado:</span>
                    <span style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-primary)', textAlign: 'right', maxWidth: '180px' }}>
                      {simulationResult.sample.result.historicText}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'var(--bg-surface)', borderRadius: '6px', border: '1px dashed var(--border-subtle)' }}>
                Nenhum lançamento atual atende aos critérios preenchidos no formulário.
              </div>
            )}
          </div>

          {/* Quick Guide Card */}
          <div className="card" style={{ background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              <HelpCircle size={15} color="var(--accent-cyan)" />
              <span>Dicas de Operadores Lógicos</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
              <li><strong>E (AND):</strong> Todas as palavras digitadas precisam estar na descrição (ex: <code>TARIFA, ITAU</code>).</li>
              <li><strong>OU (OR):</strong> Basta qualquer uma das palavras aparecer para ativar a regra.</li>
              <li><strong>NÃO (NOT):</strong> Se a palavra aparecer (ex: <code>ESTORNO</code>), a regra é ignorada imediatamente.</li>
              <li><strong>Tags:</strong> <code>[FORNECEDOR]</code> puxa o nome identificado no cruzamento contábil.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RULES LIST & SEARCH */}
      {/* ========================================================================= */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              Regras De-Para Cadastradas ({filteredRules.length})
            </h3>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Buscar regras por nome, conta, termo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        {filteredRules.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
            Nenhuma regra De-Para encontrada com os critérios informados.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredRules.map(rule => {
              const mustList = (rule.mustContainAll && Array.isArray(rule.mustContainAll)) ? rule.mustContainAll : (rule.pattern ? rule.pattern.split(',') : []);
              const mayList = (rule.mayContainAny && Array.isArray(rule.mayContainAny)) ? rule.mayContainAny : (rule.orPattern ? rule.orPattern.split(',') : []);
              const notList = (rule.mustNotContain && Array.isArray(rule.mustNotContain)) ? rule.mustNotContain : (rule.notPattern ? rule.notPattern.split(',') : []);

              return (
                <div
                  key={rule.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    flexWrap: 'wrap',
                    gap: '14px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '65%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {rule.name || rule.pattern || 'Regra Sem Nome'}
                      </strong>
                      <span className="badge badge-subtle" style={{ fontSize: '0.7rem' }}>
                        {rule.ruleType === 'dynamic' ? 'Dinâmica' : 'Fixa'}
                      </span>
                      {rule.signalCondition && rule.signalCondition !== 'any' && (
                        <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(45, 212, 191, 0.1)', color: 'var(--accent-cyan)' }}>
                          {rule.signalCondition === 'debit_only' ? 'Apenas Saídas (-)' : 'Apenas Entradas (+)'}
                        </span>
                      )}
                    </div>

                    {/* Logic Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {mustList.length > 0 && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          E: {mustList.join(', ')}
                        </span>
                      )}

                      {mayList.length > 0 && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(45, 212, 191, 0.1)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          OU: {mayList.join(', ')}
                        </span>
                      )}

                      {notList.length > 0 && (
                        <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          NÃO: {notList.join(', ')}
                        </span>
                      )}

                      {rule.valueType && rule.valueType !== 'any' && (
                        <span style={{ fontSize: '0.72rem', background: 'var(--accent-glow)', color: 'var(--accent-teal)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          {rule.valueType === 'exact' ? `Valor: R$ ${rule.exactValue}` : (rule.valueType === 'range' ? `Faixa: R$ ${rule.minValue} a ${rule.maxValue}` : 'Condição de Valor')}
                        </span>
                      )}
                    </div>

                    {/* Accounting mapping summary */}
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {rule.ruleType === 'dynamic' ? (
                        <span>Conta Destino: <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{rule.targetAccount || '—'}</strong></span>
                      ) : (
                        <span>D: <strong style={{ fontFamily: 'var(--font-mono)' }}>{rule.debitAccount}</strong> | C: <strong style={{ fontFamily: 'var(--font-mono)' }}>{rule.creditAccount}</strong></span>
                      )}
                      <span>•</span>
                      <span>Histórico: <em style={{ color: 'var(--text-primary)' }}>"{rule.historicTextTemplate || rule.historicText || 'Padrão'}"</em></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleEditClick(rule)}
                      title="Editar Regra"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>

                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDuplicateRule(rule)}
                      title="Duplicar Regra"
                      style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      className="card-action-btn delete-btn"
                      onClick={() => handleDeleteRule(rule.id)}
                      title="Excluir Regra"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
