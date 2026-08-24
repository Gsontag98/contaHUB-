import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  ArrowRight, 
  Edit3, 
  Trash2, 
  Search, 
  LogOut, 
  Moon, 
  Sun, 
  Shield, 
  X, 
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

// CNPJ live formatting mask helper
function formatCNPJ(value) {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export default function CompanySelector() {
  const { 
    companies, 
    currentUser, 
    logout, 
    setActiveCompany, 
    createCompany, 
    updateCompany, 
    deleteCompany, 
    theme, 
    setTheme, 
    addToast 
  } = useAppStore();

  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | 'delete' | null
  const [targetCompany, setTargetCompany] = useState(null);
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleOpenCreate = () => {
    setCompanyName('');
    setCompanyCnpj('');
    setTargetCompany(null);
    setModalMode('create');
  };

  const handleOpenEdit = (comp, e) => {
    e.stopPropagation();
    setTargetCompany(comp);
    setCompanyName(comp.name);
    setCompanyCnpj(comp.cnpj || '');
    setModalMode('edit');
  };

  const handleOpenDelete = (comp, e) => {
    e.stopPropagation();
    setTargetCompany(comp);
    setModalMode('delete');
  };

  const handleSaveCompany = (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      addToast('O nome da empresa é obrigatório.', 'error');
      return;
    }

    try {
      if (modalMode === 'create') {
        const created = createCompany(companyName.trim(), companyCnpj.trim());
        addToast(`Empresa "${created.name}" cadastrada com sucesso!`, 'success');
      } else if (modalMode === 'edit' && targetCompany) {
        updateCompany(targetCompany.id, companyName.trim(), companyCnpj.trim());
        addToast(`Empresa "${companyName.trim()}" atualizada com sucesso!`, 'success');
      }
      setModalMode(null);
    } catch (err) {
      addToast(err.message || 'Erro ao salvar empresa.', 'error');
    }
  };

  const handleConfirmDelete = () => {
    if (!targetCompany) return;
    try {
      deleteCompany(targetCompany.id);
      addToast(`Empresa "${targetCompany.name}" excluída.`, 'info');
      setModalMode(null);
    } catch (err) {
      addToast('Erro ao excluir empresa.', 'error');
    }
  };

  const handleSelectCompany = (comp) => {
    setActiveCompany(comp);
    addToast(`Empresa ativa: ${comp.name}`, 'info');
  };

  const filteredCompanies = companies.filter(c => {
    const q = searchTerm.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(q);
    const cnpjMatch = (c.cnpj || '').replace(/\D/g, '').includes(q.replace(/\D/g, ''));
    return nameMatch || cnpjMatch;
  });

  return (
    <div className="company-selector-container">
      {/* Top Navbar */}
      <header className="company-selector-header">
        <div className="company-brand-area">
          <img src="./logo_contahub.svg" alt="contaHUB" className="company-brand-logo" />
          <div>
            <h2 className="company-brand-title">contaHUB</h2>
            <span className="company-brand-subtitle">Gestão Multi-Empresa</span>
          </div>
        </div>

        <div className="company-header-actions">
          {/* User profile capsule */}
          <div className="user-profile-badge">
            <Shield size={15} color="var(--accent-cyan)" />
            <span className="user-name">{currentUser?.name || 'Administrador'}</span>
            <span className="user-role">({currentUser?.role === 'admin' ? 'Admin' : 'Usuário'})</span>
          </div>

          {/* Theme toggle */}
          <button 
            className="btn-icon" 
            onClick={toggleTheme} 
            title={theme === 'dark' ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Logout button */}
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={logout} 
            title="Encerrar Sessão"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LogOut size={15} />
            <span>Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="company-main-content">
        <div className="company-banner-text">
          <h1 className="company-main-title">Selecione uma Empresa</h1>
          <p className="company-main-desc">
            Cada empresa possui isolamento contábil completo: plano de contas, histórico de conciliações e regras De-Para personalizadas.
          </p>
        </div>

        {/* Toolbar: Search and Create */}
        <div className="company-toolbar">
          <div className="company-search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="company-search-input"
              placeholder="Buscar por razão social ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={18} />
            <span>Cadastrar Empresa</span>
          </button>
        </div>

        {/* Company Cards Grid */}
        <div className="company-grid">
          {/* Add New Company Card Button */}
          <div className="company-card company-card-add" onClick={handleOpenCreate}>
            <div className="add-icon-circle">
              <Plus size={28} />
            </div>
            <h3 className="add-card-title">Nova Empresa</h3>
            <p className="add-card-desc">Clique para cadastrar uma nova empresa e configurar plano de contas</p>
          </div>

          {/* Existing Companies */}
          {filteredCompanies.map((comp) => (
            <div 
              key={comp.id} 
              className="company-card glass-card"
              onClick={() => handleSelectCompany(comp)}
            >
              <div className="card-top-row">
                <div className="company-icon-box">
                  <Building2 size={24} color="var(--accent-cyan)" />
                </div>
                <div className="card-actions-row">
                  <button 
                    className="card-action-btn edit-btn" 
                    onClick={(e) => handleOpenEdit(comp, e)}
                    title="Editar Empresa"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button 
                    className="card-action-btn delete-btn" 
                    onClick={(e) => handleOpenDelete(comp, e)}
                    title="Excluir Empresa"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="company-card-body">
                <h3 className="company-card-name" title={comp.name}>{comp.name}</h3>
                <p className="company-card-cnpj">
                  <strong>CNPJ:</strong> {comp.cnpj ? formatCNPJ(comp.cnpj) : 'Não informado'}
                </p>
              </div>

              <div className="company-card-footer">
                <span className="access-panel-text">
                  Acessar Painel
                  <ArrowRight size={16} className="arrow-icon" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* CREATE / EDIT MODAL */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--accent-cyan)" />
                {modalMode === 'create' ? 'Cadastrar Nova Empresa' : 'Editar Empresa'}
              </h3>
              <button 
                onClick={() => setModalMode(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCompany}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Razão Social / Nome da Empresa *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Comercial ABC Ltda"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CNPJ (Obrigatório para Domínio)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="00.000.000/0000-00"
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(formatCNPJ(e.target.value))}
                    maxLength={18}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    O CNPJ é utilizado no cabeçalho do arquivo oficial TXT (|0000|) para importação no Domínio Sistemas.
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <CheckCircle2 size={16} />
                  <span>{modalMode === 'create' ? 'Cadastrar Empresa' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {modalMode === 'delete' && targetCompany && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)' }}>
                <AlertTriangle size={20} />
                Excluir Empresa
              </h3>
              <button 
                onClick={() => setModalMode(null)} 
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', margin: 0 }}>
                Tem certeza que deseja excluir a empresa <strong>{targetCompany.name}</strong>?
              </p>
              <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', fontSize: '0.82rem', color: 'var(--color-danger)' }}>
                <strong>Atenção:</strong> Todos os dados vinculados a esta empresa (plano de contas, regras De-Para e lançamentos) serão excluídos permanentemente do banco local.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalMode(null)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete}>
                <Trash2 size={16} />
                <span>Sim, Excluir Empresa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
