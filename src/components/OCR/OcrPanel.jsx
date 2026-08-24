import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Pause, 
  RotateCcw,
  FastForward,
  Building2, 
  Landmark, 
  Download,
  Trash2,
  FileSpreadsheet,
  Lock,
  Key
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';
import { 
  getActiveApiKey, 
  getPreferredModel, 
  incrementOcrUsage, 
  loadOcrSettings 
} from '../../engine/ai.js';
import { PDFDocument } from 'pdf-lib';

// Robust JSON repair algorithm for truncated LLM responses
const repairTruncatedJson = (rawText) => {
  rawText = rawText.trim();
  try {
    return JSON.parse(rawText);
  } catch (e) {
    console.warn("JSON truncado detectado, tentando reparar...", e);
  }

  let cleanText = rawText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  let inString = false;
  let isEscaped = false;
  const stack = [];

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (char === '\\') {
      isEscaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}' || char === ']') {
        const top = stack[stack.length - 1];
        if ((char === '}' && top === '{') || (char === ']' && top === '[')) {
          stack.pop();
        }
      }
    }
  }

  if (inString) cleanText += '"';
  cleanText = cleanText.trim();
  while (cleanText.endsWith(',') || cleanText.endsWith(':')) {
    cleanText = cleanText.slice(0, -1).trim();
  }

  const stackCopy = [...stack];
  while (stackCopy.length > 0) {
    const openChar = stackCopy.pop();
    if (openChar === '{') cleanText += '}';
    else if (openChar === '[') cleanText += ']';
  }

  try {
    return JSON.parse(cleanText);
  } catch (parseErr) {
    let lastCloseBraceIdx = rawText.lastIndexOf('}');
    while (lastCloseBraceIdx > 0) {
      let subStr = rawText.substring(0, lastCloseBraceIdx + 1).trim();
      if (subStr.endsWith(',')) subStr = subStr.substring(0, subStr.length - 1).trim();
      try {
        let candidate = subStr;
        if (!candidate.endsWith(']')) candidate += ']';
        candidate = candidate.replace(/,\s*\]$/, ']');
        return JSON.parse(candidate);
      } catch {
        lastCloseBraceIdx = rawText.lastIndexOf('}', lastCloseBraceIdx - 1);
      }
    }
    throw new Error("Não foi possível recuperar objetos JSON válidos do texto retornado.");
  }
};

// PDF Splitter in browser via pdf-lib
const splitPdfInBrowser = async (base64Data) => {
  const binaryString = window.atob(base64Data);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const pdfDoc = await PDFDocument.load(bytes);
  const pageCount = pdfDoc.getPageCount();
  const pageBase64s = [];
  
  for (let i = 0; i < pageCount; i++) {
    const subDoc = await PDFDocument.create();
    const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
    subDoc.addPage(copiedPage);
    const pdfBytes = await subDoc.save();
    
    let binary = '';
    const bytesLen = pdfBytes.byteLength;
    const CHUNK_SIZE = 0x8000;
    for (let j = 0; j < bytesLen; j += CHUNK_SIZE) {
      binary += String.fromCharCode.apply(null, pdfBytes.subarray(j, j + CHUNK_SIZE));
    }
    pageBase64s.push(window.btoa(binary));
  }
  return pageBase64s;
};

// PDF Merger for Batch Processing
const mergePagesToPdf = async (pagesBase64List) => {
  if (!pagesBase64List || pagesBase64List.length === 0) return '';
  if (pagesBase64List.length === 1) return pagesBase64List[0];
  
  const mergedDoc = await PDFDocument.create();
  for (const pageBase64 of pagesBase64List) {
    const binaryString = window.atob(pageBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const doc = await PDFDocument.load(bytes);
    const [copiedPage] = await mergedDoc.copyPages(doc, [0]);
    mergedDoc.addPage(copiedPage);
  }
  const pdfBytes = await mergedDoc.save();
  
  let binary = '';
  const bytesLen = pdfBytes.byteLength;
  const CHUNK_SIZE = 0x8000;
  for (let j = 0; j < bytesLen; j += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(null, pdfBytes.subarray(j, j + CHUNK_SIZE));
  }
  return window.btoa(binary);
};

const backgroundDelay = (ms) => new Promise(r => setTimeout(r, ms));

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export default function OcrPanel() {
  const { setBankFromOcr, setSupplierFromOcr, setActivePage, addToast } = useAppStore();

  const [fileName, setFileName] = useState('');
  const [pages, setPages] = useState([]);
  const [mimeType, setMimeType] = useState('');
  const [currentPageIdx, _setCurrentPageIdx] = useState(0);
  const [ocrMode, setOcrMode] = useState('batch'); // 'batch' (4 págs) | 'individual'
  const [batchSize, setBatchSize] = useState(() => parseInt(localStorage.getItem('contahub_ocr_batch_size') || '4'));

  const [extractedData, setExtractedData] = useState([]);
  const [processingState, _setProcessingState] = useState('idle'); // 'idle' | 'processing' | 'paused_by_user' | 'paused_on_error' | 'completed'
  const [statusMessage, setStatusMessage] = useState('');
  const [ocrError, setOcrError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  const processingStateRef = useRef('idle');
  const loopActiveRef = useRef(false);

  const setProcessingState = (val) => {
    _setProcessingState(val);
    processingStateRef.current = val;
  };

  const setCurrentPageIdx = (val) => {
    _setCurrentPageIdx(val);
  };

  useEffect(() => {
    return () => {
      processingStateRef.current = 'idle';
    };
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const activeKey = getActiveApiKey();
    if (!activeKey) {
      addToast('Configure sua Chave de API Gemini nas Configurações de IA antes de usar o OCR.', 'warning');
      setActivePage('settings');
      return;
    }

    setFileName(file.name);
    setExtractedData([]);
    setOcrError(null);
    setLoading(true);
    setProcessingState('idle');
    setStatusMessage('Lendo arquivo e preparando páginas...');

    try {
      const dataUrl = await fileToBase64(file);
      const isPdf = file.type === 'application/pdf' || file.type === 'application/x-pdf' || /\.pdf$/i.test(file.name);
      const fileMimeType = isPdf ? 'application/pdf' : (file.type || 'image/png');
      const base64Data = dataUrl.split(',')[1];

      let pagesToProcess = [];
      if (fileMimeType === 'application/pdf') {
        setStatusMessage('Dividindo páginas do PDF no navegador...');
        try {
          pagesToProcess = await splitPdfInBrowser(base64Data);
        } catch (splitErr) {
          console.error("Erro ao dividir PDF:", splitErr);
          pagesToProcess = [base64Data];
        }
      } else {
        pagesToProcess = [base64Data];
      }

      setPages(pagesToProcess);
      setMimeType(fileMimeType);
      
      // Auto-start processing queue
      await startOcrQueue(pagesToProcess, fileMimeType, 0);
    } catch (err) {
      console.error(err);
      setOcrError(err.message || 'Erro durante a inicialização do OCR.');
      setProcessingState('paused_on_error');
      setLoading(false);
      addToast('Falha na inicialização do OCR.', 'error');
    }
  };

  const startOcrQueue = async (pagesList, fileMimeType, startFromIdx = 0) => {
    if (loopActiveRef.current) return;
    loopActiveRef.current = true;

    try {
      const activeKey = getActiveApiKey();
      if (!activeKey) {
        setOcrError('Nenhuma chave de API Gemini ativa encontrada.');
        setProcessingState('paused_on_error');
        setLoading(false);
        return;
      }

      setOcrError(null);
      setLoading(true);
      setProcessingState('processing');
      setCurrentPageIdx(startFromIdx);

      let idx = startFromIdx;
      const totalPages = pagesList.length;
      const model = getPreferredModel() || 'gemini-2.0-flash';

      while (idx < totalPages) {
        if (processingStateRef.current !== 'processing') break;

        setCurrentPageIdx(idx);
        const currentBatchSize = ocrMode === 'batch' ? batchSize : 1;
        const batchEnd = Math.min(idx + currentBatchSize, totalPages);
        const batchPages = pagesList.slice(idx, batchEnd);

        let currentPageBase64;
        if (ocrMode === 'batch' && fileMimeType === 'application/pdf') {
          setStatusMessage(`Agrupando lote de páginas ${idx + 1} a ${batchEnd} de ${totalPages}...`);
          try {
            currentPageBase64 = await mergePagesToPdf(batchPages);
          } catch {
            currentPageBase64 = pagesList[idx];
          }
        } else {
          currentPageBase64 = pagesList[idx];
        }

        const targetLabel = ocrMode === 'batch' ? `lote ${idx + 1} a ${batchEnd}` : `página ${idx + 1}`;
        setStatusMessage(`Analisando ${targetLabel} de ${totalPages} com IA Gemini...`);

        let responseData;
        let attempt = 0;
        const maxAttempts = 4;
        let pageSuccess = false;

        while (attempt < maxAttempts) {
          if (processingStateRef.current !== 'processing') break;

          try {
            const isGemini2 = model.includes('gemini-2.') || model.includes('gemini-2.5') || model.includes('gemini-3.');
            const genConfig = {
              responseMimeType: "application/json",
              max_output_tokens: 8192,
              temperature: 0.1
            };
            if (isGemini2) {
              genConfig.thinkingConfig = { thinkingBudget: 0 };
            }

            const promptText = `Você é um assistente contábil sênior especializado em leitura e extração de extratos bancários e financeiros brasileiros de qualquer layout (Conta Corrente, Poupança, Cartão, Aplicação Financeira, CDB, RDB, Fundos, Itaú, Bradesco, BB, Santander, Caixa, Inter, Nubank, C6, Sicredi, Sicoob, etc.).

Analise o documento fornecido (imagem ou página(s) de PDF) e extraia TODAS as movimentações financeiras da(s) tabela(s).

REGRAS OBRIGATÓRIAS DE EXTRAÇÃO:
1. COMPLETUDE TOTAL: Extraia ABSOLUTAMENTE TODAS as movimentações/linhas de transação. Não pule nenhuma linha de movimentação, não resuma e não agrupe.
2. EXTRATOS DE CONTA CORRENTE E POUPANÇA: Extraia lançamentos de Pix, TED, DOC, Boletos, Tarifas, Cheques, DARF, Impostos, etc.
3. EXTRATOS DE INVESTIMENTOS / APLICAÇÕES:
   - Resgates, Rendimentos creditados, Entradas: VALOR POSITIVO (+) (ex: 500.00).
   - Aplicações (novos aportes), Débitos, Impostos retidos (IRRF/IOF), Tarifas: VALOR NEGATIVO (-) (ex: -1000.00).
4. O QUE NÃO EXTRAIR: NUNCA inclua linhas de saldos estáticos ("SALDO ANTERIOR", "SALDO ATUAL", "SALDO FINAL", "POSIÇÃO EM DD/MM/AAAA", "TOTAL APLICADO", "RENTABILIDADE %").
5. DADOS DE CADA LANÇAMENTO:
   - Data: formato rigoroso DD/MM/YYYY.
   - Descrição: máximo de 60 caracteres, clara e sem ruídos.
   - Valor: número decimal com sinal correto.
6. FORMATO DE RETORNO (RIGOROSO):
   - Retorne ESTREITAMENTE um array JSON de arrays no formato: [["DD/MM/YYYY", "Descrição", valor_numerico], ...].
   - Exemplo: [["01/07/2026", "Pix - Recebido - CECILIA DA SILVA", 400.00], ["01/07/2026", "Pagamento Impostos DARF", -3061.49]]`;

            const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [
                        { inlineData: { mimeType: fileMimeType, data: currentPageBase64 } },
                        { text: promptText }
                      ]
                    }
                  ],
                  generationConfig: genConfig
                })
              }
            );

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              throw new Error(errData.error?.message || `Erro HTTP ${response.status} na API do Gemini`);
            }

            responseData = await response.json();
            pageSuccess = true;
            break;
          } catch (apiErr) {
            attempt++;
            const rawMsg = apiErr.message || '';
            const isRateLimit = rawMsg.includes('Quota exceeded') || rawMsg.includes('quota') || rawMsg.includes('429');
            const isHighDemand = rawMsg.includes('high demand') || rawMsg.includes('503') || rawMsg.includes('500') || rawMsg.includes('UNAVAILABLE');

            if ((isRateLimit || isHighDemand) && attempt < maxAttempts) {
              const waitSec = isRateLimit ? Math.min(60, 20 * attempt) : (attempt * 4);
              for (let s = waitSec; s > 0; s--) {
                if (processingStateRef.current !== 'processing') break;
                setCooldownTime(s);
                setStatusMessage(`⏳ Aguardando ${s}s para retentar ${targetLabel} (tentativa ${attempt}/${maxAttempts - 1})...`);
                await backgroundDelay(1000);
              }
              setCooldownTime(0);
            } else {
              console.error(`Erro ao processar ${targetLabel}:`, apiErr);
              setOcrError(apiErr.message || 'Erro ao processar página na API.');
              setProcessingState('paused_on_error');
              setLoading(false);
              return;
            }
          }
        }

        if (processingStateRef.current !== 'processing') break;

        if (pageSuccess && responseData) {
          let rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            let parsed;
            try {
              parsed = JSON.parse(rawText);
            } catch {
              try {
                parsed = repairTruncatedJson(rawText);
              } catch (repairErr) {
                console.error("Falha ao reparar JSON:", repairErr);
              }
            }

            if (Array.isArray(parsed)) {
              const cleaned = parsed.map(tx => {
                if (Array.isArray(tx)) {
                  return {
                    date: String(tx[0] || '').trim(),
                    description: String(tx[1] || 'Lançamento OCR').trim(),
                    value: typeof tx[2] === 'number' ? tx[2] : (parseFloat(String(tx[2]).replace(/[^0-9.-]/g, '')) || 0)
                  };
                }
                return {
                  date: String(tx?.date || '').trim(),
                  description: String(tx?.description || 'Lançamento OCR').trim(),
                  value: typeof tx?.value === 'number' ? tx.value : (parseFloat(String(tx?.value).replace(/[^0-9.-]/g, '')) || 0)
                };
              }).filter(tx => tx.date && tx.description);

              setExtractedData(prev => [...prev, ...cleaned]);
            }
          }

          incrementOcrUsage();
          const processedPagesCount = batchEnd - idx;
          idx += processedPagesCount;
          setCurrentPageIdx(idx);

          if (idx < totalPages) {
            setStatusMessage(`✅ ${targetLabel} concluída. Aguardando intervalo antes da próxima...`);
            await backgroundDelay(2500);
          }
        }
      }

      if (idx >= totalPages && processingStateRef.current === 'processing') {
        setProcessingState('completed');
        setLoading(false);
        setStatusMessage('');
        addToast(`🎉 OCR concluído! Lançamentos identificados em ${totalPages} páginas.`, 'success');
      }
    } finally {
      loopActiveRef.current = false;
    }
  };

  const handlePause = () => {
    setProcessingState('paused_by_user');
    setLoading(false);
    setStatusMessage('Processamento pausado.');
    addToast('OCR pausado.', 'info');
  };

  const handleResume = async () => {
    if (pages.length === 0) return;
    addToast('Retomando OCR...', 'info');
    await startOcrQueue(pages, mimeType, currentPageIdx);
  };

  const handleRetryPage = async () => {
    if (pages.length === 0) return;
    addToast(`Retentando página ${currentPageIdx + 1}...`, 'info');
    await startOcrQueue(pages, mimeType, currentPageIdx);
  };

  const handleSkipPage = async () => {
    if (pages.length === 0) return;
    const skipCount = ocrMode === 'batch' ? Math.min(batchSize, pages.length - currentPageIdx) : 1;
    const nextIdx = currentPageIdx + skipCount;
    if (nextIdx >= pages.length) {
      setProcessingState('completed');
      setLoading(false);
      setStatusMessage('');
      addToast('OCR finalizado (com páginas puladas).', 'success');
    } else {
      await startOcrQueue(pages, mimeType, nextIdx);
    }
  };

  const handleDeleteRow = (indexToDelete) => {
    setExtractedData(prev => prev.filter((_, idx) => idx !== indexToDelete));
    addToast('Lançamento removido da lista.', 'info');
  };

  const handleExportExcel = () => {
    if (extractedData.length === 0) return;
    try {
      const sheetRows = extractedData.map(tx => ({
        'Data': tx.date || '',
        'Histórico / Descrição': tx.description || '',
        'Valor (R$)': Number(tx.value || 0)
      }));

      const worksheet = XLSX.utils.json_to_sheet(sheetRows);
      worksheet['!cols'] = [{ wch: 14 }, { wch: 60 }, { wch: 16 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'EXTRATO_OCR');

      const clean = fileName ? fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/gi, '_') : 'extrato';
      XLSX.writeFile(workbook, `ocr_${clean}_${new Date().toISOString().split('T')[0]}.xlsx`);
      addToast(`Planilha Excel exportada (${extractedData.length} lançamentos)!`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Erro ao exportar planilha.', 'error');
    }
  };

  const handleSendToBank = () => {
    if (extractedData.length === 0) return;
    setBankFromOcr(extractedData, fileName || 'extrato_ocr.pdf');
    addToast(`${extractedData.length} lançamentos enviados para a aba de Extrato Bancário!`, 'success');
    setActivePage('upload');
  };

  const handleSendToSupplier = () => {
    if (extractedData.length === 0) return;
    setSupplierFromOcr(extractedData, fileName || 'notas_ocr.pdf');
    addToast(`${extractedData.length} lançamentos enviados para a aba de Fornecedores / Razão!`, 'success');
    setActivePage('upload');
  };

  const handleSendToTransactions = () => {
    if (extractedData.length === 0) return;
    const { deParaRules, addToast } = useAppStore.getState();
    const formatted = extractedData.map((tx, idx) => {
      const rawDesc = tx.description;
      const numVal = tx.value;
      const isDebit = numVal < 0;
      return {
        id: `ocr_tx_${idx}_${Date.now()}`,
        date: tx.date || '',
        description: rawDesc,
        originalDescription: rawDesc,
        supplierName: '',
        document: tx.document || '',
        value: numVal,
        amount: Math.abs(numVal),
        debitAccount: '',
        creditAccount: '',
        historicCode: '10',
        historicText: rawDesc,
        isSuggested: false,
        isReconciled: false,
        matchPass: 'OCR Direto'
      };
    });

    useAppStore.setState({
      transactions: formatted,
      activePage: 'transactions'
    });

    addToast(`🚀 ${formatted.length} lançamentos do OCR enviados para a Tabela De-Para!`, 'success');
  };

  const preferredModel = getPreferredModel();
  const progressPercent = pages.length > 0 ? Math.round((currentPageIdx / pages.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.3rem' }}>
              <Sparkles size={24} color="var(--accent-cyan)" />
              OCR de Extratos, Fotos e PDFs Escaneados
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
              Extraia automaticamente lançamentos de extratos bancários em PDF (com imagem/foto) e comprovantes usando IA Contábil Google Gemini.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Modelo: <strong style={{ color: 'var(--accent-cyan)' }}>{preferredModel || 'gemini-2.0-flash'}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upload & Controls | Real-time Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
        {/* Left Column: Dropzone & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={18} color="var(--accent-teal)" />
              Importar Documento Escaneado
            </h3>

            <label className="ocr-dropzone">
              <div className="ocr-icon-box">
                <FileText size={32} />
              </div>
              <strong className="ocr-upload-title">
                Clique ou arraste PDF / Imagem
              </strong>
              <span className="ocr-upload-desc">
                PDF multi-páginas, PNG, JPG, JPEG
              </span>
              <input 
                type="file" 
                accept=".pdf,.png,.jpg,.jpeg" 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
                disabled={loading} 
              />
            </label>

            {/* Estratégia e Modo de Processamento para PDFs */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700 }}>
                  Modo de Processamento:
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${ocrMode === 'batch' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOcrMode('batch')}
                  style={{ fontSize: '0.8rem', padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <Sparkles size={13} /> Em Lotes (Econômico)
                </button>
                <button
                  type="button"
                  className={`btn ${ocrMode === 'individual' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setOcrMode('individual')}
                  style={{ fontSize: '0.8rem', padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                >
                  <FileText size={13} /> Pág por Pág
                </button>
              </div>

              {ocrMode === 'batch' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    Tamanho do lote:
                  </label>
                  <select 
                    className="form-input" 
                    value={batchSize} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setBatchSize(val);
                      localStorage.setItem('contahub_ocr_batch_size', String(val));
                    }}
                    style={{ width: '115px', height: '32px', minHeight: '32px', padding: '2px 6px', fontSize: '0.8rem', margin: 0 }}
                  >
                    <option value="2">2 páginas</option>
                    <option value="3">3 páginas</option>
                    <option value="4">4 páginas</option>
                    <option value="5">5 páginas</option>
                    <option value="10">10 páginas</option>
                    <option value="15">15 páginas</option>
                  </select>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    (Economiza cotas da API)
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar during processing */}
            {pages.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Progresso:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Pág {currentPageIdx} de {pages.length} ({progressPercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent-cyan)', transition: 'width 0.3s' }} />
                </div>
              </div>
            )}

            {/* Controls: Pause / Resume / Retry / Skip */}
            {pages.length > 0 && processingState !== 'completed' && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                {processingState === 'processing' ? (
                  <button className="btn btn-secondary btn-sm" onClick={handlePause} style={{ flex: 1 }}>
                    <Pause size={13} /> Pausar
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleResume} style={{ flex: 1 }}>
                    <Play size={13} /> Retomar
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={handleRetryPage} title="Retentar página atual">
                  <RotateCcw size={13} />
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleSkipPage} title="Pular página atual">
                  <FastForward size={13} />
                </button>
              </div>
            )}

            {/* Status Feedback */}
            {statusMessage && (
              <div style={{ marginTop: '16px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {loading && <Loader2 size={16} className="spin" color="var(--accent-cyan)" />}
                <span style={{ color: 'var(--text-primary)' }}>{statusMessage}</span>
              </div>
            )}

            {ocrError && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: 'var(--color-danger)', fontSize: '0.82rem', display: 'flex', gap: '8px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{ocrError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extracted Table & Actions */}
        <div className="card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              Lançamentos Extraídos ({extractedData.length})
            </h3>

            {extractedData.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={handleExportExcel} title="Exportar para Excel">
                  <Download size={14} />
                  <span>Excel</span>
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSendToTransactions} style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title="Enviar direto para a Tabela De-Para">
                  <FileSpreadsheet size={14} />
                  <span>Para De-Para</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleSendToBank} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Landmark size={14} />
                  <span>Para Banco</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleSendToSupplier} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} />
                  <span>Para Fornecedor</span>
                </button>
              </div>
            )}
          </div>

          {/* Table */}
          <div style={{ maxHeight: '520px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table className="classic-data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '100px' }}>Data</th>
                  <th>Histórico / Favorecido</th>
                  <th style={{ width: '140px', textAlign: 'right' }}>Valor (R$)</th>
                  <th style={{ width: '50px', textAlign: 'center' }}>Excluir</th>
                </tr>
              </thead>
              <tbody>
                {extractedData.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                      Nenhum lançamento extraído ainda. Faça upload de um PDF ou imagem ao lado.
                    </td>
                  </tr>
                ) : (
                  extractedData.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {idx + 1}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {item.date}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {item.description}
                      </td>
                      <td className="grid-cell-money" style={{ color: item.value < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="card-action-btn delete-btn"
                          onClick={() => handleDeleteRow(idx)}
                          title="Remover linha"
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
