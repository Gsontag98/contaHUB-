import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  Search, 
  Trash2, 
  BookOpen, 
  Check, 
  AlertTriangle, 
  Plus, 
  Edit3, 
  FileText,
  X,
  Building2
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { parsePlanoContasFile } from '../../engine/planoContasEngine.js';

export default function PlanoContasPanel() {
  const { 
    planosList, 
    activePlanoId, 
    setPlanosList, 
    setActivePlanoId, 
    activeCompany,
    addToast 
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Manual account form states
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccClass, setNewAccClass] = useState('');
  const [newAccLevel, setNewAccLevel] = useState('5');
  const [newAccIsSynthetic, setNewAccIsSynthetic] = useState(false);

  // Active plan object
  const activePlan = useMemo(() => {
    return planosList.find(p => p.id === activePlanoId) || null;
  }, [planosList, activePlanoId]);

  const activeAccounts = activePlan?.accounts || [];

  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return activeAccounts;
    const q = searchTerm.toUpperCase().trim();
    return activeAccounts.filter(acc =>
      (acc.code && String(acc.code).toUpperCase().includes(q)) ||
      (acc.name && String(acc.name).toUpperCase().includes(q)) ||
      (acc.classification && String(acc.classification).toUpperCase().includes(q))
    );
  }, [activeAccounts, searchTerm]);

  // File Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const buffer = await file.arrayBuffer();
      const result = parsePlanoContasFile(buffer, file.name);

      const planName = result.companyName || activeCompany?.name || file.name.replace(/\.[^/.]+$/, "");
      const newPlan = {
        id: Date.now().toString(),
        name: planName,
        accounts: result.accounts
      };

      const updated = [...planosList, newPlan];
      setPlanosList(updated);
      setActivePlanoId(newPlan.id);
      addToast(`Plano de Contas "${planName}" importado com sucesso! (${result.accounts.length} contas)`, 'success');
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao processar arquivo.');
      addToast('Erro ao importar plano de contas.', 'error');
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  const handleNewPlan = () => {
    const name = window.prompt('Digite o nome do novo Plano de Contas:', activeCompany?.name || '');
    if (!name || !name.trim()) return;

    const newPlan = {
      id: Date.now().toString(),
      name: name.trim(),
      accounts: []
    };
    const updated = [...planosList, newPlan];
    setPlanosList(updated);
    setActivePlanoId(newPlan.id);
    addToast('Novo plano de contas criado!', 'success');
  };

  const handleRenamePlan = () => {
    if (!activePlan) return;
    const name = window.prompt('Novo nome para o Plano de Contas:', activePlan.name);
    if (!name || !name.trim()) return;

    const updated = planosList.map(p => p.id === activePlanoId ? { ...p, name: name.trim() } : p);
    setPlanosList(updated);
    addToast('Plano de contas renomeado.', 'success');
  };

  const handleDeletePlan = () => {
    if (!activePlan) return;
    if (!window.confirm(`Tem certeza que deseja excluir o plano "${activePlan.name}"?`)) return;

    const updated = planosList.filter(p => p.id !== activePlanoId);
    setPlanosList(updated);
    setActivePlanoId(updated.length > 0 ? updated[0].id : '');
    addToast('Plano de contas excluído.', 'info');
  };

  const handleAddSingleAccount = (e) => {
    e.preventDefault();
    if (!activePlan) {
      addToast('Crie ou selecione um plano contábil primeiro.', 'warning');
      return;
    }

    if (!newAccCode.trim() || !newAccName.trim()) {
      addToast('Código e Nome da conta são obrigatórios.', 'warning');
      return;
    }

    const codeExists = activeAccounts.some(acc => String(acc.code).trim() === newAccCode.trim());
    if (codeExists) {
      addToast(`A conta com código ${newAccCode.trim()} já existe neste plano.`, 'error');
      return;
    }

    const accountObj = {
      code: newAccCode.trim(),
      name: newAccName.trim(),
      classification: newAccClass.trim() || newAccCode.trim(),
      level: parseInt(newAccLevel) || 5,
      isSynthetic: newAccIsSynthetic
    };

    const updatedAccounts = [...activeAccounts, accountObj];
    const updatedPlanos = planosList.map(p => p.id === activePlanoId ? { ...p, accounts: updatedAccounts } : p);
    setPlanosList(updatedPlanos);

    setNewAccCode('');
    setNewAccName('');
    setNewAccClass('');
    setNewAccLevel('5');
    setNewAccIsSynthetic(false);
    addToast(`Conta ${accountObj.code} - ${accountObj.name} cadastrada com sucesso!`, 'success');
  };

  const handleDeleteSingleAccount = (code) => {
    if (!activePlan) return;
    const updatedAccounts = activeAccounts.filter(acc => acc.code !== code);
    const updatedPlanos = planosList.map(p => p.id === activePlanoId ? { ...p, accounts: updatedAccounts } : p);
    setPlanosList(updatedPlanos);
    addToast(`Conta ${code} removida.`, 'info');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.3rem' }}>
              <BookOpen size={24} color="var(--accent-cyan)" />
              Plano de Contas Contábil
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
              Gerencie os planos de contas contábeis por empresa para alimentar as regras De-Para e a exportação do Sistema Domínio.
            </p>
          </div>

          {activeCompany && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
              <Building2 size={16} color="var(--accent-cyan)" />
              <span>Empresa ativa: <strong style={{ color: 'var(--text-primary)' }}>{activeCompany.name}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Plan Selection & Upload | Accounts List */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
        {/* Left Column: Plan selector, upload, manual creation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Plan Selector Card */}
          <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
            <div className="form-group">
              <label className="form-label">
                Plano Contábil Ativo:
              </label>
              <select
                className="form-input"
                value={activePlanoId}
                onChange={(e) => setActivePlanoId(e.target.value)}
              >
                {planosList.length === 0 ? (
                  <option value="">-- Nenhum Plano Cadastrado --</option>
                ) : (
                  planosList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.accounts?.length || 0} contas)</option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleNewPlan} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Plus size={13} /> Novo
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleRenamePlan} disabled={!activePlanoId} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Edit3 size={13} /> Renomear
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeletePlan} disabled={!activePlanoId} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Trash2 size={13} /> Excluir
              </button>
            </div>

            {activePlan && (
              <div style={{ marginTop: '16px', padding: '10px 14px', background: 'var(--accent-glow)', border: '1px solid var(--accent-teal)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} />
                <div>
                  <strong>Ativo: {activePlan.name}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85 }}>{activeAccounts.length} contas contábeis carregadas</span>
                </div>
              </div>
            )}
          </div>

          {/* Import Spreadsheet Card */}
          <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', fontWeight: 600 }}>Importar Planilha do Plano</h3>
            <label className="dropzone-card" style={{ padding: '20px 16px', minHeight: 'auto', textAlign: 'center', cursor: 'pointer', borderRadius: '10px', background: 'var(--bg-card)' }}>
              <Upload size={28} color="var(--accent-teal)" style={{ margin: '0 auto 8px auto' }} />
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', display: 'block' }}>
                Upload (.xlsx, .xls, .csv)
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                Suporta XLS com patch automático Domínio
              </span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} disabled={loading} />
            </label>

            {loading && <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', textAlign: 'center', marginTop: '10px' }}>Processando plano contábil...</p>}
            {errorMsg && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--color-danger)' }}>
                {errorMsg}
              </div>
            )}
          </div>

          {/* Manual Account Card */}
          {activePlan && (
            <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 12px 0', fontWeight: 600 }}>Adicionar Conta Manualmente</h3>
              <form onSubmit={handleAddSingleAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Código (1586)"
                      value={newAccCode}
                      onChange={(e) => setNewAccCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nome da Conta"
                      value={newAccName}
                      onChange={(e) => setNewAccName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Classificação (1.1.1.01.001)"
                      value={newAccClass}
                      onChange={(e) => setNewAccClass(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="Grau"
                      min="1"
                      max="10"
                      value={newAccLevel}
                      onChange={(e) => setNewAccLevel(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="chk-synthetic"
                    checked={newAccIsSynthetic}
                    onChange={(e) => setNewAccIsSynthetic(e.target.checked)}
                  />
                  <label htmlFor="chk-synthetic" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    É conta Sintética (Grupo)
                  </label>
                </div>

                <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '4px' }}>
                  <Plus size={14} /> Adicionar Conta
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Accounts List */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--accent-teal)" />
              Lista de Contas Contábeis ({filteredAccounts.length})
            </h3>
            {activePlan && (
              <span style={{ fontSize: '0.78rem', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: '16px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                Plano: <strong style={{ color: 'var(--accent-cyan)' }}>{activePlan.name}</strong>
              </span>
            )}
          </div>

          {/* Search Input */}
          <div className="panel-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-input panel-search-input"
              placeholder="Pesquisar contas por código, nome ou classificação..."
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

          {/* Table */}
          <div style={{ maxHeight: '560px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table className="classic-data-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Classificação</th>
                  <th style={{ width: '80px' }}>Código</th>
                  <th style={{ width: '90px' }}>Tipo</th>
                  <th>Nome da Conta Contábil</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Excluir</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      Nenhuma conta cadastrada ou encontrada. Faça upload de um arquivo ao lado ou crie uma conta manualmente.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map(acc => (
                    <tr key={acc.code} style={{ fontWeight: acc.isSynthetic ? 700 : 400 }}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                        {acc.classification || '-'}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {acc.code}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: acc.isSynthetic ? 'var(--bg-elevated)' : 'var(--accent-glow)', color: acc.isSynthetic ? 'var(--text-muted)' : 'var(--accent-cyan)' }}>
                          {acc.isSynthetic ? 'Sintética' : 'Analítica'}
                        </span>
                      </td>
                      <td style={{ paddingLeft: `${(acc.level || 1) * 6}px` }}>
                        {acc.name}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="card-action-btn delete-btn"
                          onClick={() => handleDeleteSingleAccount(acc.code)}
                          title="Remover Conta"
                          style={{ margin: '0 auto' }}
                        >
                          <Trash2 size={13} />
                        </button>
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
