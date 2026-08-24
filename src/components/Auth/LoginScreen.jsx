import React, { useState } from 'react';
import { Lock, Mail, User, ArrowRight, Sparkles, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import useAppStore from '../../store/useAppStore.js';

export default function LoginScreen() {
  const { login, register, addToast } = useAppStore();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Por favor, informe seu nome completo.');
        if (!email.trim() || !email.includes('@')) throw new Error('Informe um e-mail válido.');
        if (!password || password.length < 4) throw new Error('A senha deve conter no mínimo 4 caracteres.');

        await register(name, email, password);
        addToast(`Conta criada com sucesso! Bem-vindo, ${name.trim()}!`, 'success');
      } else {
        if (!email.trim()) throw new Error('Informe seu e-mail de acesso.');
        if (!password) throw new Error('Informe sua senha.');

        await login(email, password);
        addToast('Login realizado com sucesso!', 'success');
      }
    } catch (err) {
      setError(err.message || 'Erro ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-container">
      {/* Background Glow Elements */}
      <div className="login-glow-top" />
      <div className="login-glow-bottom" />

      <div className="login-card glass-card">
        {/* Brand & Logo */}
        <div className="login-header">
          <div className="login-brand-logo-wrapper">
            <img src="./logo_contahub.svg" alt="contaHUB" className="login-brand-logo" />
          </div>
          <h1 className="login-title">contaHUB</h1>
          <p className="login-subtitle">
            Conciliação Contábil & Automação Inteligente Domínio Sistemas
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Acessar Sistema
          </button>
          <button
            type="button"
            className={`login-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Criar Nova Conta
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="login-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div className="input-with-icon">
                <User size={18} className="field-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  autoFocus={mode === 'register'}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div className="input-with-icon">
              <Mail size={18} className="field-icon" />
              <input
                type="email"
                className="form-input"
                placeholder="seu.email@contabilidade.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoFocus={mode === 'login'}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-with-icon">
              <Lock size={18} className="field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>Processando...</span>
            ) : mode === 'login' ? (
              <>
                <span>Entrar no contaHUB</span>
                <ArrowRight size={18} />
              </>
            ) : (
              <>
                <span>Criar Conta e Acessar</span>
                <Sparkles size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="login-footer">
          <div className="security-badge">
            <ShieldCheck size={15} color="var(--accent-cyan)" />
            <span>Ambiente 100% Local e Seguro (Electron Offline)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
