import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Coffee, Shield, ArrowRight, Globe } from 'lucide-react';

export default function HostLogin() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'ko' ? 'en' : 'ko';
    i18n.changeLanguage(nextLang);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg(t('login.err_empty', '이메일과 비밀번호를 입력해주세요.'));
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        
        // 점주(OWNER) 또는 관리자(ADMIN) 권한 체크
        const role = (data.user?.role || '').toUpperCase();
        if (role === 'OWNER' || role === 'ADMIN' || role === 'HOST') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          navigate('/');
        } else {
          setErrorMsg(t('login.err_no_permission', '점주 권한이 없는 계정입니다. B2B 파트너 전용 계정으로 로그인해 주세요.'));
        }
      } else {
        const err = await res.json();
        setErrorMsg(err.message || t('login.err_fail', '이메일 또는 비밀번호가 올바르지 않습니다.'));
      }
    } catch (e) {
      setErrorMsg(t('login.err_network', '서버 통신에 실패했습니다. 네트워크를 확인해 주세요.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-espresso-950 text-espresso-50 flex items-center justify-center font-sans antialiased relative overflow-hidden px-4">
      {/* 백그라운드 프리미엄 은은한 골드 그라데이션 광원 */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#D4AF37]/5 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#8c8c73]/5 rounded-full filter blur-[120px] pointer-events-none" />

      {/* 다국어 언어 전환 버튼 */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 px-3.5 py-2 bg-espresso-900 hover:bg-espresso-800 border border-espresso-800 text-espresso-300 text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <Globe size={14} />
        <span className="font-bold">{i18n.language === 'ko' ? 'English' : '한국어'}</span>
      </button>

      {/* 로그인 박스 */}
      <div className="w-full max-w-[460px] bg-espresso-900/40 backdrop-blur-md border border-espresso-800/80 p-8 sm:p-10 rounded-[32px] shadow-2xl space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/30 text-amber-500 mb-2">
            <Coffee size={28} />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h2 className="font-serif font-black text-2xl tracking-tight text-espresso-50">
              BeanMind <span className="text-[#D4AF37]">Host Portal</span>
            </h2>
            <span className="bg-amber-600/10 border border-amber-500/20 text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase">B2B</span>
          </div>
          <p className="text-xs text-espresso-300">
            {t('login.sub_title', '디지털 스탬프 및 실시간 웹 POS 매장 제어 시스템')}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-2xl text-xs leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-espresso-200 block">
              {t('login.lbl_email', '이메일 주소')}
            </label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="owner@beanmind.com"
              className="w-full bg-espresso-900/60 border border-espresso-800/80 rounded-2xl px-4 py-3.5 text-sm text-espresso-50 outline-none focus:border-[#D4AF37]/50 placeholder-espresso-500 transition-colors font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-espresso-200 block">
              {t('login.lbl_password', '비밀번호')}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-espresso-900/60 border border-espresso-800/80 rounded-2xl px-4 py-3.5 text-sm text-espresso-50 outline-none focus:border-[#D4AF37]/50 placeholder-espresso-500 transition-colors font-mono"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 bg-[#D4AF37] hover:bg-amber-500 text-espresso-950 font-black text-sm rounded-2xl transition-all shadow-lg active:scale-98 cursor-pointer flex justify-center items-center gap-1.5 mt-2"
          >
            {isLoading ? t('login.btn_logging', '인증 진행 중...') : (
              <>
                {t('login.btn_submit', '점주 포털 로그인')}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-espresso-800/60 flex items-center justify-between text-[11px] text-espresso-400">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-amber-500/70" />
            {t('login.secure_status', '보안 커넥션 암호화 활성')}
          </span>
          <span>© {new Date().getFullYear()} BeanMind Inc.</span>
        </div>
      </div>
    </div>
  );
}
