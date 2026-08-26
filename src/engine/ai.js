// AI Engine for contaHUB — Google Gemini API Integration & Key Management

const OCR_SETTINGS_KEY = 'contahub_ocr_settings_v1';
const LEGACY_STORAGE_KEY = 'contahub_gemini_api_key';
const LEGACY_MODEL_KEY = 'contahub_gemini_model';

const DEFAULT_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Mais Rápido / Recomendado)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Padrão Estável)' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Mais Preciso e Completo)' }
];

export function loadOcrSettings() {
  try {
    const raw = localStorage.getItem(OCR_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Auto-reset monthly counter if month changed
      const currentMonth = new Date().toISOString().slice(0, 7);
      if (parsed.lastResetMonth !== currentMonth) {
        parsed.usageCount = 0;
        parsed.lastResetMonth = currentMonth;
        saveOcrSettings(parsed);
      }
      return parsed;
    }
  } catch {}

  // Migrate legacy single key if exists
  const legacyKey = localStorage.getItem(LEGACY_STORAGE_KEY);
  const legacyModel = localStorage.getItem(LEGACY_MODEL_KEY) || 'gemini-2.0-flash';
  const initialKeys = legacyKey ? [{ id: 'key_default_1', name: 'Chave Principal', key: legacyKey }] : [];

  const initial = {
    apiKeys: initialKeys,
    activeKeyId: initialKeys.length > 0 ? initialKeys[0].id : '',
    monthlyLimit: 500,
    usageCount: 0,
    lastResetMonth: new Date().toISOString().slice(0, 7),
    modelName: legacyModel
  };

  saveOcrSettings(initial);
  return initial;
}

export function saveOcrSettings(settings) {
  try {
    localStorage.setItem(OCR_SETTINGS_KEY, JSON.stringify(settings));
    // Keep legacy keys in sync
    const activeKey = settings.apiKeys.find(k => k.id === settings.activeKeyId)?.key || '';
    if (activeKey) {
      localStorage.setItem(LEGACY_STORAGE_KEY, activeKey);
    }
    if (settings.modelName) {
      localStorage.setItem(LEGACY_MODEL_KEY, settings.modelName);
    }
  } catch {}
}

export function getActiveApiKey() {
  const settings = loadOcrSettings();
  if (settings.apiKeys && settings.apiKeys.length > 0) {
    const active = settings.apiKeys.find(k => k.id === settings.activeKeyId);
    if (active && active.key) return active.key;
    return settings.apiKeys[0].key;
  }
  return localStorage.getItem(LEGACY_STORAGE_KEY) || '';
}

export function getApiKey() {
  return getActiveApiKey();
}

export function saveApiKey(key) {
  const settings = loadOcrSettings();
  const cleanKey = key.trim();
  if (!cleanKey) return;

  const existing = settings.apiKeys.find(k => k.key === cleanKey);
  if (!existing) {
    const newKey = { id: `key_${Date.now()}`, name: `Chave ${settings.apiKeys.length + 1}`, key: cleanKey };
    settings.apiKeys.push(newKey);
    settings.activeKeyId = newKey.id;
  }
  saveOcrSettings(settings);
}

export function getPreferredModel() {
  const settings = loadOcrSettings();
  return settings.modelName || 'gemini-2.0-flash';
}

export function savePreferredModel(model) {
  const settings = loadOcrSettings();
  settings.modelName = model;
  saveOcrSettings(settings);
}

export function incrementOcrUsage() {
  const settings = loadOcrSettings();
  settings.usageCount = (settings.usageCount || 0) + 1;
  saveOcrSettings(settings);
  return settings;
}

export function isConfigured() {
  return Boolean(getActiveApiKey());
}

export function getAvailableModels() {
  return ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];
}

export async function listGeminiModels(apiKey) {
  const key = apiKey || getActiveApiKey();
  if (!key) return DEFAULT_MODELS;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.models && Array.isArray(data.models)) {
      return data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => {
          const id = m.name.replace(/^models\//, '');
          let name = m.displayName || id;
          if (id === 'gemini-2.0-flash') name = 'Gemini 2.0 Flash (Mais Rápido)';
          else if (id === 'gemini-1.5-flash') name = 'Gemini 1.5 Flash (Padrão Estável)';
          else if (id === 'gemini-1.5-pro') name = 'Gemini 1.5 Pro (Mais Preciso)';
          return { id, name };
        });
    }
  } catch (err) {
    console.warn('Erro ao buscar lista dinâmica de modelos:', err);
  }
  return DEFAULT_MODELS;
}

let lastCallTimestamp = 0;
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedCall(fn) {
  const now = Date.now();
  const elapsed = now - lastCallTimestamp;
  if (elapsed < 3000) {
    await delay(3000 - elapsed);
  }
  lastCallTimestamp = Date.now();
  return fn();
}

async function callGeminiApi(modelName, apiKey, payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  return response.json();
}

export async function reconcileWithAI(unmappedBankItems, unmappedSupplierItems) {
  const apiKey = getActiveApiKey();
  if (!apiKey) throw new Error('Configure sua chave de API Gemini nas Configurações de IA antes de executar.');

  const bankSlice = unmappedBankItems.slice(0, 40).map(i => ({
    id: i.id, date: i.date, amount: i.amount, desc: i.description
  }));
  const supplierSlice = unmappedSupplierItems.slice(0, 40).map(i => ({
    id: i.id, date: i.date, amount: i.amount, desc: i.description
  }));

  const systemPrompt = "Você é um contador sênior especialista no sistema Domínio e em regras de conciliação cruzada. Sua tarefa é analisar extratos bancários e razões de fornecedores, utilizando análise semântica de nomes e números de NFe para encontrar correspondências de alta certeza. Retorne justificativas em português.";
  
  const model = getPreferredModel();
  const isGemini2 = model.includes('gemini-2.') || model.includes('gemini-2.5') || model.includes('gemini-3.');
  
  const genConfig = {
    temperature: 0.1,
    topP: 0.95,
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bankId: { type: "string" },
              supplierId: { type: "string" },
              confidence: { type: "number" },
              justificativa: { type: "string" }
            },
            required: ["bankId", "supplierId", "confidence", "justificativa"]
          }
        }
      },
      required: ["matches"]
    }
  };

  if (isGemini2) {
    genConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const payload = {
    contents: [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "user", parts: [{ text: `Bank Items: ${JSON.stringify(bankSlice)}\nSupplier Items: ${JSON.stringify(supplierSlice)}` }] }
    ],
    generationConfig: genConfig
  };

  return await rateLimitedCall(async () => {
    const data = await callGeminiApi(model, apiKey, payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.matches || [];
  });
}

export async function testGeminiConnection(apiKey, modelName = 'gemini-2.0-flash') {
  const key = apiKey || getActiveApiKey();
  if (!key) {
    return { success: false, message: 'Nenhuma chave de API informada.' };
  }

  const startTime = performance.now();
  try {
    const targetModel = modelName || getPreferredModel() || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas com a palavra OK' }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0.1 }
      })
    });

    const latency = Math.round(performance.now() - startTime);

    if (!response.ok) {
      const errText = await response.text();
      let parsedError = `HTTP ${response.status}`;
      try {
        const errJson = JSON.parse(errText);
        parsedError = errJson.error?.message || parsedError;
      } catch {}
      return {
        success: false,
        status: response.status,
        latency,
        message: `Falha na conexão (${response.status}): ${parsedError}`
      };
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';
    
    return {
      success: true,
      latency,
      model: targetModel,
      reply,
      message: `Conexão bem-sucedida com o Google Gemini (${targetModel})! Latência: ${latency}ms`
    };
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    return {
      success: false,
      latency,
      message: `Erro de rede ou conexão: ${err.message}`
    };
  }
}
