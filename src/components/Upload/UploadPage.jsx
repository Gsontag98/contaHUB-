import React from 'react';
import FileDropzone from './FileDropzone.jsx';
import PasteDataModal from './PasteDataModal.jsx';
import ColumnMappingModal from './ColumnMappingModal.jsx';
import DiagnosticModal from './DiagnosticModal.jsx';
import useAppStore from '../../store/useAppStore.js';
import { reconcile } from '../../engine/reconciler.js';
import { Play, Loader2, Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Layers } from 'lucide-react';

export default function UploadPage() {
  const {
    bankFile,
    supplierFile,
    setReconciliationResult,
    setIsReconciling,
    setActivePage,
    isReconciling,
    setReconciliationProgress,
    reconciliationProgress,
    activeCompany,
    addToast
  } = useAppStore();

  const handleReconcile = async () => {
    if (!bankFile || !supplierFile) return;
    setIsReconciling(true);

    try {
      const result = await reconcile(
        bankFile.items,
        supplierFile.items,
        {},
        (progress) => setReconciliationProgress(progress)
      );

      setReconciliationResult(result);
      setActivePage('graph');
      addToast(`🎉 Conciliação finalizada: ${result.matches.length} vínculos encontrados (${result.reconciledRate.toFixed(1)}%)!`, 'success');
    } catch (err) {
      addToast(`❌ Erro no processamento da conciliação: ${err.message}`, 'error');
    } finally {
      setIsReconciling(false);
    }
  };

  const isReady = Boolean(bankFile && supplierFile && (bankFile.items?.length || 0) > 0 && (supplierFile.items?.length || 0) > 0);

  return (
    <div className="upload-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Hero Header */}
      <div className="upload-hero" style={{ textAlign: 'center', marginTop: '10px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
          Conciliação Contábil Automatizada
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '650px', margin: '0 auto', lineHeight: '1.5' }}>
          Importe o Extrato Bancário e o Razão de Fornecedores do Sistema Domínio para cruzar lançamentos, valores e notas fiscais com rigor em centavos.
        </p>
      </div>

      {/* Dropzones Grid */}
      <div className="dropzone-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px' }}>
        <FileDropzone type="bank" />
        <FileDropzone type="supplier" />
      </div>

      {/* Execution Call to Action Section */}
      <div className="reconcile-action-section">
        {isReady ? (
          <div className="reconcile-ready-card glass-card">
            <div className="ready-header">
              <div className="ready-status-badge">
                <CheckCircle2 size={16} color="var(--color-success)" />
                <span>Arquivos Prontos para Cruzamento</span>
              </div>
              <div className="ready-stats">
                <span>Banco: <strong>{bankFile.items?.length || 0}</strong></span>
                <span className="dot-sep">•</span>
                <span>Fornecedor: <strong>{supplierFile.items?.length || 0}</strong></span>
              </div>
            </div>

            <button
              className="btn btn-primary btn-execute-reconcile"
              onClick={handleReconcile}
              disabled={isReconciling}
            >
              {isReconciling ? (
                <>
                  <Loader2 className="spin" size={22} />
                  <span>
                    Processando Passo {reconciliationProgress?.pass || 1}/7 ({reconciliationProgress?.passName || 'Analisando'})...
                  </span>
                </>
              ) : (
                <>
                  <Play size={22} fill="currentColor" />
                  <span>Executar Conciliação Especialista contaHUB</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="guarantee-badges-row">
              <div className="guarantee-badge">
                <ShieldCheck size={16} color="var(--color-success)" />
                <span>Rigor Matemático em Centavos</span>
              </div>
              <div className="guarantee-badge">
                <CheckCircle2 size={16} color="var(--accent-cyan)" />
                <span>Detecção de Matriz/Filial e Juros</span>
              </div>
              <div className="guarantee-badge">
                <Sparkles size={16} color="var(--color-warning)" />
                <span>Soma Combinatória N:1 Integrada</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="reconcile-pending-card">
            <div className="pending-hint">
              <Layers size={20} color="var(--accent-teal)" />
              <span>Importe ambos os arquivos acima (ou cole dados com Ctrl+V) para liberar a conciliação automática</span>
            </div>
          </div>
        )}
      </div>

      <PasteDataModal />
      <ColumnMappingModal />
      <DiagnosticModal />
    </div>
  );
}
