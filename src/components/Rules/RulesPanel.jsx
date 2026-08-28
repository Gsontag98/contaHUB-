import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Download, 
  UploadCloud, 
  Search, 
  Edit2, 
  Check, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight, 
  X, 
  Layers, 
  HelpCircle, 
  RotateCcw, 
  Tag, 
  DollarSign, 
  FileText, 
  Copy, 
  CheckCircle2, 
  Filter,
  Landmark,
  Zap,
  Fuel,
  Users,
  TrendingUp,
  SlidersHorizontal,
  Play,
  Lightbulb,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  exportRulesAsJson, 
  importRulesFromJson, 
  simulateRule,
  evaluateRule
} from '../../engine/rulesEngine.js';
import { 
  RULE_CATEGORIES, 
  PREDEFINED_RULE_TEMPLATES 
} from '../../engine/ruleTemplates.js';

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

  // Navigation tab: 'my_rules' | 'builder' | 'templates'
  const [activeTab, setActiveTab] = useState('my_rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const formRef = useRef(null);

  // Active accounts from active plan
  const activePlan = useMemo(() => {
    return planosList.find(p => p.id === activePlanoId) || null;
  }, [planosList, activePlanoId]);

  const planoContas = activePlan?.accounts || [];

  // Default empty form state
  const initialFormState = {
    name: '',
    mustContainAllInput: '', // AND
    mayContainAnyInput: '',  // OR
    mustNotContainInput: '', // NOT
    valueType: 'any',        // 'any' | 'exact' | 'range' | 'greater' | 'less'
    exactValue: '',
    minValue: '',
    maxValue: '',
    signalCondition: 'any',  // 'any' | 'debit_only' | 'credit_only'
    ruleType: 'dynamic',     // 'dynamic' | 'fixed'
    targetAccount: '',
    debitAccount: '',
    creditAccount: '',
    historicCode: '10',
    historicTextTemplate: ''
  };

  const [formState, setFormState] = useState(initialFormState);

  // Autocomplete state
  const [activeInput, setActiveInput] = useState(null); // 'debit' | 'credit' | 'target'
  const [autoSearch, setAutoSearch] = useState('');

  // Sandbox / Free Text Simulator State
  const [sandboxText, setSandboxText] = useState('TARIFA MENSAL CONTA CORRENTE ITAU EMPRESAS');
  const [sandboxValue, setSandboxValue] = useState('-49.90');

  // Convert formState into rule object
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

  // Real-Time Simulator against current loaded bank transactions
  const simulationResult = useMemo(() => {
    if (!transactions || transactions.length === 0) return { count: 0, matches: [], sample: null };
    if (!formState.mustContainAllInput.trim() && !formState.mayContainAnyInput.trim()) {
      return { count: 0, matches: [], sample: null };
    }
    return simulateRule(currentRuleObj, transactions, '1001');
  }, [currentRuleObj, transactions]);

  // Sandbox Live Free-Text Evaluation
  const sandboxEvaluation = useMemo(() => {
    if (!sandboxText.trim()) return null;
    const numVal = parseFloat(sandboxValue) || 0;
    const mockTx = {
      description: sandboxText,
      value: numVal,
      amount: Math.abs(numVal),
      isDebit: numVal < 0,
      document: 'DOC123',
      date: new Date().toISOString().split('T')[0]
    };
    return evaluateRule(currentRuleObj, mockTx, '1001');
  }, [currentRuleObj, sandboxText, sandboxValue]);

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

  const handleSaveRule = (e) => {
    e.preventDefault();

    if (!formState.mustContainAllInput.trim() && !formState.mayContainAnyInput.trim()) {
      addToast('Informe ao menos um termo de busca (E ou OU) para a regra.', 'warning');
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

  // Load a predefined template into the form builder
  const handleUseTemplate = (tpl) => {
    setEditingRuleId(null);
    setFormState({
      name: tpl.name,
      mustContainAllInput: (tpl.mustContainAll || []).join(', '),
      mayContainAnyInput: (tpl.mayContainAny || []).join(', '),
      mustNotContainInput: (tpl.mustNotContain || []).join(', '),
      valueType: tpl.valueType || 'any',
      exactValue: '',
      minValue: '',
      maxValue: '',
      signalCondition: tpl.signalCondition || 'any',
      ruleType: tpl.ruleType || 'dynamic',
      targetAccount: tpl.targetAccount || '',
      debitAccount: '',
      creditAccount: '',
      historicCode: tpl.historicCode || '10',
      historicTextTemplate: tpl.historicTextTemplate || ''
    });
    setActiveTab('builder');
    addToast(`📋 Modelo "${tpl.name}" carregado no criador guiado!`, 'info');
  };

  // Quick 1-click install template directly into rules
  const handleQuickInstallTemplate = (tpl) => {
    const newRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: tpl.name,
      mustContainAll: tpl.mustContainAll || [],
      mayContainAny: tpl.mayContainAny || [],
      mustNotContain: tpl.mustNotContain || [],
      pattern: (tpl.mustContainAll || []).join(','),
      orPattern: (tpl.mayContainAny || []).join(','),
      notPattern: (tpl.mustNotContain || []).join(','),
      valueType: tpl.valueType || 'any',
      exactValue: null,
      minValue: null,
      maxValue: null,
      signalCondition: tpl.signalCondition || 'any',
      ruleType: tpl.ruleType || 'dynamic',
      targetAccount: tpl.targetAccount || '',
      debitAccount: '',
      creditAccount: '',
      historicCode: tpl.historicCode || '10',
      historicTextTemplate: tpl.historicTextTemplate || '',
      historicText: tpl.historicTextTemplate || '',
      createdAt: new Date().toISOString()
    };

    addDeParaRule(newRule);
    addToast(`⚡ Modelo "${tpl.name}" adicionado com sucesso às suas regras!`, 'success');
  };

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

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return PREDEFINED_RULE_TEMPLATES.filter(tpl => {
      if (selectedCategory !== 'all' && tpl.category !== selectedCategory) return false;
      return true;
    });
  }, [selectedCategory]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Top Hero Banner */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-cyan)', padding: '12px', borderRadius: '12px' }}>
            <Sparkles size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>Regras De-Para Contábeis</h2>
              <span className="badge badge-accent" style={{ fontWeight: 800 }}>
                {deParaRules.length} {deParaRules.length === 1 ? 'Regra Ativa' : 'Regras Ativas'}
              </span>
            </div>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Configure a inteligência contábil para preencher contas de Débito, Crédito e Históricos do Sistema Domínio automaticamente.
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

      {/* 3 Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid var(--border-subtle)', paddingBottom: '2px' }}>
        <button
          onClick={() => setActiveTab('my_rules')}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
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
          <Layers size={17} />
          <span>1. Minhas Regras ({deParaRules.length})</span>
        </button>

        <button
          onClick={() => {
            if (!editingRuleId) resetForm();
            setActiveTab('builder');
          }}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
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
          <SlidersHorizontal size={17} />
          <span>2. Criador Guiado & Simulador</span>
          {editingRuleId && (
            <span style={{ fontSize: '0.68rem', background: 'var(--color-warning)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
              EDITANDO
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          style={{
            padding: '10px 18px',
            fontSize: '0.92rem',
            fontWeight: 800,
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeTab === 'templates' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'templates' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            marginBottom: '-2px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          <BookOpen size={17} />
          <span>3. Biblioteca de Modelos Prontos ({PREDEFINED_RULE_TEMPLATES.length})</span>
          <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>
            1-CLIQUE
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MINHAS REGRAS */}
      {/* ========================================================================= */}
      {activeTab === 'my_rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', width: '320px' }}>
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

            <div style={{ display: 'flex', gap: '10px' }}>
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

              <button 
                className="btn btn-secondary"
                onClick={() => setActiveTab('templates')}
              >
                <BookOpen size={16} />
                <span>Explorar Biblioteca de Modelos</span>
              </button>
            </div>
          </div>

          {filteredRules.length === 0 ? (
            <div className="card glass-card" style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '50%', color: 'var(--accent-cyan)' }}>
                <Sparkles size={36} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Nenhuma regra cadastrada ainda</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '500px', margin: 0, lineHeight: '1.5' }}>
                Crie regras inteligentes para que o contaHUB identifique automaticamente tarifas bancárias, combustíveis, impostos e salários direto do extrato!
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button className="btn btn-primary" onClick={() => { resetForm(); setActiveTab('builder'); }}>
                  <Plus size={16} /> Criar Minha Primeira Regra
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('templates')}>
                  <BookOpen size={16} /> Ver Modelos Prontos
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '70%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                          {rule.name || rule.pattern || 'Regra Sem Nome'}
                        </strong>
                        <span className="badge badge-subtle" style={{ fontSize: '0.72rem' }}>
                          {rule.ruleType === 'dynamic' ? 'Regra Dinâmica' : 'Regra Fixa'}
                        </span>
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
                        title="Editar Regra no Construtor Guiado"
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
      {/* TAB 2: CRIADOR GUIADO & SIMULADOR */}
      {/* ========================================================================= */}
      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.4fr) minmax(340px, 1fr)', gap: '24px', alignItems: 'start' }}>
          
          {/* FORM BUILDER (LEFT) */}
          <div ref={formRef} className="card" style={{ border: editingRuleId ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={20} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  {editingRuleId ? '✏️ Editando Regra De-Para' : '🪄 Construtor Guiado Passo a Passo'}
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
                <label className="form-label" style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                  Nome de Identificação da Regra
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Tarifas Mensais Itaú, Posto de Combustível..."
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* PASSO 1: TERMOS & OPERADORES */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  <Tag size={16} />
                  <span>Passo 1: O que o sistema deve procurar? (E, OU, NÃO)</span>
                </div>

                {/* 1.1 E (AND) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Contém TODAS as palavras (Operador E / AND)
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Separe por vírgula</span>
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: TARIFA, ITAU (todas obrigatórias)"
                    value={formState.mustContainAllInput}
                    onChange={(e) => setFormState(prev => ({ ...prev, mustContainAllInput: e.target.value }))}
                  />
                </div>

                {/* 1.2 OU (OR) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      🔵 Contém QUALQUER uma destas (Operador OU / OR)
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Opcional</span>
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
                    <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X size={14} /> NÃO PODE Conter (Operador NÃO / NOT - Exceções)
                    </label>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Bloqueia se encontrar</span>
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

              {/* PASSO 2: CONDIÇÕES DE VALOR & SINAL */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-teal)' }}>
                  <DollarSign size={16} />
                  <span>Passo 2: Condições de Valor Financeiro & Sinal</span>
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

                {/* Value inputs */}
                {formState.valueType === 'exact' && (
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Valor Exato (R$)</label>
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
                        placeholder="Ex: 100.00"
                        value={formState.maxValue}
                        onChange={(e) => setFormState(prev => ({ ...prev, maxValue: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PASSO 3: CONTAS CONTÁBEIS */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-petroleum)' }}>
                    <BookOpen size={16} />
                    <span>Passo 3: Para qual conta contábil vai?</span>
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

              {/* PASSO 4: HISTÓRICO COM TAGS */}
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                  <FileText size={16} />
                  <span>Passo 4: Como o histórico contábil será montado?</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>Código Histórico</label>
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
                      <label className="form-label" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>
                        Template do Histórico Complementar
                      </label>
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
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>Inserir Variáveis:</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[HISTORICO]')} style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                    + [HISTORICO]
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[FORNECEDOR]')} style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                    + [FORNECEDOR]
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[DOC]')} style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                    + [DOC]
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[DATA]')} style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                    + [DATA]
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => insertTag('[VALOR]')} style={{ fontSize: '0.74rem', padding: '3px 8px' }}>
                    + [VALOR]
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('my_rules')}>
                  Voltar para a Lista
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>{editingRuleId ? 'Salvar Alterações da Regra' : 'Cadastrar Regra De-Para'}</span>
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
                  value={sandboxText}
                  onChange={(e) => setSandboxText(e.target.value)}
                  style={{ fontSize: '0.82rem' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Valor (ex: -49.90)"
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
                    <strong style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '180px' }}>
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
                <li>Use <strong>E</strong> para termos fixos do banco (ex: <code>TARIFA, ITAU</code>).</li>
                <li>Use <strong>NÃO</strong> para evitar que estornos virem despesa (ex: <code>ESTORNO</code>).</li>
                <li>Use a tag <code>[FORNECEDOR]</code> para colocar o nome identificado automaticamente no histórico.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BIBLIOTECA DE MODELOS PRONTOS */}
      {/* ========================================================================= */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {RULE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`btn btn-sm ${selectedCategory === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.82rem', padding: '6px 14px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {filteredTemplates.map(tpl => (
              <div
                key={tpl.id}
                className="card glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  padding: '18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {tpl.name}
                    </h4>
                    <span className="badge badge-subtle" style={{ fontSize: '0.68rem' }}>
                      {tpl.category.toUpperCase()}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {tpl.description}
                  </p>

                  {/* Logic Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                    {tpl.mustContainAll && tpl.mustContainAll.length > 0 && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        E: {tpl.mustContainAll.join(', ')}
                      </span>
                    )}

                    {tpl.mayContainAny && tpl.mayContainAny.length > 0 && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(45, 212, 191, 0.12)', color: 'var(--accent-cyan)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        OU: {tpl.mayContainAny.slice(0, 4).join(', ')}{tpl.mayContainAny.length > 4 ? '...' : ''}
                      </span>
                    )}

                    {tpl.mustNotContain && tpl.mustNotContain.length > 0 && (
                      <span style={{ fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-danger)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        NÃO: {tpl.mustNotContain.join(', ')}
                      </span>
                    )}

                    {tpl.signalCondition && tpl.signalCondition !== 'any' && (
                      <span style={{ fontSize: '0.7rem', background: 'var(--accent-glow)', color: 'var(--accent-teal)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        {tpl.signalCondition === 'debit_only' ? 'Saídas (-)' : 'Entradas (+)'}
                      </span>
                    )}
                  </div>

                  {/* Suggested Account & History */}
                  <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '6px', fontSize: '0.76rem', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Conta Sugerida: </span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>{tpl.targetAccount}</strong> — {tpl.suggestedAccountName}
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Histórico: </span>
                      <em>"{tpl.historicTextTemplate}"</em>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleQuickInstallTemplate(tpl)}
                    style={{ flex: 1, fontSize: '0.78rem' }}
                  >
                    <Plus size={14} />
                    <span>Adicionar em 1-Clique</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleUseTemplate(tpl)}
                    title="Editar no Criador Guiado antes de salvar"
                    style={{ fontSize: '0.78rem' }}
                  >
                    <Edit2 size={13} />
                    <span>Personalizar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
