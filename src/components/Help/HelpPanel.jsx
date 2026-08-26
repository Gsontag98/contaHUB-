import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  BookOpen,
  Zap,
  Layers,
  Cpu,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  ChevronRight,
  ChevronDown,
  UploadCloud,
  Network,
  FileSpreadsheet,
  SlidersHorizontal,
  Sparkles,
  Settings,
  Building2,
  Receipt,
  Download,
  Info,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function HelpPanel() {
  const { setActivePage, addToast } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('quickstart'); // 'quickstart', 'modules', 'passes', 'formats', 'faq'
  const [expandedFaqIndex, setExpandedFaqIndex] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addToast('Texto copiado para a área de transferência!', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const categories = [
    { id: 'quickstart', label: 'Início Rápido (Fluxo 1-2-3-4)', icon: Zap },
    { id: 'modules', label: 'Módulos do Sistema', icon: Layers },
    { id: 'passes', label: 'O Motor dos 7 Passos', icon: Cpu },
    { id: 'formats', label: 'Formatos de Arquivos & Layouts', icon: FileCheck },
    { id: 'faq', label: 'Perguntas Frequentes (FAQ)', icon: HelpCircle }
  ];

  const faqs = [
    {
      q: 'O que acontece quando uma nota fiscal foi emitida em um mês e paga em outro?',
      a: 'O módulo "Controle Fiscal & XMLs" é multi-período e acumulativo. Você pode subir as notas de Janeiro a Dezembro. Quando você importar o extrato bancário de Fevereiro ou Março, o motor de conciliação cruzará automaticamente o valor pago no banco com as parcelas abertas de meses anteriores, baixando a parcela exata e gerando o histórico contábil enriquecido com o número da parcela (ex: NF 1042 PARC 2/3).'
    },
    {
      q: 'Como desvincular um lançamento que conciliei por engano?',
      a: 'Na aba "Visão & Auditoria", alterne para a "Visão em Tabela". Você verá o botão "Desvincular" em cada linha conciliada. Ao clicar em desvincular, a movimentação volta para o status pendente e, caso tenha sido uma nota fiscal, a parcela reabre automaticamente no painel de Controle Fiscal.'
    },
    {
      q: 'Como cadastrar regras para o sistema preencher o Débito e Crédito automaticamente?',
      a: 'Você pode ir até a aba "Regras De-Para" e clicar em "Nova Regra", definindo palavras-chave (ex: "ENEL", "FOLHA", "TARIFA") e as contas contábeis correspondentes. Além disso, sempre que você editar as contas direto na tabela "Lançamentos (De-Para)" e salvar, o sistema aprende o padrão para as próximas conciliações!'
    },
    {
      q: 'Como funciona o isolamento entre empresas clientes?',
      a: 'Cada empresa cadastrada no seletor de empresas possui seu próprio banco de dados isolado no navegador (localStorage/IndexedDB). Seus planos de contas, regras De-Para, notas fiscais e conciliações ficam 100% segregados e nunca se misturam.'
    },
    {
      q: 'Qual o formato do arquivo TXT gerado para o Domínio Sistemas?',
      a: 'O contaHUB gera o arquivo TXT rigorosamente no padrão de importação de lançamentos do Domínio Sistemas (layout código da empresa, data DDMMAAAA, conta débito, conta crédito, valor sem vírgula/ponto e histórico contábil). É só ir no Domínio em "Utilitários > Importação > Importar Lançamentos" e selecionar o TXT baixado.'
    },
    {
      q: 'E se eu tiver um extrato bancário em PDF escaneado ou foto?',
      a: 'Utilize a aba "OCR Extratos & PDFs". Você pode enviar PDFs com múltiplas páginas e escolher processar em lote (2, 3, 5 ou 10 páginas por vez). A Inteligência Artificial extrai as colunas de Data, Histórico, Documento e Valor com 100% de precisão e envia direto para a conciliação.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header Banner */}
      <div className="card" style={{ padding: '20px 24px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)', border: '1px solid rgba(45, 212, 191, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--accent-glow)', color: 'var(--accent-cyan)' }}>
              <BookOpen size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                Central de Ajuda & Manual de Operação
              </h2>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Guia completo de conciliação bancária inteligente, controle fiscal multi-período e exportação Domínio
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="panel-search-box" style={{ maxWidth: '340px', width: '100%', height: '38px', background: 'var(--bg-surface)' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input panel-search-input"
              placeholder="Pesquisar por assunto, dúvida, regra ou módulo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ height: '36px', fontSize: '0.84rem' }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar Menu + Content View */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '18px', alignItems: 'start' }}>
        {/* Navigation Categories */}
        <div className="card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '6px 10px', letterSpacing: '0.5px' }}>
            Sumário do Manual
          </span>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id && !searchQuery;
            return (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.83rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{cat.label}</span>
              </button>
            );
          })}

          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} /> Dica de Produtividade
            </span>
            <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.4 }}>
              Suba todos os XMLs de notas fiscais do ano de uma só vez na aba <strong>Controle Fiscal</strong> para conciliar qualquer mês automaticamente!
            </p>
          </div>
        </div>

        {/* Category Content View */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* =========================================================================
              SEÇÃO 1: GUIA RÁPIDO (FLUXO 1-2-3-4-5)
             ========================================================================= */}
          {(activeCategory === 'quickstart' || searchQuery) && (
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={22} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Início Rápido: O Fluxo de Fechamento Contábil Perfeito
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#091414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Selecionar a Empresa Cliente</strong>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('upload')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        Ver Empresas <ArrowRight size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      No topo da tela ou na tela inicial, selecione ou cadastre a empresa cliente com seu CNPJ. Isso garante o isolamento contábil e o carregamento do plano de contas correto.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#091414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Importar os Arquivos (Extrato Bancário e/ou XMLs Fiscais)</strong>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('upload')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          Extrato Bancário
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setActivePage('fiscal')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                          Controle Fiscal XML
                        </button>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Envie o extrato bancário (.OFX, .XLSX ou .CSV) e as notas fiscais em XML (NF-e de compras/vendas, NFS-e de serviços). O sistema lê automaticamente valores, datas, fornecedores e parcelas.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#091414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Auditar a Conciliação no Grafo Visual e Tabela</strong>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('graph')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        Ir para Auditoria <ArrowRight size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      O motor executa os 7 passos em cascata. Você confere as ligações animadas no grafo interativo (com zoom e MiniMapa) e pode realizar vínculos ou desvínculos manuais em 1 clique.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-cyan)', color: '#091414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    4
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Classificar na Tabela De-Para (Contas & Históricos)</strong>
                      <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('transactions')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        Ver Tabela De-Para <ArrowRight size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Os lançamentos chegam com os nomes oficiais limpos dos fornecedores e números de notas/parcelas. As regras sugerem Débito e Crédito automaticamente.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div style={{ display: 'flex', gap: '14px', background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-success)', color: '#091414', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                    5
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Exportar o Arquivo TXT para o Domínio Sistemas</strong>
                      <button className="btn btn-primary btn-sm" onClick={() => setActivePage('transactions')} style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                        Gerar TXT Domínio <Download size={12} />
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      Clique em "Exportar Domínio TXT" para gerar o arquivo contábil oficial pronto para ser importado no Domínio Sistemas sem erros de layout.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SEÇÃO 2: GUIA COMPLETO MÓDULO POR MÓDULO
             ========================================================================= */}
          {(activeCategory === 'modules' || searchQuery) && (
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Layers size={22} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Detalhamento de Cada Módulo do contaHUB
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
                {/* Modulo 1: Importar Arquivos */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UploadCloud size={16} /> Importar Arquivos
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('upload')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Permite enviar o <strong>Extrato Bancário</strong> (cartão esquerdo) e a <strong>Base de Fornecedores/Razão</strong> (cartão direito). Possui mapeador inteligente de colunas, diagnóstico de erros e botão de colar dados do clipboard.
                  </p>
                </div>

                {/* Modulo 2: Controle Fiscal & XMLs */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Receipt size={16} /> Controle Fiscal & XMLs
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('fiscal')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Central acumulativa de notas do ano inteiro. Lê tags de parcelamento (<code style={{ color: 'var(--accent-cyan)' }}>&lt;dup&gt;</code>), calcula saldo devedor, controla quitações bancárias e exporta relatório em Excel.
                  </p>
                </div>

                {/* Modulo 3: Visao e Auditoria (Grafo) */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Network size={16} /> Visão & Auditoria (Grafo)
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('graph')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Visualização interativa das conexões entre o extrato bancário e os fornecedores/notas. Suporta 3 modos: <strong>Grafo Visual</strong>, <strong>Tabela de Vínculos</strong> e <strong>Grid Clássica</strong>.
                  </p>
                </div>

                {/* Modulo 4: Lançamentos De-Para */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileSpreadsheet size={16} /> Lançamentos (De-Para)
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('transactions')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Grid contábil para revisão dos lançamentos. Permite upload direto de planilhas de extrato, preenchimento em lote de contas débito/crédito, edição inline e exportação direta para o Domínio Sistemas.
                  </p>
                </div>

                {/* Modulo 5: Configurar Layout */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <SlidersHorizontal size={16} /> Configurar Layout
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('mapping')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Permite definir e salvar posições personalizadas de colunas contábeis para planilhas fora do padrão, salvando o layout por empresa cliente.
                  </p>
                </div>

                {/* Modulo 6: OCR Extratos & PDFs */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} /> OCR Extratos & PDFs
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('ocr')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Converte extratos em PDF ou imagens escaneadas em lançamentos estruturados com suporte a processamento página por página ou em lotes dinâmicos (2 a 15 páginas).
                  </p>
                </div>

                {/* Modulo 7: Plano de Contas */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={16} /> Plano de Contas
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('plano')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Armazena o plano de contas oficial da empresa importado do Domínio Sistemas para autocompletar contas analíticas e sintéticas.
                  </p>
                </div>

                {/* Modulo 8: Regras De-Para */}
                <div style={{ background: 'var(--bg-surface)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Settings size={16} /> Regras De-Para
                    </span>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActivePage('rules')} style={{ fontSize: '0.7rem', padding: '2px 6px' }}>Abrir</button>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Gerenciador de regras automáticas para associar palavras-chave nos históricos a contas de débito, crédito e códigos de histórico padrão.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SEÇÃO 3: O MOTOR DOS 7 PASSOS COM EXEMPLOS PRÁTICOS
             ========================================================================= */}
          {(activeCategory === 'passes' || searchQuery) && (
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu size={22} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Como Funciona o Motor de Conciliação em 7 Passos
                </h3>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                O algoritmo de conciliação do contaHUB opera em <strong>cascata estrita</strong>: os passos mais seguros (100% de precisão) são executados primeiro, reduzindo ambiguidades antes de acionar algoritmos de inteligência combinatória.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Passo 1 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 1: Match por Conta Contrapartida Domínio</strong>
                    <span className="badge badge-exact">Confiança: 100%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Cruza o código contábil de contrapartida/lote coincidente entre o razão e o banco com valor idêntico (R$).
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "TRANSF BANCARIA (R$ 1.200,50)" ↔ Razão: "PAGTO LOTE 5001 (R$ 1.200,50)"
                  </div>
                </div>

                {/* Passo 2 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 2: Match 100% Exato por CNPJ Completo (14 Dígitos)</strong>
                    <span className="badge badge-exact">Confiança: 100%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Compara o CNPJ completo do emitente/destinatário da nota fiscal ou PIX com o valor rigorosamente idêntico.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "PIX 12.345.678/0001-99 (R$ 350,00)" ↔ Fornecedor: "FORNECEDOR ABC LTDA (R$ 350,00)"
                  </div>
                </div>

                {/* Passo 3 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 3: Match por Raiz de CNPJ (Matriz / Filiais)</strong>
                    <span className="badge badge-exact">Confiança: 98%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Identifica grupos econômicos onde a nota foi emitida pela Matriz (0001) e paga pela filial (0002/0003) pelo mesmo valor.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "PGTO 98.765.432/0002-88 (R$ 480,00)" ↔ Razão: "MATRIZ 98.765.432/0001-00 (R$ 480,00)"
                  </div>
                </div>

                {/* Passo 4 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 4: Match por Regras De-Para Aprendidas</strong>
                    <span className="badge badge-exact">Confiança: 100%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Aplica regras personalizadas cadastradas pelo usuário ou aprendidas a partir de conciliações passadas.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "PAGTO ENEL SP (R$ 750,00)" ↔ Razão: "ENEL DISTRIBUICAO S/A (R$ 750,00)"
                  </div>
                </div>

                {/* Passo 5 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 5: Match por Número de Documento / NF</strong>
                    <span className="badge badge-exact">Confiança: 100%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Localiza o número da Nota Fiscal dentro da descrição do extrato ou no campo documento com valor exato.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "DOC 8832 (R$ 990,00)" ↔ Razão: "NF 8832 KALUNGA (R$ 990,00)"
                  </div>
                </div>

                {/* Passo 6 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 6: Razão Social Limpa & Similaridade Fonética (Fuzzy)</strong>
                    <span className="badge badge-text">Confiança: 60% a 98%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Remove sufixos corporativos (LTDA, S/A, ME, EPP) e calcula a sobreposição de tokens textuais com tolerância de até 30 dias.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "KALUNGA COM GRAFICA (R$ 620,00)" ↔ Razão: "KALUNGA COMERCIO E IND GRAFICA S/A (R$ 620,00)"
                  </div>
                </div>

                {/* Passo 6.5 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 6.5: Valor Exato no Mesmo Dia / FIFO (Descrições Genéricas)</strong>
                    <span className="badge badge-text">Confiança: 90% a 96%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Concilia lançamentos bancários que possuem apenas descrições genéricas (ex: "TED", "PIX", "PAGTO") com valor idêntico na mesma data.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "TED 123456 (R$ 400,00) em 01/07" ↔ Fornecedor: "SERVICOS CONTABEIS SILVA (R$ 400,00) em 01/07"
                  </div>
                </div>

                {/* Passo 7 */}
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', borderLeft: '4px solid var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Passo 7: Soma Combinatória N:1 (Subset Sum)</strong>
                    <span className="badge badge-subset">Confiança: 90%</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0' }}>
                    Detecta quando um único pagamento bancário quitou a soma exata de 2 a 6 notas fiscais diferentes.
                  </p>
                  <div style={{ background: 'var(--bg-card)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-teal)' }}>
                    Exemplo: Banco: "PAGTO LOTE (R$ 1.500,00)" ↔ Notas: NF 101 (R$ 500) + NF 102 (R$ 400) + NF 103 (R$ 600)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SEÇÃO 4: FORMATOS DE ARQUIVOS & LAYOUTS
             ========================================================================= */}
          {(activeCategory === 'formats' || searchQuery) && (
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileCheck size={22} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Formatos de Arquivos Suportados
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)' }}>🏦 Extratos Bancários (.OFX / .XLSX / .CSV)</strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                    Padrão bancário oficial com leitura direta de tags OFX (<code style={{ color: 'var(--accent-cyan)' }}>&lt;TRNAMT&gt;</code>, <code style={{ color: 'var(--accent-cyan)' }}>&lt;DTPOSTED&gt;</code>, <code style={{ color: 'var(--accent-cyan)' }}>&lt;MEMO&gt;</code>) ou colunas em Excel.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)' }}>📄 Notas Fiscais Eletrônicas (.XML)</strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                    Suporte completo a <strong>NF-e v4.00 / v3.10</strong> (Entrada e Saída), <strong>NFS-e de Serviços</strong> e <strong>CT-e de Fretes</strong> com extração de parcelas (<code style={{ color: 'var(--accent-cyan)' }}>&lt;dup&gt;</code>).
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)' }}>📑 Extratos em PDF Escaneados</strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                    Processamento por OCR com Inteligência Artificial para fotos, recibos e extratos bancários em PDF não editáveis.
                  </p>
                </div>

                <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <strong style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)' }}>💼 Exportação Domínio Sistemas (.TXT)</strong>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                    Layout contábil posicional oficial para importação automática nos módulos Contabilidade e Folha do Domínio Sistemas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SEÇÃO 5: PERGUNTAS FREQUENTES (FAQ)
             ========================================================================= */}
          {(activeCategory === 'faq' || searchQuery) && (
            <div className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HelpCircle size={22} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  Perguntas Frequentes (FAQ Contábil)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {faqs.map((faq, idx) => {
                  const isExpanded = expandedFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                      style={{
                        background: 'var(--bg-surface)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle)',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {faq.q}
                        </span>
                        <div style={{ color: 'var(--accent-cyan)', flexShrink: 0 }}>
                          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(0,0,0,0.1)' }}>
                          <p style={{ margin: '10px 0 0 0' }}>{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
