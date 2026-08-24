// Multi-company storage engine with isolated data per company for contaHUB

const COMPANIES_KEY = 'contahub_companies_v1';
const ACTIVE_COMPANY_KEY = 'contahub_active_company_id_v1';

export function getCompanies() {
  try {
    const raw = localStorage.getItem(COMPANIES_KEY);
    if (!raw) {
      // Default initial mock company if none exists
      const initial = [
        {
          id: 'comp_default_1',
          name: 'Empresa Principal',
          cnpj: '00.000.000/0001-91',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem(COMPANIES_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCompanies(companies) {
  try {
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  } catch {}
}

export function createCompany(name, cnpj = '') {
  const companies = getCompanies();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Nome da empresa é obrigatório.');

  const newCompany = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: cleanName,
    cnpj: cnpj.trim(),
    createdAt: new Date().toISOString()
  };

  const updated = [...companies, newCompany];
  saveCompanies(updated);
  return newCompany;
}

export function updateCompany(id, name, cnpj = '') {
  const companies = getCompanies();
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Nome da empresa é obrigatório.');

  const updated = companies.map(c => {
    if (c.id === id) {
      return {
        ...c,
        name: cleanName,
        cnpj: cnpj.trim(),
        updatedAt: new Date().toISOString()
      };
    }
    return c;
  });

  saveCompanies(updated);
  return updated.find(c => c.id === id);
}

export function deleteCompany(id) {
  const companies = getCompanies();
  const updated = companies.filter(c => c.id !== id);
  saveCompanies(updated);

  // Cascade delete all isolated company data from localStorage
  try {
    localStorage.removeItem(`contahub_company_${id}_planos`);
    localStorage.removeItem(`contahub_company_${id}_active_plano`);
    localStorage.removeItem(`contahub_company_${id}_rules`);
    localStorage.removeItem(`contahub_company_${id}_session`);
    
    // Clear active company if it was the deleted one
    const activeId = localStorage.getItem(ACTIVE_COMPANY_KEY);
    if (activeId === id) {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  } catch {}

  return updated;
}

export function getActiveCompanyId() {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY) || null;
  } catch {
    return null;
  }
}

export function setActiveCompanyId(id) {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
    }
  } catch {}
}

// Helpers for isolated company data
export function getCompanyPlanos(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(`contahub_company_${companyId}_planos`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCompanyPlanos(companyId, planos) {
  if (!companyId) return;
  try {
    localStorage.setItem(`contahub_company_${companyId}_planos`, JSON.stringify(planos));
  } catch {}
}

export function getCompanyRules(companyId) {
  if (!companyId) return [];
  try {
    const raw = localStorage.getItem(`contahub_company_${companyId}_rules`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCompanyRules(companyId, rules) {
  if (!companyId) return;
  try {
    localStorage.setItem(`contahub_company_${companyId}_rules`, JSON.stringify(rules));
  } catch {}
}
