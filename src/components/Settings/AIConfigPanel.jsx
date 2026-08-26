import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Key, 
  Sparkles, 
  Check, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Plus, 
  Trash2, 
  Lock, 
  Activity, 
  RefreshCw, 
  BarChart3 
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  loadOcrSettings, 
  saveOcrSettings, 
  getActiveApiKey, 
  listGeminiModels, 
  reconcileWithAI,
  testGeminiConnection 
} from '../../engine/ai.js';

export default function AIConfigPanel() {
  const { reconciliationResult, setReconciliationResult, addToast } = useAppStore();

  const [settings, setSettings] = useState(() => loadOcrSettings());
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);
  const [limitInput, setLimitInput] = useState(settings.monthlyLimit || 500);
  const [modelInput, setModelInput] = useState(settings.modelName || 'gemini-2.0-flash');
  const [availableModels, setAvailableModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // Load models on mount
  useEffect(() => {
    const fetchModels = async () => {
      const activeKey = getActiveApiKey();
      if (activeKey) {
        setLoadingModels(true);
        const models = await listGeminiModels(activeKey);
        setAvailableModels(models);
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  const handleActiveKeyChange = async (keyId) => {
    const updated = { ...settings, activeKeyId: keyId };
    setSettings(updated);
    saveOcrSettings(updated);
    addToast('Chave de API ativa alterada!', 'info');

    const keyObj = updated.apiKeys.find(k => k.id === keyId);
    if (keyObj) {
      setLoadingModels(true);
      const models = await listGeminiModels(keyObj.key);
      setAvailableModels(models);
      setLoadingModels(false);
    }
  };

  const handleTestConnection = async (keyObj = null) => {
    const activeKey = keyObj?.key || getActiveApiKey();
    const keyId = keyObj?.id || settings.activeKeyId || 'active';

    if (!activeKey) {
      addToast('Nenhuma chave ativa encontrada para testar.', 'warning');
      return;
    }

    setTestingKeyId(keyId);
    setTestResult(null);

    try {
      const result = await testGeminiConnection(activeKey, modelInput);
      setTestResult({ keyId, ...result });

      if (result.success) {
        addToast(`🟢 ${result.message}`, 'success');
      } else {
        addToast(`🔴 ${result.message}`, 'error');
      }
    } catch (err) {
      setTestResult({
        keyId,
        success: false,
        message: `Erro: ${err.message}`
      });
      addToast(`🔴 Erro ao testar: ${err.message}`, 'error');
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleAddKey = (e) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      addToast('Preencha o identificador e a chave de API.', 'warning');
      return;
    }

    const newKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: newKeyName.trim(),
      key: newKeyValue.trim()
    };

    const isFirst = settings.apiKeys.length === 0;
    const updatedKeys = [...settings.apiKeys, newKey];
    const updated = {
      ...settings,
      apiKeys: updatedKeys,
      activeKeyId: isFirst ? newKey.id : settings.activeKeyId
    };

    setSettings(updated);
    saveOcrSettings(updated);
    setNewKeyName('');
    setNewKeyValue('');
    setShowAddKey(false);
    addToast('Nova chave cadastrada com sucesso!', 'success');

    if (isFirst) {
      listGeminiModels(newKey.key).then(setAvailableModels);
    }
  };

  const handleDeleteKey = (id) => {
    const updatedKeys = settings.apiKeys.filter(k => k.id !== id);
    let newActiveId = settings.activeKeyId;
    if (settings.activeKeyId === id) {
      newActiveId = updatedKeys.length > 0 ? updatedKeys[0].id : '';
    }

    const updated = {
      ...settings,
      apiKeys: updatedKeys,
      activeKeyId: newActiveId
    };

    setSettings(updated);
    saveOcrSettings(updated);
    addToast('Chave removida.', 'info');
  };

  const handleSavePreferences = (e) => {
    e.preventDefault();
    const updated = {
      ...settings,
      monthlyLimit: parseInt(limitInput) || 500,
      modelName: modelInput
    };
    setSettings(updated);
    saveOcrSettings(updated);
    addToast('Configurações de IA salvas com sucesso!', 'success');
  };

  const handleRunAI = async () => {
    if (!reconciliationResult) {
      addToast('Execute uma conciliação padrão antes de rodar a IA.', 'warning');
      return;
    }

    const activeKey = getActiveApiKey();
    if (!activeKey) {
      addToast('Cadastre ao menos uma Chave de API Gemini antes de executar.', 'warning');
      return;
    }

    setIsRunningAI(true);
    try {
      const aiMatches = await reconcileWithAI(
        reconciliationResult.missingInBank,
        reconciliationResult.missingInSupplier
      );

      if (!aiMatches || aiMatches.length === 0) {
        addToast('A IA analisou os itens pendentes e não encontrou novas correspondências com alta certeza.', 'info');
        return;
      }

      let count = 0;
      const nextMatches = [...reconciliationResult.matches];
      let nextMissingBank = [...reconciliationResult.missingInBank];
      let nextMissingSupplier = [...reconciliationResult.missingInSupplier];

      aiMatches.forEach(ai => {
        const b = nextMissingBank.find(item => item.id === ai.bankId);
        const s = nextMissingSupplier.find(item => item.id === ai.supplierId);

        if (b && s) {
          nextMatches.push({
            id: `ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            pass: 8,
            passName: 'Conciliação Semântica por IA',
            bankItems: [b],
            supplierItems: [s],
            ledgerItems: [s],
            confidence: ai.confidence || 85,
            badgeClass: 'badge-ai',
            notes: ai.justificativa || 'Correspondência semântica identificada pela IA Gemini.',
            isAI: true
          });

          nextMissingBank = nextMissingBank.filter(item => item.id !== ai.bankId);
          nextMissingSupplier = nextMissingSupplier.filter(item => item.id !== ai.supplierId);
          count++;
        }
      });

      const totalBank = reconciliationResult.totalBankCount;
      const totalSupp = reconciliationResult.totalSupplierCount;
      const matchedCount = nextMatches.reduce((acc, m) => acc + m.bankItems.length + m.supplierItems.length, 0);
      const rate = (totalBank + totalSupp) > 0 ? (matchedCount / (totalBank + totalSupp)) * 100 : 100;

      setReconciliationResult({
        ...reconciliationResult,
        matches: nextMatches,
        missingInBank: nextMissingBank,
        missingInSupplier: nextMissingSupplier,
        reconciledRate: rate
      });

      addToast(`🎉 IA Gemini concluiu a auditoria: ${count} novos vínculos encontrados!`, 'success');
    } catch (err) {
      addToast(`❌ Falha na execução da IA: ${err.message}`, 'error');
    } finally {
      setIsRunningAI(false);
    }
  };

  const usagePercent = Math.min(100, Math.round(((settings.usageCount || 0) / (settings.monthlyLimit || 500)) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '12px' }}>
              <Bot size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Inteligência Artificial — Google Gemini API</h2>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Gerenciamento de chaves de API, cotas mensais e modelos neurais para OCR e Conciliação Semântica.
              </span>
            </div>
          </div>
        </div>

        {/* Usage Progress Capsule */}
        <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
              <BarChart3 size={15} color="var(--accent-cyan)" />
              Consumo Mensal de Requisições ({settings.lastResetMonth})
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: usagePercent > 80 ? 'var(--color-warning)' : 'var(--accent-cyan)' }}>
              {settings.usageCount || 0} / {settings.monthlyLimit || 500} ({usagePercent}%)
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${usagePercent}%`, height: '100%', background: usagePercent > 80 ? 'var(--color-warning)' : 'linear-gradient(90deg, #007A78, #2DD4BF)', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* API Keys List */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label className="form-label" style={{ margin: 0 }}>
              Chaves de API Cadastradas ({settings.apiKeys.length})
            </label>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm" 
              onClick={() => setShowAddKey(!showAddKey)}
            >
              <Plus size={14} />
              <span>{showAddKey ? 'Cancelar' : 'Adicionar Nova Chave'}</span>
            </button>
          </div>

          {showAddKey && (
            <form onSubmit={handleAddKey} style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-focus)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>
                Cadastrar Chave do Google AI Studio
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nome (Ex: Chave Pessoal 1)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Chave API (AIzaSy...)"
                  value={newKeyValue}
                  onChange={(e) => setNewKeyValue(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddKey(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Check size={14} /> Salvar Chave
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {settings.apiKeys.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhuma chave cadastrada. Adicione uma chave obtida gratuitamente no <strong>Google AI Studio</strong> para habilitar OCR e reconciliação semântica.
              </div>
            ) : (
              settings.apiKeys.map(k => {
                const isActive = k.id === settings.activeKeyId;
                return (
                  <div
                    key={k.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: isActive ? 'var(--accent-glow)' : 'var(--bg-card)',
                      border: `1.5px solid ${isActive ? 'var(--accent-teal)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="radio"
                        name="activeKeyRadio"
                        checked={isActive}
                        onChange={() => handleActiveKeyChange(k.id)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{k.name}</strong>
                          {isActive && (
                            <span style={{ fontSize: '0.68rem', background: 'var(--accent-petroleum)', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              EM USO (ATIVA)
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {k.key.length > 14 ? `${k.key.substring(0, 8)}••••••••${k.key.substring(k.key.length - 4)}` : '••••••••'}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTestConnection(k)}
                        disabled={testingKeyId === k.id}
                        style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Testar Conexão com esta chave"
                      >
                        {testingKeyId === k.id ? (
                          <>
                            <Loader2 className="spin" size={13} />
                            <span>Testando...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={13} color="var(--accent-cyan)" />
                            <span>Testar Conexão</span>
                          </>
                        )}
                      </button>

                      <button
                        className="card-action-btn delete-btn"
                        onClick={() => handleDeleteKey(k.id)}
                        title="Excluir Chave"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Global Model & Quota Settings */}
        <form onSubmit={handleSavePreferences} style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Modelo Neural Gemini
              </label>
              <select
                className="form-input"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                disabled={loadingModels}
              >
                {loadingModels ? (
                  <option value="">Carregando modelos do Google...</option>
                ) : availableModels.length > 0 ? (
                  availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))
                ) : (
                  <>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Mais Rápido / Recomendado)</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Padrão Estável)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Mais Preciso)</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">
                Limite Mensal de Requisições
              </label>
              <input
                type="number"
                className="form-input"
                min="10"
                max="10000"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">
              <Check size={16} /> Salvar Preferências
            </button>
          </div>
        </form>
      </div>

      {/* Semantic AI Reconciliation Action */}
      {reconciliationResult && (reconciliationResult.missingInBank.length > 0 || reconciliationResult.missingInSupplier.length > 0) && (
        <div className="card" style={{ border: '1px solid rgba(45, 212, 191, 0.4)', background: 'var(--accent-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Zap size={18} /> Executar Auditoria Semântica Residual com IA
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', margin: 0 }}>
                Cruzar {reconciliationResult.missingInBank.length} itens do banco e {reconciliationResult.missingInSupplier.length} do fornecedor com análise semântica
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleRunAI}
              disabled={isRunningAI}
            >
              {isRunningAI ? (
                <><Loader2 className="spin" size={16} /> Processando IA...</>
              ) : (
                <><Sparkles size={16} /> Rodar Gemini AI</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
