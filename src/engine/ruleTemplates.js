/**
 * Biblioteca de Modelos de Regras De-Para Contábeis Prontas do contaHUB
 * Modelos padronizados para as operações contábeis e bancárias mais frequentes.
 */

export const RULE_CATEGORIES = [
  { id: 'all', name: 'Todos os Modelos', icon: 'Sparkles' },
  { id: 'banco', name: 'Tarifas & Bancos', icon: 'Landmark' },
  { id: 'impostos', name: 'Impostos & Guias', icon: 'FileText' },
  { id: 'concessionarias', name: 'Concessionárias (Luz/Água/Net)', icon: 'Zap' },
  { id: 'combustivel', name: 'Combustível & Transporte', icon: 'Fuel' },
  { id: 'folha', name: 'Folha & Benefícios', icon: 'Users' },
  { id: 'aplicacoes', name: 'Rendimentos & Aplicações', icon: 'TrendingUp' }
];

export const PREDEFINED_RULE_TEMPLATES = [
  // -------------------------------------------------------------
  // 1. TARIFAS E SERVIÇOS BANCÁRIOS
  // -------------------------------------------------------------
  {
    id: 'tpl_tarifa_pacote_mensal',
    category: 'banco',
    name: 'Tarifas e Pacotes Mensais de Conta Corrente',
    description: 'Classifica débitos de tarifas de manutenção de conta, cestas de serviços e pacotes mensais bancários.',
    mustContainAll: ['TARIFA'],
    mayContainAny: ['MENSALIDADE', 'PACOTE', 'CESTA', 'MANUTENCAO', 'SERVICO'],
    mustNotContain: ['ESTORNO', 'DEVOLUCAO', 'CANCELAMENTO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3101',
    suggestedAccountName: 'Despesas Bancárias / Tarifas de Conta',
    historicCode: '450',
    historicTextTemplate: 'TARIFA BANCARIA REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_tarifa_ted_pix',
    category: 'banco',
    name: 'Taxas de Transferência (PIX / TED / DOC / Boletos)',
    description: 'Classifica tarifas unitárias de envio de PIX PJ, emissão e liquidação de boletos ou transferências.',
    mustContainAll: ['TARIFA'],
    mayContainAny: ['PIX', 'TED', 'DOC', 'BOLETO', 'COBRANCA', 'LIQUIDACAO'],
    mustNotContain: ['ESTORNO', 'DEVOLUCAO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3101',
    suggestedAccountName: 'Despesas com Tarifas Bancárias',
    historicCode: '450',
    historicTextTemplate: 'TARIFA SERVICOS BANCARIOS REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_tarifa_estorno',
    category: 'banco',
    name: 'Estorno / Devolução de Tarifas Bancárias',
    description: 'Classifica créditos referentes a estornos ou cancelamentos de tarifas cobradas indevidamente.',
    mustContainAll: ['ESTORNO'],
    mayContainAny: ['TARIFA', 'TAXA', 'PACOTE', 'IOF'],
    mustNotContain: [],
    valueType: 'any',
    signalCondition: 'credit_only',
    ruleType: 'dynamic',
    targetAccount: '3101',
    suggestedAccountName: 'Recuperação de Despesas Bancárias',
    historicCode: '450',
    historicTextTemplate: 'ESTORNO DE TARIFA BANCARIA REF [HISTORICO] - DATA [DATA]'
  },

  // -------------------------------------------------------------
  // 2. IMPOSTOS E GUIAS GOVERNAMENTAIS
  // -------------------------------------------------------------
  {
    id: 'tpl_imposto_darf',
    category: 'impostos',
    name: 'Pagamento de DARF (IRRF, PIS, COFINS, IRPJ, CSLL)',
    description: 'Identifica guias federais de DARF recolhidas pelo banco.',
    mustContainAll: ['DARF'],
    mayContainAny: ['PAGTO', 'PGTO', 'MINISTERIO', 'RECEITA', 'FEDERAL'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '2105',
    suggestedAccountName: 'Impostos Federais a Recolher',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO GUIA DARF REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_imposto_das_simples',
    category: 'impostos',
    name: 'Pagamento de DAS (Simples Nacional)',
    description: 'Identifica o recolhimento mensal da guia do Simples Nacional.',
    mustContainAll: ['DAS'],
    mayContainAny: ['SIMPLES', 'NACIONAL', 'PGTO', 'PAGTO'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '2106',
    suggestedAccountName: 'Simples Nacional a Recolher',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO GUIA SIMPLES NACIONAL DAS - DATA [DATA]'
  },
  {
    id: 'tpl_imposto_fgts',
    category: 'impostos',
    name: 'Pagamento de FGTS / GRF / FGTS Digital',
    description: 'Classifica o recolhimento mensal e rescisório do Fundo de Garantia.',
    mustContainAll: ['FGTS'],
    mayContainAny: ['GRF', 'DIGITAL', 'CAIXA', 'PAGTO', 'PGTO'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '2107',
    suggestedAccountName: 'FGTS a Recolher',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO GUIA FGTS REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_imposto_gps_inss',
    category: 'impostos',
    name: 'Pagamento de GPS / INSS / Previdência Social',
    description: 'Classifica a guia de previdência social recolhida pela empresa.',
    mustContainAll: ['GPS'],
    mayContainAny: ['INSS', 'PREVIDENCIA', 'PAGTO', 'PGTO'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '2108',
    suggestedAccountName: 'INSS a Recolher',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO GUIA GPS/INSS REF [HISTORICO] - DATA [DATA]'
  },

  // -------------------------------------------------------------
  // 3. CONCESSIONÁRIAS E CONTAS DE CONSUMO
  // -------------------------------------------------------------
  {
    id: 'tpl_concess_energia',
    category: 'concessionarias',
    name: 'Energia Elétrica (Enel, CPFL, Cemig, Copel, Light, Neoenergia)',
    description: 'Identifica contas de luz das principais distribuidoras de energia do Brasil.',
    mustContainAll: [],
    mayContainAny: ['ENEL', 'CPFL', 'CEMIG', 'COPEL', 'LIGHT', 'NEOENERGIA', 'ELEKTRO', 'ENERGISA', 'CEEE'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3301',
    suggestedAccountName: 'Despesas com Energia Elétrica',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO CONTA DE ENERGIA ELETRICA REF [HISTORICO] - DOC [DOC]'
  },
  {
    id: 'tpl_concess_agua',
    category: 'concessionarias',
    name: 'Água e Esgoto (Sabesp, Copasa, Sanepar, Corsan, Embasa)',
    description: 'Identifica pagamentos para companhias estaduais e municipais de saneamento.',
    mustContainAll: [],
    mayContainAny: ['SABESP', 'COPASA', 'SANEPAR', 'CORSAN', 'EMBASA', 'CEDAE', 'SANESUL', 'CAESB'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3302',
    suggestedAccountName: 'Despesas com Água e Esgoto',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO CONTA DE AGUA E ESGOTO REF [HISTORICO] - DOC [DOC]'
  },
  {
    id: 'tpl_concess_telecom',
    category: 'concessionarias',
    name: 'Telefonia e Internet (Vivo, Claro, TIM, Embratel, Oi)',
    description: 'Identifica faturas de internet fibra, planos corporativos e linhas telefônicas.',
    mustContainAll: [],
    mayContainAny: ['VIVO', 'TELEFONICA', 'CLARO', 'TIM', 'EMBRATEL', 'OI MOVEL', 'ALGAR'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3303',
    suggestedAccountName: 'Despesas com Telefonia e Internet',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO CONTA TELEFONIA E INTERNET REF [HISTORICO] - DOC [DOC]'
  },

  // -------------------------------------------------------------
  // 4. COMBUSTÍVEL, PEDÁGIOS E TRANSPORTE
  // -------------------------------------------------------------
  {
    id: 'tpl_combustivel_postos',
    category: 'combustivel',
    name: 'Combustível e Abastecimento de Veículos (Postos)',
    description: 'Classifica despesas com gasolina, diesel e etanol em postos de combustível.',
    mustContainAll: [],
    mayContainAny: ['POSTO', 'AUTO POSTO', 'IPIRANGA', 'SHELL', 'PETROBRAS', 'VIBRA', 'ALE COMBUSTIVEIS'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3401',
    suggestedAccountName: 'Despesas com Combustíveis e Lubrificantes',
    historicCode: '10',
    historicTextTemplate: 'DESPESA COM COMBUSTIVEL REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_transporte_pedagio',
    category: 'combustivel',
    name: 'Pedágios e Estacionamentos (Sem Parar, Veloe, ConectCar, MoveMais)',
    description: 'Identifica recargas e faturas de tags eletrônicas de pedágio e estacionamentos.',
    mustContainAll: [],
    mayContainAny: ['SEM PARAR', 'VELOE', 'CONECTCAR', 'MOVEMAIS', 'ESTAPAR', 'AUTOPISTA'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3402',
    suggestedAccountName: 'Despesas com Pedágios e Estacionamento',
    historicCode: '10',
    historicTextTemplate: 'DESPESA COM PEDAGIO E ESTACIONAMENTO REF [HISTORICO]'
  },
  {
    id: 'tpl_transporte_app',
    category: 'combustivel',
    name: 'Aplicativos de Transporte Corporativo (Uber, 99)',
    description: 'Classifica corridas e despesas com transporte por aplicativo.',
    mustContainAll: [],
    mayContainAny: ['UBER', '99APP', '99 TAXI', 'CABIFY'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3403',
    suggestedAccountName: 'Despesas com Transporte de Funcionários',
    historicCode: '10',
    historicTextTemplate: 'DESPESA COM TRANSPORTE POR APLICATIVO REF [HISTORICO]'
  },

  // -------------------------------------------------------------
  // 5. FOLHA DE PAGAMENTO E BENEFÍCIOS
  // -------------------------------------------------------------
  {
    id: 'tpl_folha_salarios',
    category: 'folha',
    name: 'Pagamento de Salários e Folha Mensal',
    description: 'Classifica pagamentos líquidos de salários e folha de pagamento via crédito em conta.',
    mustContainAll: [],
    mayContainAny: ['SALARIO', 'FOLHA PAGAMENTO', 'PGTO SALARIOS', 'PAGTO FOLHA', 'CREDITO SALARIO'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '2101',
    suggestedAccountName: 'Salários a Pagar',
    historicCode: '10',
    historicTextTemplate: 'PAGAMENTO DE SALARIOS REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_folha_beneficios',
    category: 'folha',
    name: 'Benefícios (Vale Refeição, Alimentação e Transporte)',
    description: 'Classifica recargas de cartões de benefícios de colaboradores.',
    mustContainAll: [],
    mayContainAny: ['ALELO', 'SODEXO', 'TICKET', 'VR BENEFICIOS', 'FLASH BENEFICIOS', 'SWILE', 'CAJU'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'debit_only',
    ruleType: 'dynamic',
    targetAccount: '3501',
    suggestedAccountName: 'Despesas com Benefícios a Empregados',
    historicCode: '10',
    historicTextTemplate: 'DESPESA COM RECARGA DE BENEFICIOS REF [HISTORICO]'
  },

  // -------------------------------------------------------------
  // 6. RENDIMENTOS E APLICAÇÕES FINANCEIRAS
  // -------------------------------------------------------------
  {
    id: 'tpl_aplicacao_rendimento',
    category: 'aplicacoes',
    name: 'Rendimento de Aplicação Financeira (CDB, RDB, DI, Poupança)',
    description: 'Classifica créditos de juros e rendimentos líquidos de investimentos em renda fixa.',
    mustContainAll: [],
    mayContainAny: ['RENDIMENTO', 'REMUNERACAO APLICACAO', 'REND APLICACAO', 'JUROS APLIC', 'REND CDB', 'REND RDB'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'credit_only',
    ruleType: 'dynamic',
    targetAccount: '4101',
    suggestedAccountName: 'Receitas Financeiras / Rendimentos de Aplicação',
    historicCode: '450',
    historicTextTemplate: 'RENDIMENTO DE APLICACAO FINANCEIRA REF [HISTORICO] - DATA [DATA]'
  },
  {
    id: 'tpl_aplicacao_resgate',
    category: 'aplicacoes',
    name: 'Resgate de Aplicação Financeira para Conta Corrente',
    description: 'Classifica transferências e resgates de capital de investimentos para a conta bancária.',
    mustContainAll: ['RESGATE'],
    mayContainAny: ['APLICACAO', 'CDB', 'RDB', 'INVESTIMENTO', 'FUNDOS'],
    mustNotContain: ['ESTORNO'],
    valueType: 'any',
    signalCondition: 'credit_only',
    ruleType: 'dynamic',
    targetAccount: '1102',
    suggestedAccountName: 'Aplicações Financeiras de Liquidez Imediata',
    historicCode: '10',
    historicTextTemplate: 'RESGATE DE APLICACAO FINANCEIRA REF [HISTORICO] - DATA [DATA]'
  }
];
