import * as XLSX from 'xlsx';

/**
 * contaHUB Fiscal XML & Multi-period Installment Engine
 * Supports NFe v4.00, NFSe, CTe, single payments and multi-installments (cobr > dup).
 */

const STORAGE_KEY_PREFIX = 'contahub_fiscal_invoices_';

export function getStorageKey(companyId) {
  return `${STORAGE_KEY_PREFIX}${companyId || 'default'}`;
}

export function loadFiscalInvoices(companyId) {
  try {
    const raw = localStorage.getItem(getStorageKey(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Erro ao carregar notas fiscais do repositório local:', e);
    return [];
  }
}

export function saveFiscalInvoices(companyId, invoices) {
  try {
    localStorage.setItem(getStorageKey(companyId), JSON.stringify(invoices || []));
  } catch (e) {
    console.error('Erro ao salvar notas fiscais no repositório local:', e);
  }
}

function cleanCnpj(val) {
  if (!val) return '';
  return String(val).replace(/\D/g, '');
}

function getXmlTag(xml, tag) {
  const m = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i').exec(xml);
  return m ? m[1].trim() : '';
}

function getXmlBlock(xml, tag) {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return m ? m[1] : '';
}

function getXmlBlocks(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
  const matches = [];
  let m;
  while ((m = regex.exec(xml)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

export function parseXmlDocument(xmlText, activeCompanyCnpj = '') {
  if (!xmlText || typeof xmlText !== 'string') return null;

  try {
    const cleanActiveCnpj = cleanCnpj(activeCompanyCnpj);

    // -------------------------------------------------------------
    // 1. Browser / DOMParser Mode
    // -------------------------------------------------------------
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const parserError = doc.querySelector('parsererror');
      
      if (!parserError) {
        // 1.1 NF-e
        const infNFe = doc.querySelector('infNFe');
        if (infNFe) {
          const chNFe = infNFe.getAttribute('Id')?.replace(/^NFe/i, '') || doc.querySelector('protNFe > infProt > chNFe')?.textContent?.trim() || '';
          const nNF = doc.querySelector('ide > nNF')?.textContent?.trim() || '';
          const serie = doc.querySelector('ide > serie')?.textContent?.trim() || '1';
          const dhEmi = doc.querySelector('ide > dhEmi, ide > dEmi')?.textContent?.trim() || '';
          const issueDate = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];

          const emitCnpj = cleanCnpj(doc.querySelector('emit > CNPJ, emit > CPF')?.textContent?.trim() || '');
          const emitNome = doc.querySelector('emit > xNome')?.textContent?.trim() || doc.querySelector('emit > xFant')?.textContent?.trim() || 'FORNECEDOR';
          
          const destCnpj = cleanCnpj(doc.querySelector('dest > CNPJ, dest > CPF')?.textContent?.trim() || '');
          const destNome = doc.querySelector('dest > xNome')?.textContent?.trim() || 'CLIENTE';

          const vNF = parseFloat(doc.querySelector('total > ICMSTot > vNF, total > vNF')?.textContent?.trim() || '0') || 0;

          let type = 'ENTRADA';
          let partnerName = emitNome;
          let partnerCnpj = emitCnpj;

          if (cleanActiveCnpj && emitCnpj === cleanActiveCnpj) {
            type = 'SAIDA';
            partnerName = destNome;
            partnerCnpj = destCnpj;
          } else if (cleanActiveCnpj && destCnpj === cleanActiveCnpj) {
            type = 'ENTRADA';
            partnerName = emitNome;
            partnerCnpj = emitCnpj;
          }

          const dupElements = doc.querySelectorAll('cobr > dup');
          const installments = [];

          if (dupElements.length > 0) {
            const totalDups = dupElements.length;
            dupElements.forEach((dup, idx) => {
              const nDup = dup.querySelector('nDup')?.textContent?.trim() || String(idx + 1);
              const dVenc = dup.querySelector('dVenc')?.textContent?.trim() || issueDate;
              const vDup = parseFloat(dup.querySelector('vDup')?.textContent?.trim() || '0') || (vNF / totalDups);

              installments.push({
                id: `inst_${chNFe || nNF}_${nDup}_${idx}`,
                number: nDup,
                label: `${idx + 1}/${totalDups}`,
                dueDate: dVenc,
                amount: vDup,
                status: 'ABERTO',
                settlementDate: null,
                bankTxId: null,
                bankDescription: null,
                settledAmount: 0
              });
            });
          } else {
            installments.push({
              id: `inst_${chNFe || nNF}_unica_0`,
              number: '1',
              label: 'Única (1/1)',
              dueDate: issueDate,
              amount: vNF,
              status: 'ABERTO',
              settlementDate: null,
              bankTxId: null,
              bankDescription: null,
              settledAmount: 0
            });
          }

          const invoiceId = chNFe || `nfe_${emitCnpj}_${nNF}_${issueDate}`;

          return {
            id: invoiceId,
            chNFe,
            number: nNF,
            series: serie,
            issueDate,
            type,
            partnerName,
            partnerCnpj,
            totalAmount: vNF,
            paidAmount: 0,
            remainingAmount: vNF,
            status: 'ABERTO',
            installments,
            xmlType: 'NF-e',
            rawXml: xmlText
          };
        }

        // 1.2 NFS-e
        const infNfse = doc.querySelector('InfNfse, infNfse, CompNfse, Rps');
        if (infNfse) {
          const nNF = doc.querySelector('Numero, nNF, IdentificacaoRps > Numero')?.textContent?.trim() || 'S/N';
          const dhEmi = doc.querySelector('DataEmissao, dhEmi, dEmi')?.textContent?.trim() || '';
          const issueDate = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];

          const prestadorCnpj = cleanCnpj(doc.querySelector('PrestadorServico > IdentificacaoPrestador > Cnpj, Prestador > Cnpj, emit > CNPJ')?.textContent?.trim() || '');
          const prestadorNome = doc.querySelector('PrestadorServico > RazaoSocial, Prestador > RazaoSocial, emit > xNome')?.textContent?.trim() || 'PRESTADOR DE SERVIÇO';

          const tomadorCnpj = cleanCnpj(doc.querySelector('TomadorServico > IdentificacaoTomador > CpfCnpj > Cnpj, Tomador > Cnpj, dest > CNPJ')?.textContent?.trim() || '');
          const tomadorNome = doc.querySelector('TomadorServico > RazaoSocial, Tomador > RazaoSocial, dest > xNome')?.textContent?.trim() || 'TOMADOR DE SERVIÇO';

          const vServ = parseFloat(doc.querySelector('ValoresNfse > ValorLiquidoNfse, Valores > ValorLiquido, ValorServicos, vNF')?.textContent?.trim() || '0') || 0;

          let type = 'SERVICO_TOMADO';
          let partnerName = prestadorNome;
          let partnerCnpj = prestadorCnpj;

          if (cleanActiveCnpj && prestadorCnpj === cleanActiveCnpj) {
            type = 'SERVICO_PRESTADO';
            partnerName = tomadorNome;
            partnerCnpj = tomadorCnpj;
          }

          const invoiceId = `nfse_${prestadorCnpj || tomadorCnpj}_${nNF}_${issueDate}`;

          return {
            id: invoiceId,
            chNFe: '',
            number: nNF,
            series: 'NFS',
            issueDate,
            type,
            partnerName,
            partnerCnpj,
            totalAmount: vServ,
            paidAmount: 0,
            remainingAmount: vServ,
            status: 'ABERTO',
            installments: [{
              id: `inst_${invoiceId}_unica_0`,
              number: '1',
              label: 'Única (1/1)',
              dueDate: issueDate,
              amount: vServ,
              status: 'ABERTO',
              settlementDate: null,
              bankTxId: null,
              bankDescription: null,
              settledAmount: 0
            }],
            xmlType: 'NFS-e',
            rawXml: xmlText
          };
        }

        // 1.3 CT-e
        const infCte = doc.querySelector('infCte');
        if (infCte) {
          const chCTe = infCte.getAttribute('Id')?.replace(/^CTe/i, '') || '';
          const nCT = doc.querySelector('ide > nCT')?.textContent?.trim() || '';
          const dhEmi = doc.querySelector('ide > dhEmi')?.textContent?.trim() || '';
          const issueDate = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];

          const emitCnpj = cleanCnpj(doc.querySelector('emit > CNPJ')?.textContent?.trim() || '');
          const emitNome = doc.querySelector('emit > xNome')?.textContent?.trim() || 'TRANSPORTADORA';
          const vTPrest = parseFloat(doc.querySelector('vPrest > vTPrest')?.textContent?.trim() || '0') || 0;

          const invoiceId = chCTe || `cte_${emitCnpj}_${nCT}_${issueDate}`;

          return {
            id: invoiceId,
            chNFe: chCTe,
            number: nCT,
            series: 'CTE',
            issueDate,
            type: 'CTE_FRETE',
            partnerName: emitNome,
            partnerCnpj: emitCnpj,
            totalAmount: vTPrest,
            paidAmount: 0,
            remainingAmount: vTPrest,
            status: 'ABERTO',
            installments: [{
              id: `inst_${invoiceId}_unica_0`,
              number: '1',
              label: 'Única (1/1)',
              dueDate: issueDate,
              amount: vTPrest,
              status: 'ABERTO',
              settlementDate: null,
              bankTxId: null,
              bankDescription: null,
              settledAmount: 0
            }],
            xmlType: 'CT-e',
            rawXml: xmlText
          };
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Node / Regex Fallback Mode
    // -------------------------------------------------------------
    const nNF = getXmlTag(xmlText, 'nNF');
    if (nNF) {
      const chMatch = /Id="NFe([0-9]{44})"/i.exec(xmlText) || /<chNFe>([0-9]{44})<\/chNFe>/i.exec(xmlText);
      const chNFe = chMatch ? chMatch[1] : '';
      const serie = getXmlTag(xmlText, 'serie') || '1';
      const dhEmi = getXmlTag(xmlText, 'dhEmi') || getXmlTag(xmlText, 'dEmi') || '';
      const issueDate = dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0];

      const emitBlock = getXmlBlock(xmlText, 'emit');
      const emitCnpj = cleanCnpj(getXmlTag(emitBlock, 'CNPJ') || getXmlTag(emitBlock, 'CPF'));
      const emitNome = getXmlTag(emitBlock, 'xNome') || getXmlTag(emitBlock, 'xFant') || 'FORNECEDOR';

      const destBlock = getXmlBlock(xmlText, 'dest');
      const destCnpj = cleanCnpj(getXmlTag(destBlock, 'CNPJ') || getXmlTag(destBlock, 'CPF'));
      const destNome = getXmlTag(destBlock, 'xNome') || 'CLIENTE';

      const totalBlock = getXmlBlock(xmlText, 'total');
      const vNF = parseFloat(getXmlTag(totalBlock, 'vNF') || '0') || 0;

      let type = 'ENTRADA';
      let partnerName = emitNome;
      let partnerCnpj = emitCnpj;

      if (cleanActiveCnpj && emitCnpj === cleanActiveCnpj) {
        type = 'SAIDA';
        partnerName = destNome;
        partnerCnpj = destCnpj;
      }

      const dupBlocks = getXmlBlocks(xmlText, 'dup');
      const installments = [];

      if (dupBlocks.length > 0) {
        const totalDups = dupBlocks.length;
        dupBlocks.forEach((dupXml, idx) => {
          const nDup = getXmlTag(dupXml, 'nDup') || String(idx + 1);
          const dVenc = getXmlTag(dupXml, 'dVenc') || issueDate;
          const vDup = parseFloat(getXmlTag(dupXml, 'vDup') || '0') || (vNF / totalDups);

          installments.push({
            id: `inst_${chNFe || nNF}_${nDup}_${idx}`,
            number: nDup,
            label: `${idx + 1}/${totalDups}`,
            dueDate: dVenc,
            amount: vDup,
            status: 'ABERTO',
            settlementDate: null,
            bankTxId: null,
            bankDescription: null,
            settledAmount: 0
          });
        });
      } else {
        installments.push({
          id: `inst_${chNFe || nNF}_unica_0`,
          number: '1',
          label: 'Única (1/1)',
          dueDate: issueDate,
          amount: vNF,
          status: 'ABERTO',
          settlementDate: null,
          bankTxId: null,
          bankDescription: null,
          settledAmount: 0
        });
      }

      const invoiceId = chNFe || `nfe_${emitCnpj}_${nNF}_${issueDate}`;

      return {
        id: invoiceId,
        chNFe,
        number: nNF,
        series: serie,
        issueDate,
        type,
        partnerName,
        partnerCnpj,
        totalAmount: vNF,
        paidAmount: 0,
        remainingAmount: vNF,
        status: 'ABERTO',
        installments,
        xmlType: 'NF-e',
        rawXml: xmlText
      };
    }

    return null;
  } catch (err) {
    console.error('Erro ao fazer parse de XML:', err);
    return null;
  }
}

export function parseMultipleXmlFiles(files, activeCompanyCnpj = '') {
  return new Promise((resolve) => {
    const results = [];
    let processed = 0;
    const fileArray = Array.from(files || []);
    const total = fileArray.length;

    if (total === 0) {
      resolve([]);
      return;
    }

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const parsed = parseXmlDocument(text, activeCompanyCnpj);
          if (parsed) {
            results.push(parsed);
          }
        } catch (err) {
          console.warn('Erro ao ler arquivo XML:', file.name, err);
        }
        processed++;
        if (processed === total) {
          resolve(results);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === total) {
          resolve(results);
        }
      };
      reader.readAsText(file);
    });
  });
}

/**
 * Merges a newly parsed list of invoices into existing invoices, avoiding duplicate keys.
 * Preserves previous settlement state if an invoice already had paid installments.
 */
export function mergeInvoices(existingInvoices = [], incomingInvoices = []) {
  const invoiceMap = new Map();

  // Load existing
  (existingInvoices || []).forEach(inv => {
    invoiceMap.set(inv.id, inv);
  });

  // Merge incoming
  (incomingInvoices || []).forEach(inc => {
    if (!invoiceMap.has(inc.id)) {
      invoiceMap.set(inc.id, inc);
    } else {
      const existing = invoiceMap.get(inc.id);
      const updatedInstallments = inc.installments.map((inst, idx) => {
        const exInst = existing.installments?.[idx] || existing.installments?.find(i => i.number === inst.number);
        if (exInst && exInst.status === 'PAGO') {
          return {
            ...inst,
            status: 'PAGO',
            settlementDate: exInst.settlementDate,
            bankTxId: exInst.bankTxId,
            bankDescription: exInst.bankDescription,
            settledAmount: exInst.settledAmount || inst.amount
          };
        }
        return inst;
      });

      const paidSum = updatedInstallments.filter(i => i.status === 'PAGO').reduce((acc, i) => acc + (i.amount || 0), 0);
      let status = 'ABERTO';
      if (paidSum >= inc.totalAmount - 0.01) {
        status = 'LIQUIDADO';
      } else if (paidSum > 0) {
        status = 'PARCIAL';
      }

      invoiceMap.set(inc.id, {
        ...inc,
        paidAmount: paidSum,
        remainingAmount: Math.max(0, inc.totalAmount - paidSum),
        status,
        installments: updatedInstallments
      });
    }
  });

  return Array.from(invoiceMap.values()).sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
}

/**
 * Marks a specific installment as settled by a bank payment.
 */
export function settleInstallmentInList(invoices = [], invoiceId, installmentNumber, settlementData) {
  return (invoices || []).map(inv => {
    if (inv.id !== invoiceId) return inv;

    const updatedInstallments = (inv.installments || []).map(inst => {
      if (inst.number === String(installmentNumber) || inst.id === String(installmentNumber)) {
        return {
          ...inst,
          status: 'PAGO',
          settlementDate: settlementData.date || new Date().toISOString().split('T')[0],
          bankTxId: settlementData.bankTxId || '',
          bankDescription: settlementData.bankDescription || '',
          settledAmount: settlementData.amount || inst.amount
        };
      }
      return inst;
    });

    const paidSum = updatedInstallments.filter(i => i.status === 'PAGO').reduce((acc, i) => acc + (i.amount || 0), 0);
    let status = 'ABERTO';
    if (paidSum >= inv.totalAmount - 0.01) {
      status = 'LIQUIDADO';
    } else if (paidSum > 0) {
      status = 'PARCIAL';
    }

    return {
      ...inv,
      paidAmount: paidSum,
      remainingAmount: Math.max(0, inv.totalAmount - paidSum),
      status,
      installments: updatedInstallments
    };
  });
}

/**
 * Unsettles an installment, resetting it to open state.
 */
export function unsettleInstallmentInList(invoices = [], invoiceId, installmentNumber) {
  return (invoices || []).map(inv => {
    if (inv.id !== invoiceId) return inv;

    const updatedInstallments = (inv.installments || []).map(inst => {
      if (inst.number === String(installmentNumber) || inst.id === String(installmentNumber)) {
        return {
          ...inst,
          status: 'ABERTO',
          settlementDate: null,
          bankTxId: null,
          bankDescription: null,
          settledAmount: 0
        };
      }
      return inst;
    });

    const paidSum = updatedInstallments.filter(i => i.status === 'PAGO').reduce((acc, i) => acc + (i.amount || 0), 0);
    let status = 'ABERTO';
    if (paidSum >= inv.totalAmount - 0.01) {
      status = 'LIQUIDADO';
    } else if (paidSum > 0) {
      status = 'PARCIAL';
    }

    return {
      ...inv,
      paidAmount: paidSum,
      remainingAmount: Math.max(0, inv.totalAmount - paidSum),
      status,
      installments: updatedInstallments
    };
  });
}

/**
 * Exports the fiscal ledger and installments to Excel.
 */
export function exportFiscalLedgerToExcel(invoices = [], companyName = 'empresa') {
  if (!invoices || invoices.length === 0) return;

  const rows = [];
  invoices.forEach(inv => {
    (inv.installments || []).forEach(inst => {
      rows.push({
        'Tipo': inv.type === 'ENTRADA' ? 'Compra (Entrada)' : (inv.type === 'SAIDA' ? 'Venda (Saída)' : 'Serviço'),
        'Número NF': inv.number,
        'Série': inv.series,
        'Emissão': inv.issueDate,
        'Fornecedor / Cliente': inv.partnerName,
        'CNPJ / CPF': inv.partnerCnpj,
        'Valor Total NF (R$)': inv.totalAmount,
        'Parcela': inst.label || inst.number,
        'Vencimento Parcela': inst.dueDate,
        'Valor Parcela (R$)': inst.amount,
        'Status Parcela': inst.status === 'PAGO' ? 'Quitada / Paga' : 'Em Aberto',
        'Data Quitação Banco': inst.settlementDate || '—',
        'Lançamento Bancário': inst.bankDescription || '—',
        'Status Geral NF': inv.status
      });
    });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 18 },
    { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 },
    { wch: 40 }, { wch: 16 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'NOTAS_E_PARCELAS');

  const cleanName = (companyName || 'empresa').toLowerCase().replace(/[^a-z0-9]/gi, '_');
  XLSX.writeFile(workbook, `contahub_controle_fiscal_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
