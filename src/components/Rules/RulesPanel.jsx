import React, { useState, useMemo, useRef } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  UploadCloud, 
  Search, 
  Edit2, 
  Check, 
  BookOpen, 
  X, 
  Layers, 
  RotateCcw, 
  Tag, 
  DollarSign, 
  FileText, 
  Copy, 
  CheckCircle2, 
  SlidersHorizontal,
  Play,
  Lightbulb,
  Code2,
  Eraser,
  Wand2,
  ChevronRight,
  Database
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  exportRulesAsJson, 
  importRulesFromJson, 
  simulateRule,
  evaluateRule,
  tokenizeDescription,
  cleanJunkNumbers,
  generateLogicalFormula
} from '../../engine/rulesEngine.js';

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

  // Navigation tab: 'my_rules' | 'builder'
  const [activeTab, setActiveTab] = useState('my_rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const formRef = useRef(null);

  // Active accounts from active plan
  const activePlan = useMemo(() => {
    return planosList.find(p => p.id === activePlanoId) || null;
  }, [planosList, activePlanoId]);

  const planoContas = activePlan?.accounts || [];

  // Sandbox / Free Text / Sample Description for Tokenizer
  const [sampleDescription, setSampleDescription] = useState('DEBITO ARRECADACAO 00394460005887 DARFC0385 - DARFC0385');
  const [customWordInput, setCustomWordInput] = useState('');

  // Default empty form state
  const initialFormState = {
    name: '',
    mustContainAll: [], // AND list
    mayContainAny: [],  // OR list
    mustNotContain: [], // NOT list
    matchMode: 'contains', // 'contains' | 'startsWith' | 'endsWith' | 'exact'
    valueType: 'any',        // 'any' | 'exact' | 'range' | 'greater' | 'less'
    exactValue: '',
    minValue: '',
    maxValue: '',
    signalCondition: 'any',  // 'any' | 'debit_only' | 'credit_only'
    ruleType: 'dynamic',     // 'dynamic' | 'fixed'
    targetAccount: '',
    debitAccount: '',
    creditAccount: '',
    historicCode: '',
    historicTextTemplate: ''
  };

  const [formState, setFormState] = useState(initialFormState);

  // Autocomplete state
  const [activeInput, setActiveInput] = useState(null); // 'debit' | 'credit' | 'target'
  const [autoSearch, setAutoSearch] = useState('');

  // Sandbox / Free Text Simulator State
  const [sandboxValue, setSandboxValue] = useState('-150.50');

  // Tokens extracted from sampleDescription
  const extractedTokens = useMemo(() => {
    return tokenizeDescription(sampleDescription);
  }, [sampleDescription]);

  // Convert formState into rule object
  const currentRuleObj = useMemo(() => {
    return {
      id: editingRuleId || 'temp_rule',
      name: formState.name.trim() || (formState.mustContainAll.length > 0 ? formState.mustContainAll.join(' + ') : 'Nova Regra'),
      mustContainAll: formState.mustContainAll,
      mayContainAny: formState.mayContainAny,
      mustNotContain: formState.mustNotContain,
      pattern: formState.mustContainAll.join(','),
      orPattern: formState.mayContainAny.join(','),
      notPattern: formState.mustNotContain.join(','),
      matchMode: formState.matchMode,
      valueType: formState.valueType,
      exactValue: formState.exactValue ? parseFloat(formState.exactValue) : null,
      minValue: formState.minValue ? parseFloat(formState.minValue) : null,
      maxValue: formState.maxValue ? parseFloat(formState.maxValue) : null,
      signalCondition: formState.signalCondition,
      ruleType: formState.ruleType,
      targetAccount: formState.targetAccount.trim(),
      debitAccount: formState.debitAccount.trim(),
      creditAccount: formState.creditAccount.trim(),
      historicCode: formState.historicCode.trim() || '',
      historicTextTemplate: formState.historicTextTemplate.trim()
    };
  }, [formState, editingRuleId]);

  // Logical Formula Preview
  const logicalFormula = useMemo(() => {
    return generateLogicalFormula(currentRuleObj);
  }, [currentRuleObj]);

  // Real-Time Simulator against current loaded bank transactions
  const simulationResult = useMemo(() => {
    if (!transactions || transactions.length === 0) return { count: 0, matches: [], sample: null };
    if (formState.mustContainAll.length === 0 && formState.mayContainAny.length === 0) {
      return { count: 0, matches: [], sample: null };
    }
    return simulateRule(currentRuleObj, transactions, '1001', activeCompany || {});
  }, [currentRuleObj, transactions, activeCompany]);

  // Sandbox Live Free-Text Evaluation
  const sandboxEvaluation = useMemo(() => {
    if (!sampleDescription.trim()) return null;
    const numVal = parseFloat(sandboxValue) || 0;
    const mockTx = {
      description: sampleDescription,
      value: numVal,
      amount: Math.abs(numVal),
      isDebit: numVal < 0,
      document: 'DARF0385',
      date: new Date().toISOString().split('T')[0],
      supplierName: 'RECEITA FEDERAL DO BRASIL',
      bankName: 'ITAU'
    };
    return evaluateRule(currentRuleObj, mockTx, '1001', activeCompany || {});
  }, [currentRuleObj, sampleDescription, sandboxValue, activeCompany]);

  const resetForm = () => {
    setEditingRuleId(null);
    setFormState(initialFormState);
    setSampleDescription('DEBITO ARRECADACAO 00394460005887 DARFC0385 - DARFC0385');
  };

  const handleEditClick = (rule) => {
    setEditingRuleId(rule.id);
    const must = (rule.mustContainAll && Array.isArray(rule.mustContainAll))
      ? rule.mustContainAll
      : (rule.pattern ? rule.pattern.split(',').map(s => s.trim()).filter(Boolean) : []);
    const may = (rule.mayContainAny && Array.isArray(rule.mayContainAny))
      ? rule.mayContainAny
      : (rule.orPattern ? rule.orPattern.split(',').map(s => s.trim()).filter(Boolean) : []);
    const not = (rule.mustNotContain && Array.isArray(rule.mustNotContain))
      ? rule.mustNotContain
      : (rule.notPattern ? rule.notPattern.split(',').map(s => s.trim()).filter(Boolean) : []);

    setFormState({
      name: rule.name || '',
      mustContainAll: must,
      mayContainAny: may,
      mustNotContain: not,
      matchMode: rule.matchMode || 'contains',
      valueType: rule.valueType || 'any',
      exactValue: rule.exactValue !== null && rule.exactValue !== undefined ? String(rule.exactValue) : '',
      minValue: rule.minValue !== null && rule.minValue !== undefined ? String(rule.minValue) : '',
      maxValue: rule.maxValue !== null && rule.maxValue !== undefined ? String(rule.maxValue) : '',
      signalCondition: rule.signalCondition || rule.valueCondition || 'any',
      ruleType: rule.ruleType || 'dynamic',
      targetAccount: rule.targetAccount || '',
      debitAccount: rule.debitAccount || '',
      creditAccount: rule.creditAccount || '',
      historicCode: rule.historicCode || '',
      historicTextTemplate: rule.historicTextTemplate || rule.historicText || '[HISTORICO]'
    });

    if (must.length > 0) {
      setSampleDescription(must.join(' '));
    }
    setActiveTab('builder');
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

  // Add term to specific group
  const addTermToGroup = (term, group) => {
    if (!term) return;
    const clean = term.trim().toUpperCase();
    if (!clean) return;

    setFormState(prev => {
      const currentList = prev[group] || [];
      if (currentList.includes(clean)) return prev;
      return {
        ...prev,
        [group]: [...currentList, clean]
      };
    });
  };

  // Remove term from group
  const removeTermFromGroup = (term, group) => {
    setFormState(prev => ({
      ...prev,
      [group]: (prev[group] || []).filter(t => t !== term)
    }));
  };

  const handleSaveRule = (e) => {
    e.preventDefault();

    if (formState.mustContainAll.length === 0 && formState.mayContainAny.length === 0) {
      addToast('Adicione ao menos um termo de busca (E ou OU) para a regra.', 'warning');
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
    setActiveTab('my_rules');
  };

  const handleDeleteRule = (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta regra?')) return;
    deleteDeParaRule(id);
    addToast('Regra excluída.', 'info');
  };

  // Insert tag/word into history template
  const insertHistoryToken = (token) => {
    setFormState(prev => ({
      ...prev,
      historicTextTemplate: prev.historicTextTemplate ? `${prev.historicTextTemplate} ${token}` : token
    }));
  };

  // Clean junk numbers from history template or sample description
  const handleCleanJunk = () => {
    const cleanedDesc = cleanJunkNumbers(sampleDescription);
    setSampleDescription(cleanedDesc);
    const cleanedHist = cleanJunkNumbers(formState.historicTextTemplate);
    setFormState(prev => ({ ...prev, historicTextTemplate: cleanedHist || '[HISTORICO]' }));
    addToast('🧹 Códigos numéricos e ruídos longos removidos!', 'info');
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

  // Filter rules list
  const filteredRules = useMemo(() => {
    if (!searchTerm.trim()) return deParaRules;
    const q = searchTerm.toLowerCase().trim();
    return deParaRules.filter(r => {
      const nameMatch = (r.name || '').toLowerCase().includes(q);
      const patternMatch = (r.pattern || '').toLowerCase().includes(q) ||
        (r.mustContainAll || []).some(t => t.toLowerCase().includes(q)) ||
        (r.mayContainAny || []).some(t => t.toLowerCase().includes(q));
      const accMatch = (r.targetAccount || '').includes(q) || 
        (r.debitAccount || '').includes(q) || 
        (r.creditAccount || '').includes(q);
      const histMatch = (r.historicTextTemplate || r.historicText || '').toLowerCase().includes(q);
      return nameMatch || patternMatch || accMatch || histMatch;
    });
  }, [deParaRules, searchTerm]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1240px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Top Hero Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: '12px' }}>
            <Sparkles size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Montador Visual de Regras De-Para</h2>
              <span className="badge badge-accent" style={{ fontWeight: 800 }}>
                {deParaRules.length} {deParaRules.length === 1 ? 'Regra Ativa' : 'Regras Ativas'}
              </span>
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Construa regras contábeis fatiando termos do extrato em 1-clique (<strong>E</strong>, <strong>OU</strong>, <strong>NÃO</strong>), variáveis inteligentes e integração direta com o Sistema Domínio.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      {/* 2 Clean Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('my_rules')}
          style={{
            padding: '10px 22px',
            fontSize: '0.94rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'my_rules' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'my_rules' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <Layers size={18} />
          <span>1. Minhas Regras ({deParaRules.length})</span>
        </button>

        <button
          onClick={() => {
            if (!editingRuleId) resetForm();
            setActiveTab('builder');
          }}
          style={{
            padding: '10px 22px',
            fontSize: '0.94rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'builder' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'builder' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <SlidersHorizontal size={18} />
          <span>2. Montador Visual & Simulador</span>
          {editingRuleId && (
            <span style={{ fontSize: '0.68rem', background: 'var(--color-warning)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              EDITANDO
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MINHAS REGRAS */}
      {/* ========================================================================= */}
      {activeTab === 'my_rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '360px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar regras por nome, termo, conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setActiveTab('builder');
                }}
              >
                <Plus size={16} />
                <span>Criar Nova Regra</span>
              </button>
            </div>
          </div>

          {filteredRules.length === 0 ? (
            <div className="card glass-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '50%', color: 'var(--accent-cyan)' }}>
                <Sparkles size={36} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nenhuma regra cadastrada</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '500px', margin: 0, lineHeight: '1.5' }}>
                Crie regras inteligentes para que o contaHUB identifique automaticamente tarifas bancárias, combustíveis, impostos e salários direto do extrato!
              </p>
              <div style={{ marginTop: '6px' }}>
                <button className="btn btn-primary" onClick={() => { resetForm(); setActiveTab('builder'); }}>
                  <Plus size={16} /> Abrir Montador Visual
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRules.map(rule => {
                const mustList = (rule.mustContainAll && Array.isArray(rule.mustContainAll)) ? rule.mustContainAll : (rule.pattern ? rule.pattern.split(',') : []);
                const mayList = (rule.mayContainAny && Array.isArray(rule.mayContainAny)) ? rule.mayContainAny : (rule.orPattern ? rule.orPattern.split(',') : []);
                const notList = (rule.mustNotContain && Array.isArray(rule.mustNotContain)) ? rule.mustNotContain : (rule.notPattern ? rule.notPattern.split(',') : []);

                return (
                  <div
                    key={rule.id}
                    className="card"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-md)',
                      flexWrap: 'wrap',
                      gap: '16px',
                      borderLeft: '4px solid var(--accent-cyan)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '75%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                          {rule.name || rule.pattern || 'Regra Sem Nome'}
                        </strong>
                        <span className="badge badge-subtle" style={{ fontSize: '0.72rem' }}>
                          {rule.ruleType === 'dynamic' ? 'Regra Dinâmica' : 'Regra Fixa'}
                        </span>
                        {rule.matchMode && rule.matchMode !== 'contains' && (
                          <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-cyan)' }}>
                            Modo: {rule.matchMode === 'startsWith' ? 'Iniciando com' : (rule.matchMode === 'endsWith' ? 'Terminando com' : 'Exato')}
                          </span>
                        )}
                        {rule.signalCondition && rule.signalCondition !== 'any' && (
                          <span className="badge" style={{ fontSize: '0.7rem', background: 'rgba(45, 212, 191, 0.12)', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {rule.signalCondition === 'debit_only' ? 'Apenas Saídas (-)' : 'Apenas Entradas (+)'}
                          </span>
                        )}
                      </div>

                      {/* Logic Badges */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {mustList.length > 0 && (
                          <span style={{ fontSize: '0.74rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={12} /> E: {mustList.join(', ')}
                          </span>
                        )}

                        {mayList.length > 0 && (
                          <span style={{ fontSize: '0.74rem', background: 'rgba(45, 212, 191, 0.12)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            OU: {mayList.join(', ')}
                          </span>
                        )}

                        {notList.length > 0 && (
                          <span style={{ fontSize: '0.74rem', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <X size={12} /> NÃO: {notList.join(', ')}
                          </span>
                        )}

                        {rule.valueType && rule.valueType !== 'any' && (
                          <span style={{ fontSize: '0.74rem', background: 'var(--accent-glow)', color: 'var(--accent-teal)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            {rule.valueType === 'exact' ? `Valor: R$ ${rule.exactValue}` : (rule.valueType === 'range' ? `Faixa: R$ ${rule.minValue} a ${rule.maxValue}` : 'Condição de Valor')}
                          </span>
                        )}
                      </div>

                      {/* Accounting mapping summary */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        title="Editar Regra no Montador Visual"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDuplicateRule(rule)}
                        title="Duplicar Regra"
                        style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        className="card-action-btn delete-btn"
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Excluir Regra"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTADOR VISUAL & SIMULADOR (INSPIRADO NO SISTEMA DOMÍNIO) */}
      {/* ========================================================================= */}
      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(520px, 1.45fr) minmax(360px, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* FORM BUILDER (LEFT) */}
          <div ref={formRef} className="card" style={{ border: editingRuleId ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wand2 size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {editingRuleId ? '✏️ Editando Regra De-Para' : 'Montagem da Regra Contábil'}
                </h3>
              </div>
              {editingRuleId && (
                <button className="btn btn-secondary btn-sm" onClick={resetForm} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                  <RotateCcw size={12} /> Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveRule} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Nome de Identificação */}
              <div>
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  Nome de Identificação da Regra:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: DARF Arrecadação 0385, Pagamento PIX Fornecedor..."
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* SEÇÃO 1: DICIONÁRIO / FATIADOR DE PALAVRAS DO EXTRATO (INSPIRAÇÃO SCREENSHOT 1) */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} />
                    <span>1. Dicionário de Termos do Extrato</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleCleanJunk}
                    style={{ fontSize: '0.72rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Remover códigos bancários e números longos"
                  >
                    <Eraser size={12} /> Limpar Ruídos Numéricos
                  </button>
                </div>

                {/* Sample input to extract words */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>
                    Texto do Lançamento de Exemplo para fatiar termos:
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={sampleDescription}
                    onChange={(e) => setSampleDescription(e.target.value)}
                    placeholder="Cole ou digite uma linha de extrato para extrair as palavras..."
                    style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                {/* Clickable Word Tokens */}
                <div>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Clique nos botões de cada palavra para adicionar à regra:
                  </span>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {/* Entire phrase option */}
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '0.74rem', padding: '4px 8px', color: 'var(--text-primary)', fontWeight: 700 }}>
                        [Completo: Toda a Frase]
                      </span>
                      <button type="button" onClick={() => addTermToGroup(sampleDescription, 'mustContainAll')} style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: 'none', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+E</button>
                      <button type="button" onClick={() => addTermToGroup(sampleDescription, 'mayContainAny')} style={{ background: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-cyan)', border: 'none', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+OU</button>
                    </div>

                    {/* Individual word tokens */}
                    {extractedTokens.map((token, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.76rem', padding: '4px 8px', color: 'var(--text-primary)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          {token}
                        </span>
                        <button type="button" onClick={() => addTermToGroup(token, 'mustContainAll')} title="Obrigatório (E)" style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)', border: 'none', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+E</button>
                        <button type="button" onClick={() => addTermToGroup(token, 'mayContainAny')} title="Alternativo (OU)" style={{ background: 'rgba(45, 212, 191, 0.2)', color: 'var(--accent-cyan)', border: 'none', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+OU</button>
                        <button type="button" onClick={() => addTermToGroup(token, 'mustNotContain')} title="Exceção (NÃO)" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--color-danger)', border: 'none', padding: '4px 6px', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>+NÃO</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Custom Word Input */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digitar outro termo manualmente..."
                    value={customWordInput}
                    onChange={(e) => setCustomWordInput(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTermToGroup(customWordInput, 'mustContainAll');
                        setCustomWordInput('');
                      }
                    }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addTermToGroup(customWordInput, 'mustContainAll'); setCustomWordInput(''); }} style={{ color: 'var(--color-success)', fontWeight: 700 }}>
                    + E
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addTermToGroup(customWordInput, 'mayContainAny'); setCustomWordInput(''); }} style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    + OU
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => { addTermToGroup(customWordInput, 'mustNotContain'); setCustomWordInput(''); }} style={{ color: 'var(--color-danger)', fontWeight: 700 }}>
                    + NÃO
                  </button>
                </div>

                {/* Active Terms Buckets (E, OU, NÃO) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', borderTop: '1px dashed var(--border-subtle)', paddingTop: '10px' }}>
                  
                  {/* Bucket E */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-success)', minWidth: '160px' }}>
                      🟢 Contém TODAS (E / AND):
                    </span>
                    {formState.mustContainAll.length === 0 ? (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>(Nenhum termo obrigatório)</span>
                    ) : (
                      formState.mustContainAll.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)' }}>
                          {t}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTermFromGroup(t, 'mustContainAll')} />
                        </span>
                      ))
                    )}
                  </div>

                  {/* Bucket OU */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-cyan)', minWidth: '160px' }}>
                      🔵 Contém QUALQUER (OU / OR):
                    </span>
                    {formState.mayContainAny.length === 0 ? (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>(Nenhum termo alternativo)</span>
                    ) : (
                      formState.mayContainAny.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(45, 212, 191, 0.15)', color: 'var(--accent-cyan)' }}>
                          {t}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTermFromGroup(t, 'mayContainAny')} />
                        </span>
                      ))
                    )}
                  </div>

                  {/* Bucket NÃO */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--color-danger)', minWidth: '160px' }}>
                      🔴 NÃO PODE Conter (NÃO / NOT):
                    </span>
                    {formState.mustNotContain.length === 0 ? (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>(Nenhuma exceção)</span>
                    ) : (
                      formState.mustNotContain.map((t, idx) => (
                        <span key={idx} className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger)' }}>
                          {t}
                          <X size={12} style={{ cursor: 'pointer' }} onClick={() => removeTermFromGroup(t, 'mustNotContain')} />
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Modo de Comparação & Fórmula Lógica Display */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>Modo de Comparação:</span>
                    <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" name="matchModeRadio" checked={formState.matchMode === 'contains'} onChange={() => setFormState(prev => ({ ...prev, matchMode: 'contains' }))} />
                      <span>Contendo (%termo%)</span>
                    </label>
                    <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" name="matchModeRadio" checked={formState.matchMode === 'startsWith'} onChange={() => setFormState(prev => ({ ...prev, matchMode: 'startsWith' }))} />
                      <span>Iniciando com (termo%)</span>
                    </label>
                    <label style={{ fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" name="matchModeRadio" checked={formState.matchMode === 'endsWith'} onChange={() => setFormState(prev => ({ ...prev, matchMode: 'endsWith' }))} />
                      <span>Terminando com (%termo)</span>
                    </label>
                  </div>

                  {/* Logical Formula Box (SQL Style) */}
                  <div style={{ background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', overflowX: 'auto', lineHeight: '1.4' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginBottom: '2px', fontWeight: 700 }}>FÓRMULA LÓGICA GERADA (ESTILO DOMÍNIO):</div>
                    {logicalFormula}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: CONDIÇÕES DE VALOR & SINAL */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                  <DollarSign size={16} />
                  <span>2. Condições de Valor Financeiro & Sinal</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
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
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Sinal do Lançamento
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

                {formState.valueType === 'exact' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Valor Exato (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      placeholder="Ex: 150.50"
                      value={formState.exactValue}
                      onChange={(e) => setFormState(prev => ({ ...prev, exactValue: e.target.value }))}
                      required
                    />
                  </div>
                )}

                {formState.valueType === 'range' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Valor Mínimo (R$)</label>
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
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Valor Máximo (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="Ex: 500.00"
                        value={formState.maxValue}
                        onChange={(e) => setFormState(prev => ({ ...prev, maxValue: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 3: CONTAS CONTÁBEIS */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-petroleum)' }}>
                    <BookOpen size={16} />
                    <span>3. Contas Contábeis (Plano de Contas)</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="ruleTypeRadio"
                        checked={formState.ruleType === 'dynamic'}
                        onChange={() => setFormState(prev => ({ ...prev, ruleType: 'dynamic' }))}
                      />
                      <span>Dinâmica (Recomendada)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="ruleTypeRadio"
                        checked={formState.ruleType === 'fixed'}
                        onChange={() => setFormState(prev => ({ ...prev, ruleType: 'fixed' }))}
                      />
                      <span>Fixa (D e C)</span>
                    </label>
                  </div>
                </div>

                {formState.ruleType === 'dynamic' ? (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Conta Contábil de Destino (Despesa / Fornecedor / Receita)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Código ou Nome (ex: 2105 - Impostos Federais)"
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
                              style={{ padding: '6px 10px', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--border-subtle)' }}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Conta Débito</label>
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
                      <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Conta Crédito</label>
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

              {/* SEÇÃO 4: HISTÓRICO CONTÁBIL PERSONALIZADO & VARIÁVEIS (INSPIRAÇÃO SCREENSHOT 2) */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  <FileText size={16} />
                  <span>4. Histórico Contábil (Personalizado)</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Cód Histórico</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ex: 10, 450 (Opcional)"
                      value={formState.historicCode}
                      onChange={(e) => setFormState(prev => ({ ...prev, historicCode: e.target.value }))}
                      style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                      Editor do Histórico Complementar
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Clique nos trechos ou variáveis abaixo para montar..."
                      value={formState.historicTextTemplate}
                      onChange={(e) => setFormState(prev => ({ ...prev, historicTextTemplate: e.target.value }))}
                    />
                  </div>
                </div>

                {/* 4.1 Trechos de Palavras do Extrato */}
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Trechos do Histórico (Clique para inserir texto):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {extractedTokens.map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => insertHistoryToken(w)}
                        style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                      >
                        + {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4.2 Catálogo de Variáveis do Sistema */}
                <div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Variáveis Dinâmicas do Sistema:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[HISTORICO]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [HISTORICO]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[FORNECEDOR]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [FORNECEDOR]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[DOC]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [DOC]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[DATA]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [DATA]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[VALOR]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [VALOR]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[BANCO]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [BANCO]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[EMPRESA]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [EMPRESA]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[MES]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [MES]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[ANO]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [ANO]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[DIA]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [DIA]
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertHistoryToken('[MES_ANTERIOR]')} style={{ fontSize: '0.72rem', padding: '2px 7px' }}>
                      + [MES_ANTERIOR]
                    </button>
                  </div>
                </div>

                {/* 4.3 Live History Preview */}
                <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800 }}>PRÉ-VISUALIZAÇÃO DO HISTÓRICO RESULTANTE:</span>
                  <div style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    {sandboxEvaluation ? sandboxEvaluation.historicText : formState.historicTextTemplate}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('my_rules')}>
                  Voltar para a Lista
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>{editingRuleId ? 'Salvar Alterações da Regra' : 'Salvar Regra no Dicionário'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* DUAL LIVE SIMULATOR (RIGHT) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. FREE-TEXT SANDBOX TESTER */}
            <div className="card glass-card" style={{ border: sandboxEvaluation ? '1.5px solid var(--color-success)' : '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Play size={18} color={sandboxEvaluation ? 'var(--color-success)' : 'var(--accent-cyan)'} />
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0 }}>
                  🧪 Testador de Texto Livre
                </h4>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                Cole ou digite qualquer texto de extrato abaixo para ver se a sua regra ativará e como o lançamento será transformado:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Digite um texto de extrato para testar..."
                  value={sampleDescription}
                  onChange={(e) => setSampleDescription(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Valor (ex: -150.50)"
                    value={sandboxValue}
                    onChange={(e) => setSandboxValue(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700, color: parseFloat(sandboxValue) < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {parseFloat(sandboxValue) < 0 ? 'Débito / Saída (-)' : 'Crédito / Entrada (+)'}
                  </div>
                </div>
              </div>

              {/* Free Text Result */}
              {sandboxEvaluation ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--color-success)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-success)', fontWeight: 800, fontSize: '0.84rem' }}>
                    <CheckCircle2 size={16} />
                    <span>Regra Ativada com Sucesso!</span>
                  </div>

                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(16, 185, 129, 0.3)', paddingTop: '6px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Débito / Crédito:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                      {sandboxEvaluation.debitAccount || '—'} / {sandboxEvaluation.creditAccount || '—'}
                    </strong>
                  </div>

                  <div style={{ fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Histórico Resultante:</span>
                    <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '200px' }}>
                      {sandboxEvaluation.historicText}
                    </strong>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(239, 68, 68, 0.06)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-danger)', fontSize: '0.78rem', textAlign: 'center' }}>
                  A regra NÃO ativou para este texto ou valor. Verifique as palavras-chave (E, OU), exceções (NÃO) ou condições de valor.
                </div>
              )}
            </div>

            {/* 2. REAL TRANSACTIONS DIAGNOSTIC */}
            <div className="card glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Sparkles size={18} color="var(--accent-cyan)" />
                <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0 }}>
                  Diagnóstico com Extrato Atual
                </h4>
              </div>

              <div style={{ 
                padding: '12px', 
                borderRadius: '8px', 
                background: simulationResult.count > 0 ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)', 
                border: `1px solid ${simulationResult.count > 0 ? 'var(--color-success)' : 'var(--border-subtle)'}`,
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700 }}>Lançamentos Atendidos:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: simulationResult.count > 0 ? 'var(--color-success)' : 'var(--text-muted)' }}>
                    {simulationResult.count} {simulationResult.count === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {transactions.length === 0 
                    ? 'Importe um extrato bancário para testar em lote.' 
                    : `Testado contra ${transactions.length} lançamentos em memória.`}
                </span>
              </div>

              {simulationResult.sample && (
                <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.76rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>1º Exemplo Real:</span>
                  <div style={{ fontFamily: 'var(--font-mono)' }}>{simulationResult.sample.original.description}</div>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                    ➔ {simulationResult.sample.result.historicText}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Tips Box */}
            <div className="card" style={{ background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.86rem', fontWeight: 800 }}>
                <Lightbulb size={16} color="var(--color-warning)" />
                <span>Dicas Práticas para Contadores</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: '1.4' }}>
                <li>Clique em <code>+ E</code> para adicionar termos fixos do banco (ex: <code>DARFC0385</code>).</li>
                <li>Clique em <code>+ NÃO</code> para evitar que estornos virem despesa.</li>
                <li>Use o botão <strong>Limpar Ruídos Numéricos</strong> para retirar autenticações longas.</li>
                <li>Adicione <code>[MES]</code> e <code>[ANO]</code> para gerar históricos de competência contábil perfeitos.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
