import * as XLSX from 'xlsx';

export function patchXlsOffsets(fileData) {
  try {
    const header = fileData.subarray(0, 8);
    const isCFB = header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0 &&
                  header[4] === 0xA1 && header[5] === 0xB1 && header[6] === 0x1A && header[7] === 0xE1;
    
    if (!isCFB) {
      return fileData;
    }

    const cfb = XLSX.CFB.read(fileData, { type: 'array' });
    const workbookEntry = cfb.FileIndex.find(f => f.name === 'Workbook');
    if (!workbookEntry || !workbookEntry.content) {
      return fileData;
    }

    const data = workbookEntry.content;
    
    const worksheetBofs = [];
    let pos = 0;
    while (pos < data.length - 8) {
      const type = data[pos] | (data[pos + 1] << 8);
      const len = data[pos + 2] | (data[pos + 3] << 8);
      if (type === 0x0809) {
        const subtype = data[pos + 6] | (data[pos + 7] << 8);
        if (subtype === 0x10) {
          worksheetBofs.push(pos);
        }
      }
      pos += 4 + len;
    }

    const boundsheets = [];
    pos = 0;
    while (pos < data.length - 8) {
      const type = data[pos] | (data[pos + 1] << 8);
      const len = data[pos + 2] | (data[pos + 3] << 8);
      if (type === 0x0085) {
        boundsheets.push(pos);
      }
      pos += 4 + len;
    }

    let patched = false;
    for (let i = 0; i < Math.min(boundsheets.length, worksheetBofs.length); i++) {
      const bsPos = boundsheets[i];
      const bofPos = worksheetBofs[i];
      
      const oldOffset = data[bsPos + 4] | (data[bsPos + 5] << 8) | (data[bsPos + 6] << 16) | (data[bsPos + 7] << 24);
      if (oldOffset !== bofPos) {
        data[bsPos + 4] = bofPos & 0xFF;
        data[bsPos + 5] = (bofPos >> 8) & 0xFF;
        data[bsPos + 6] = (bofPos >> 16) & 0xFF;
        data[bsPos + 7] = (bofPos >> 24) & 0xFF;
        patched = true;
      }
    }

    if (patched) {
      return XLSX.CFB.write(cfb, { type: 'array' });
    }
  } catch (err) {
    console.error('Erro ao aplicar patch de offsets em arquivo XLS:', err);
  }
  return fileData;
}

export function parsePlanoContasFile(arrayBuffer, fileName = '') {
  let data = new Uint8Array(arrayBuffer);
  data = patchXlsOffsets(data);
  const workbook = XLSX.read(data, { type: 'array' });

  let sheet = null;
  let rows = [];

  for (const name of workbook.SheetNames) {
    const currentSheet = workbook.Sheets[name];
    const currentRows = XLSX.utils.sheet_to_json(currentSheet, { header: 1 });

    if (currentRows && currentRows.length >= 2) {
      let hasHeaders = false;
      for (let i = 0; i < Math.min(currentRows.length, 15); i++) {
        const row = currentRows[i];
        if (!row) continue;
        const normalized = Array.from(row, c => String(c || '').toLowerCase().trim());
        const foundCode = normalized.some(cell => cell && (cell.includes('código') || cell.includes('codigo') || cell === 'cod'));
        const foundName = normalized.some(cell => cell && (cell.includes('nome') || cell.includes('descri') || cell.includes('classifica')));
        if (foundCode && foundName) {
          hasHeaders = true;
          break;
        }
      }

      if (hasHeaders) {
        sheet = currentSheet;
        rows = currentRows;
        break;
      }

      if (!sheet) {
        sheet = currentSheet;
        rows = currentRows;
      }
    }
  }

  if (!sheet) {
    sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  }

  if (!rows || rows.length < 2) {
    throw new Error('A planilha de plano de contas está vazia ou não contém linhas suficientes.');
  }

  let codeIdx = -1;
  let nameIdx = -1;
  let classIdx = -1;
  let typeIdx = -1;
  let levelIdx = -1;
  let companyName = '';

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const row = rows[i];
    if (!row) continue;
    const companyKeyIdx = row.findIndex(cell => cell && String(cell).toLowerCase().includes('empresa:'));
    if (companyKeyIdx !== -1) {
      for (let j = companyKeyIdx + 1; j < row.length; j++) {
        if (row[j] && String(row[j]).trim()) {
          companyName = String(row[j]).trim();
          break;
        }
      }
    }
  }

  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    const normalized = Array.from(row, c => String(c || '').toLowerCase().trim());
    const foundCode = normalized.some(cell => cell && (cell.includes('código') || cell.includes('codigo') || cell === 'cod'));
    const foundName = normalized.some(cell => cell && (cell.includes('nome') || cell.includes('descri') || cell.includes('classifica')));

    if (foundCode && foundName) {
      headerRowIdx = i;
      codeIdx = normalized.findIndex(cell => cell && (cell.includes('código') || cell.includes('codigo') || cell === 'cod'));
      nameIdx = normalized.findIndex(cell => cell && (cell.includes('nome') || cell.includes('descri')));
      classIdx = normalized.findIndex(cell => cell && (cell.includes('classifica') || cell.includes('classif')));
      typeIdx = normalized.findIndex(cell => cell && (cell === 't' || cell.includes('tipo')));
      levelIdx = normalized.findIndex(cell => cell && (cell.includes('grau') || cell.includes('nivel') || cell.includes('nível')));
      break;
    }
  }

  if (codeIdx === -1 || nameIdx === -1) {
    throw new Error('Não foi possível identificar as colunas de Código e Nome na planilha de plano de contas.');
  }

  const parsedAccounts = [];
  const startRow = headerRowIdx === -1 ? 0 : headerRowIdx + 1;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    let rawCode = String(row[codeIdx] || '').trim();
    if (!rawCode && codeIdx > 0 && row[codeIdx - 1] !== undefined && row[codeIdx - 1] !== null) {
      rawCode = String(row[codeIdx - 1]).trim();
    }

    let rawName = '';
    if (nameIdx !== -1) {
      for (let j = nameIdx; j < nameIdx + 6 && j < row.length; j++) {
        if (row[j] !== undefined && row[j] !== null && String(row[j]).trim()) {
          rawName = String(row[j]).trim();
          break;
        }
      }
    }

    const rawClass = classIdx !== -1 ? String(row[classIdx] || '').trim() : '';
    const rawType = typeIdx !== -1 ? String(row[typeIdx] || '').trim() : '';
    let rawLevel = levelIdx !== -1 ? String(row[levelIdx] || '').trim() : '';

    if (rawCode.toLowerCase().includes('código') || rawCode.toLowerCase().includes('codigo')) continue;

    if (rawCode && rawName) {
      const isSynthetic = (rawType.toUpperCase() === 'S') || (rawLevel && parseInt(rawLevel) < 5);
      parsedAccounts.push({
        code: rawCode,
        name: rawName,
        classification: rawClass,
        type: rawType,
        level: rawLevel ? parseInt(rawLevel) : null,
        isSynthetic: isSynthetic
      });
    }
  }

  if (parsedAccounts.length === 0) {
    throw new Error('Nenhuma conta contábil válida encontrada na planilha.');
  }

  const defaultName = companyName || fileName.replace(/\.[^/.]+$/, "") || 'Empresa';

  return {
    companyName: defaultName,
    accounts: parsedAccounts
  };
}
