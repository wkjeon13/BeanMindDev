import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Loader2 } from 'lucide-react';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                const errMsg = typeof data.error === 'object' ? data.error?.message : data.error;
                throw new Error(errMsg || '로그인에 실패했습니다.');
            }

            // Spring Boot backend returns payload inside 'data' field
            const payload = data.data || data;

            if (!payload || !payload.user) {
                throw new Error('올바르지 않은 사용자 데이터 형식입니다.');
            }

            if (payload.user.role !== 'ADMIN' && payload.user.role !== 'MODERATOR') {
                throw new Error('관리자 권한이 없습니다.');
            }

            localStorage.setItem('token', payload.token);
            localStorage.setItem('user', JSON.stringify(payload.user));
            
            // Redirect to dashboard and refresh state
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-espresso-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-espresso-900 border border-espresso-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none"></div>
                
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-500/20 shadow-inner">
                        <Shield size={32} className="text-amber-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">BeanMind Admin</h1>
                    <p className="text-espresso-400 mt-2 text-sm">관리자 계정으로 로그인하세요</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-xl text-sm text-center font-medium animate-in fade-in">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-espresso-300 mb-1.5 ml-1">이메일</label>
                        <div className="relative">
                            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-500" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full bg-espresso-950/50 text-espresso-50 border border-espresso-700 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium" 
                                placeholder="admin@example.com"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-espresso-300 mb-1.5 ml-1">비밀번호</label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-espresso-500" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full bg-espresso-950/50 text-espresso-50 border border-espresso-700 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all font-medium" 
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold text-lg py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Shield size={20} />}
                        {isLoading ? '인증 중...' : '관리자 로그인'}
                    </button>
                </form>
            </div>
        </div>
    );
}
