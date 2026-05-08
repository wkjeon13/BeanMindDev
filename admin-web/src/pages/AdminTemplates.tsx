import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, ArrowLeft, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '@/utils/apiConfig';

export default function AdminTemplates() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [templateSubject, setTemplateSubject] = useState('');
    const [templateBody, setTemplateBody] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const token = localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const alertShown = useRef(false);

    // Admin Access Check
    useEffect(() => {
        if (!token) {
            navigate('/');
        } else if (currentUser.role !== 'ADMIN') {
            if (!alertShown.current) {
                alertShown.current = true;
                alert(t('admin_dashboard.error_login_req'));
            }
            navigate(-1);
        } else {
            fetchTemplate();
        }
    }, [navigate, token, currentUser.role, t]);

    const fetchTemplate = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/email-templates/STORE_APPROVAL`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setTemplateSubject(data.subject);
                    setTemplateBody(data.body);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        try {
            const res = await fetch(`${API_BASE}/api/admin/email-templates/STORE_APPROVAL`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject: templateSubject, body: templateBody, variables: 'storeName,ownerName' })
            });

            if (res.ok) {
                alert(t('admin_dashboard.tpl_alert_save_ok'));
            } else {
                const data = await res.json();
                alert(t('admin_dashboard.tpl_alert_save_fail', { error: data.error }));
            }
        } catch (err) {
            alert(t('admin_dashboard.error_server'));
        } finally {
            setIsSavingTemplate(false);
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 overflow-y-auto pb-safe font-sans">
            <div className="max-w-7xl mx-auto flex flex-col min-h-full">
                {/* Header */}
                <header className="px-6 py-6 pt-safe mt-4 shrink-0 border-b border-espresso-700">
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-espresso-900 flex items-center justify-center border border-coffee-100 text-coffee-600 hover:bg-espresso-950 transition-colors active:scale-95 shadow-sm">
                            <ArrowLeft size={20} />
                        </button>
                        <Shield className="text-espresso-50" size={28} />
                        <h1 className="text-2xl font-serif font-bold text-espresso-50 tracking-tight">이메일 템플릿</h1>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-coffee-400">
                            <div className="w-8 h-8 rounded-full border-4 border-espresso-700 border-t-coffee-900 animate-spin mb-4" />
                            <p className="font-medium">{t('admin_dashboard.loading')}</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
                                <h2 className="text-lg font-bold text-espresso-50">{t('admin_dashboard.tpl_title')}</h2>
                            </div>

                            <div className="bg-espresso-900 p-6 rounded-2xl border border-coffee-100 shadow-sm space-y-5">
                                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-800 break-keep">
                                    <span className="font-bold flex items-center gap-2 mb-2"><Mail size={16} /> {t('admin_dashboard.tpl_guide_title')}</span>
                                    {t('admin_dashboard.tpl_guide_desc')}<br />
                                    <code className="bg-orange-100 text-orange-900 px-1 py-0.5 rounded font-mono font-bold mt-1 inline-block">{'{{storeName}}'}</code> : {t('admin_dashboard.tpl_guide_var_store')}<br />
                                    <code className="bg-orange-100 text-orange-900 px-1 py-0.5 rounded font-mono font-bold mt-1 inline-block">{'{{ownerName}}'}</code> : {t('admin_dashboard.tpl_guide_var_owner')}
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-sm font-bold text-espresso-50">{t('admin_dashboard.tpl_label_subject')}</label>
                                    <input
                                        type="text"
                                        value={templateSubject}
                                        onChange={(e) => setTemplateSubject(e.target.value)}
                                        placeholder={t('admin_dashboard.tpl_ph_subject')}
                                        className="w-full bg-espresso-950 border border-espresso-700 h-12 px-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[14px]"
                                    />
                                </div>

                                <div className="space-y-2 flex-1 flex flex-col">
                                    <label className="block text-sm font-bold text-espresso-50">{t('admin_dashboard.tpl_label_body')}</label>
                                    <textarea
                                        value={templateBody}
                                        onChange={(e) => setTemplateBody(e.target.value)}
                                        placeholder={t('admin_dashboard.tpl_ph_body')}
                                        className="w-full flex-1 min-h-[250px] bg-espresso-950 border border-espresso-700 p-4 rounded-xl focus:ring-2 focus:ring-coffee-700 outline-none text-[14px] resize-none"
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={handleSaveTemplate}
                                        disabled={isSavingTemplate || !templateSubject.trim() || !templateBody.trim()}
                                        className="bg-coffee-900 text-espresso-50 px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-coffee-800 transition-colors"
                                    >
                                        {isSavingTemplate ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> : <Save size={18} />}
                                        {t('admin_dashboard.tpl_btn_save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
