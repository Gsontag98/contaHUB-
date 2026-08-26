import { useRef, useState } from 'react';
import { Landmark, Building2, Upload, FileText, Clipboard, SlidersHorizontal, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { parseFile } from '../../engine/parser.js';
import { autoDetect, normalizeItems } from '../../engine/mapper.js';

export default function FileDropzone({ type = 'bank' }) {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    bankFile,
    supplierFile,
    setBankFile,
    setSupplierFile,
    setPasteModalType,
    setMappingModalType,
    setDiagnosticModalFile,
    addToast
  } = useAppStore();

  const isBank = type === 'bank';
  const fileData = isBank ? bankFile : supplierFile;
  const setFile = isBank ? setBankFile : setSupplierFile;

  const handleProcessFile = async (file) => {
    if (!file) return;
    setIsLoading(true);

    const logs = [];
    const diag = {
      log: (msg) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`)
    };

    try {
      const parsed = await parseFile(file, diag);
      if (!parsed.headers || parsed.headers.length === 0) {
        throw new Error('Nenhuma coluna ou linha válida foi detectada no arquivo.');
      }

      const mapping = autoDetect(parsed.headers);
      const items = normalizeItems(parsed.headers, parsed.rows, mapping, type);

      setFile({
        name: file.name,
        size: file.size,
        headers: parsed.headers,
        rows: parsed.rows,
        mapping,
        items,
        logs,
        rawFile: file
      });

      addToast(`✅ ${isBank ? 'Extrato Bancário' : 'Razão de Fornecedores'} carregado: ${items.length} lançamentos detectados!`, 'success');
    } catch (err) {
      addToast(`❌ Erro ao ler arquivo: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    addToast(`${isBank ? 'Banco' : 'Fornecedor'} removido.`, 'info');
  };

  return (
    <div
      className={`dropzone-card type-${type} ${isDragOver ? 'drag-over' : ''} ${fileData ? 'has-file' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !fileData && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.ofx,.csv,.txt"
        style={{ display: 'none' }}
      />

      <div className="dropzone-icon-box">
        {isBank ? <Landmark size={32} /> : <Building2 size={32} />}
      </div>

      <h3>{isBank ? '1. Extrato Bancário / Razão Banco' : '2. Razão de Fornecedores / Contas a Pagar'}</h3>
      <p>
        {isBank
          ? 'Arraste o extrato bancário (OFX, XLS, XLSX, CSV) ou Razão Contábil do Banco'
          : 'Arraste o Razão de Fornecedores gerado no Sistema Domínio ou ERP'}
      </p>

      {fileData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          <div className="file-info-badge">
            <CheckCircle2 size={16} color="var(--color-success)" />
            <span style={{ fontWeight: 700 }}>{fileData.name}</span>
            <span style={{ color: 'var(--text-muted)' }}>({fileData.items?.length || 0} lançamentos)</span>
          </div>

          <div className="dropzone-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setMappingModalType(type)}
              title="Mapeamento de Colunas"
            >
              <SlidersHorizontal size={14} /> Colunas
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setDiagnosticModalFile(fileData)}
              title="Diagnóstico e Logs de Leitura"
            >
              <Activity size={14} /> Diagnóstico
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleRemove}
              title="Remover Arquivo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-primary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            <Upload size={14} /> {isLoading ? 'Processando...' : 'Selecionar Arquivo'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setPasteModalType(type)}>
            <Clipboard size={14} /> Colar Planilha (Ctrl+V)
          </button>
        </div>
      )}
    </div>
  );
}
