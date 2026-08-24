import * as XLSX from 'xlsx';

function isBinaryExcel(u8) {
  if (!u8 || u8.length < 4) return false;
  // OLE2 / BIFF8 (.xls): D0 CF 11 E0
  if (u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0) return true;
  // ZIP / XLSX (.xlsx): 50 4B
  if (u8[0] === 0x50 && u8[1] === 0x4B) return true;
  return false;
}

const HEADER_CANDIDATE_KEYWORDS = [
  'DATA', 'DT', 'DATE', 'EMISSAO', 'LANCAMENTO', 'VENCIMENTO', 'VENCTO', 'LIQUIDACAO',
  'HISTORICO', 'HIST', 'DESCRICAO', 'FORNECEDOR', 'CLIENTE', 'FAVORECIDO',
  'VALOR', 'VALOR BRUTO', 'VALOR LIQUIDO', 'DEBITO', 'CREDITO', 'SALDO',
  'DOCUMENTO', 'DOC', 'NUMERO', 'TITULO', 'CONTA', 'LOTE'
];

export function detectHeaderRow(matrix, diag = null) {
  if (!matrix || matrix.length === 0) return { headerIndex: 0, headers: [], rows: [] };
  
  let bestRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < Math.min(matrix.length, 30); r++) {
    const row = matrix[r];
    if (!Array.isArray(row) || row.length < 2) continue;

    let matchCount = 0;
    for (const cell of row) {
      if (!cell) continue;
      const cellUpper = String(cell).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      if (HEADER_CANDIDATE_KEYWORDS.some(kw => cellUpper === kw || cellUpper.includes(kw))) {
        matchCount++;
      }
    }

    if (matchCount > maxScore) {
      maxScore = matchCount;
      bestRowIndex = r;
    }
  }

  if (maxScore >= 2) {
    diag?.log(`[HEADER DETECTADO] Cabeçalho contábil identificado na linha ${bestRowIndex + 1} (${maxScore} colunas reconhecidas).`);
    const headers = matrix[bestRowIndex].map(h => String(h || '').trim());
    const rows = matrix.slice(bestRowIndex + 1);
    return { headerIndex: bestRowIndex, headers, rows };
  }

  diag?.log('[HEADER PADRÃO] Cabeçalho considerado na linha 1.');
  return {
    headerIndex: 0,
    headers: matrix[0].map(h => String(h || '').trim()),
    rows: matrix.slice(1)
  };
}

function parseNFeXml(xmlText, diag = null) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    const infNFe = doc.querySelector('infNFe');
    if (!infNFe) return null;

    const nNF = doc.querySelector('ide > nNF')?.textContent?.trim() || '';
    const dhEmi = doc.querySelector('ide > dhEmi, ide > dEmi')?.textContent?.trim() || '';
    const cnpj = doc.querySelector('emit > CNPJ, emit > CPF')?.textContent?.trim() || '';
    const xNome = doc.querySelector('emit > xNome')?.textContent?.trim() || doc.querySelector('emit > xFant')?.textContent?.trim() || '';
    const vNF = parseFloat(doc.querySelector('total > ICMSTot > vNF')?.textContent?.trim() || '0') || 0;

    const dups = doc.querySelectorAll('cobr > dup');
    const headers = ['Data', 'Histórico / Fornecedor', 'Valor', 'Documento', 'CNPJ'];
    const rows = [];

    if (dups.length > 0) {
      dups.forEach(dup => {
        const nDup = dup.querySelector('nDup')?.textContent?.trim() || '';
        const dVenc = dup.querySelector('dVenc')?.textContent?.trim() || '';
        const vDup = parseFloat(dup.querySelector('vDup')?.textContent?.trim() || '0') || vNF;

        rows.push([
          dVenc || (dhEmi ? dhEmi.split('T')[0] : ''),
          `${xNome}${nDup ? ` (Parc ${nDup})` : ''}`,
          vDup,
          nNF,
          cnpj
        ]);
      });
    } else {
      rows.push([
        dhEmi ? dhEmi.split('T')[0] : '',
        xNome,
        vNF,
        nNF,
        cnpj
      ]);
    }

    diag?.log(`[NF-E XML] NF ${nNF} de ${xNome} lida com sucesso (R$ ${vNF.toFixed(2)}).`);
    return { headers, rows };
  } catch (e) {
    diag?.log(`[ERRO XML NF-E] Falha ao processar NF-e: ${e.message}`);
    return null;
  }
}

function getSheetDataMatrix(sheet, diag) {
  if (!sheet) return [];

  let rawData = [];
  try {
    rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false });
    if (Array.isArray(rawData) && rawData.length > 0) {
      diag?.log(`[SHEET_TO_JSON] ${rawData.length} linhas obtidas via sheet_to_json.`);
      return rawData;
    }
  } catch (e) {
    diag?.log(`[AVISO] sheet_to_json direto falhou: ${e.message}`);
  }

  // Fallback: iterate over all cell keys manually
  const keys = Object.keys(sheet).filter(k => !k.startsWith('!'));
  diag?.log(`[RECUPERAÇÃO] Tentando reconstruir planilha a partir de ${keys.length} células...`);

  if (keys.length === 0) return [];

  let minR = Infinity, maxR = 0, minC = Infinity, maxC = 0;
  const cellMap = {};

  for (const k of keys) {
    try {
      const decoded = XLSX.utils.decode_cell(k);
      if (decoded.r < minR) minR = decoded.r;
      if (decoded.r > maxR) maxR = decoded.r;
      if (decoded.c < minC) minC = decoded.c;
      if (decoded.c > maxC) maxC = decoded.c;
      const cell = sheet[k];
      cellMap[`${decoded.r},${decoded.c}`] = cell ? (cell.w !== undefined && cell.w !== '' ? cell.w : cell.v) : null;
    } catch {}
  }

  if (minR === Infinity) return [];

  rawData = [];
  for (let r = minR; r <= maxR; r++) {
    const row = [];
    for (let c = minC; c <= maxC; c++) {
      row.push(cellMap[`${r},${c}`] !== undefined ? cellMap[`${r},${c}`] : null);
    }
    if (row.some(val => val !== null && val !== undefined && String(val).trim() !== '')) {
      rawData.push(row);
    }
  }

  diag?.log(`[MATRIZ CONSTRUÍDA] ${rawData.length} linhas montadas.`);
  return rawData;
}

function parseHtmlTable(htmlText, diag) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const rows = [];

    const trElements = doc.querySelectorAll('tr');
    diag?.log(`[HTML] ${trElements.length} tags <tr> encontradas no documento.`);

    trElements.forEach(tr => {
      const row = [];
      const cells = tr.querySelectorAll('td, th');
      cells.forEach(cell => {
        const text = (cell.textContent || '').replace(/\u00a0/g, ' ').trim();
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);
        row.push(text);
        for (let c = 1; c < colspan; c++) {
          row.push(null);
        }
      });
      if (row.some(c => c !== null && c !== '')) {
        rows.push(row);
      }
    });

    diag?.log(`[HTML] ${rows.length} linhas extraídas da tabela HTML.`);
    return rows;
  } catch (e) {
    diag?.log(`[ERRO HTML] Falha ao processar tabela HTML: ${e.message}`);
    return [];
  }
}

function parseXmlSpreadsheet(xmlText, diag) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const rows = [];

    const rowElements = doc.querySelectorAll('Row');
    diag?.log(`[XML] ${rowElements.length} elementos <Row> encontrados.`);

    rowElements.forEach(rowEl => {
      const row = [];
      const cellElements = rowEl.querySelectorAll('Cell');
      cellElements.forEach(cell => {
        const dataEl = cell.querySelector('Data');
        const text = dataEl ? dataEl.textContent.trim() : '';
        row.push(text || null);
      });
      if (row.some(c => c !== null && c !== '')) {
        rows.push(row);
      }
    });

    diag?.log(`[XML] ${rows.length} linhas extraídas de XML Spreadsheet.`);
    return rows;
  } catch (e) {
    diag?.log(`[ERRO XML] Falha ao processar XML Spreadsheet: ${e.message}`);
    return [];
  }
}

function parseOfx(text) {
  const transactions = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = stmtTrnRegex.exec(text)) !== null) {
    const block = match[1];
    const getTag = (tag) => {
      const r = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
      const m = block.match(r);
      return m ? m[1].trim() : '';
    };

    const type = getTag('TRNTYPE');
    const dateRaw = getTag('DTPOSTED');
    const amountRaw = getTag('TRNAMT');
    const fitid = getTag('FITID');
    const memo = getTag('MEMO') || getTag('NAME');

    let date = dateRaw;
    if (dateRaw && dateRaw.length >= 8) {
      date = `${dateRaw.substring(0, 4)}-${dateRaw.substring(4, 6)}-${dateRaw.substring(6, 8)}`;
    }

    const amount = parseFloat(amountRaw.replace(',', '.')) || 0;

    transactions.push({
      date,
      description: memo,
      amount: Math.abs(amount),
      isDebit: amount < 0,
      document: fitid,
      raw: block
    });
  }

  const headers = ['Data', 'Histórico', 'Valor', 'Tipo', 'Documento'];
  const rows = transactions.map(t => [
    t.date,
    t.description,
    t.amount,
    t.isDebit ? 'DÉBITO' : 'CRÉDITO',
    t.document
  ]);

  return { headers, rows };
}

export function parseAmount(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.abs(val);

  let str = String(val).trim();
  if (!str) return 0;

  if (str.startsWith('(') && str.endsWith(')')) {
    str = str.substring(1, str.length - 1);
  }

  str = str.replace(/[R$\s]/g, '');

  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

export function parseDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }

  if (typeof val === 'number') {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  const brMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    let year = brMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return '';
}

export async function parseFile(file, diag = null) {
  diag?.log(`[INÍCIO] Lendo arquivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

  const ext = file.name.split('.').pop().toLowerCase();

  // OFX
  if (ext === 'ofx') {
    diag?.log('[FORMATO] Detectado arquivo OFX bancário.');
    const text = await file.text();
    return parseOfx(text);
  }

  // XML (NF-e ou XML Spreadsheet)
  if (ext === 'xml') {
    const text = await file.text();
    if (text.includes('<infNFe') || text.includes('<nfeProc>')) {
      diag?.log('[FORMATO] Detectado arquivo XML de Nota Fiscal Eletrônica (NF-e).');
      const nfeData = parseNFeXml(text, diag);
      if (nfeData) return nfeData;
    }
  }

  // Plain Text / CSV
  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    diag?.log('[FORMATO] Processando CSV/TXT.');
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      const sep = lines[0].includes(';') ? ';' : lines[0].includes('\t') ? '\t' : ',';
      const rawMatrix = lines.map(l => l.split(sep).map(c => c.trim().replace(/^["']|["']$/g, '')));
      const detected = detectHeaderRow(rawMatrix, diag);
      return { headers: detected.headers, rows: detected.rows };
    }
  }

  // Excel ArrayBuffer
  const buffer = await file.arrayBuffer();
  const u8 = new Uint8Array(buffer);

  if (isBinaryExcel(u8)) {
    diag?.log('[FORMATO] Arquivo Excel binário nativo (BIFF8 / XLSX).');
    const wb = XLSX.read(buffer, { type: 'array', cellDates: false, raw: true });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const matrix = getSheetDataMatrix(sheet, diag);

    if (matrix.length > 0) {
      const detected = detectHeaderRow(matrix, diag);
      return { headers: detected.headers, rows: detected.rows };
    }
  }

  // HTML table or XML Spreadsheet
  const textDecoder = new TextDecoder('windows-1252');
  const textContent = textDecoder.decode(buffer);

  if (textContent.includes('<infNFe') || textContent.includes('<nfeProc>')) {
    diag?.log('[FORMATO] Detectado XML de Nota Fiscal Eletrônica (NF-e).');
    const nfeData = parseNFeXml(textContent, diag);
    if (nfeData) return nfeData;
  }

  if (textContent.includes('<table') || textContent.includes('<tr')) {
    diag?.log('[FORMATO] Arquivo HTML tabulado gerado pelo Domínio Sistemas.');
    const matrix = parseHtmlTable(textContent, diag);
    if (matrix.length > 0) {
      const detected = detectHeaderRow(matrix, diag);
      return { headers: detected.headers, rows: detected.rows };
    }
  }

  if (textContent.includes('<?xml') && textContent.includes('Workbook')) {
    diag?.log('[FORMATO] Arquivo XML Spreadsheet 2003.');
    const matrix = parseXmlSpreadsheet(textContent, diag);
    if (matrix.length > 0) {
      const detected = detectHeaderRow(matrix, diag);
      return { headers: detected.headers, rows: detected.rows };
    }
  }

  diag?.log('[FALLBACK] Tentando leitura genérica com SheetJS...');
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = getSheetDataMatrix(sheet, diag);
  const detected = detectHeaderRow(matrix, diag);

  return { headers: detected.headers, rows: detected.rows };
}

export function parsePastedText(rawText) {
  if (!rawText || !rawText.trim()) return { headers: [], rows: [] };
  const lines = rawText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  const matrix = lines.map(line => line.split(sep).map(cell => cell.trim().replace(/^["']|["']$/g, '')));
  const detected = detectHeaderRow(matrix);

  return { headers: detected.headers, rows: detected.rows };
}
