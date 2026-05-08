import React, { useState, useEffect } from 'react';
import { API_BASE } from '../utils/apiConfig';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Coffee, Sparkles, Edit2, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { formatLocalTime } from '../utils/dateFormatter';

export default function PrescriptionHistory() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const [prescriptions, setPrescriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        const fetchPrescriptions = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/profile', { replace: true });
                    return;
                }
                const response = await fetch(`${API_BASE}/api/users/prescriptions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setPrescriptions(data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPrescriptions();
    }, [navigate]);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('history.confirm_delete'))) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/prescriptions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setPrescriptions(prev => prev.filter(p => p.id !== id));
            } else {
                alert(t('history.delete_fail'));
            }
        } catch (err) {
            console.error(err);
            alert(t('history.error'));
        }
    };

    const handleSaveEdit = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/api/users/prescriptions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: editTitle })
            });
            if (response.ok) {
                setPrescriptions(prev => prev.map(p => p.id === id ? { ...p, title: editTitle } : p));
                setEditingId(null);
            } else {
                alert(t('history.edit_fail'));
            }
        } catch (err) {
            console.error(err);
            alert(t('history.error'));
        }
    };

    return (
        <div className="h-full w-full bg-espresso-950 flex flex-col font-sans">
            <header className="px-6 py-4 pt-safe flex items-center bg-espresso-900 border-b border-coffee-100 shrink-0 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-espresso-100 hover:bg-espresso-800 rounded-full transition-colors active:scale-95">
                    <ChevronLeft size={28} />
                </button>
                <h1 className="font-serif font-bold text-xl text-espresso-50 ml-2">{t('history.title')}</h1>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-800"></div>
                    </div>
                ) : prescriptions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 opacity-60">
                        <Coffee size={48} className="text-coffee-300 mb-4" />
                        <p className="font-medium text-coffee-600" dangerouslySetInnerHTML={{ __html: t('history.empty_message') }}></p>
                        <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 bg-espresso-700 text-espresso-100 rounded-xl font-bold text-sm">
                            {t('history.start_curator')}
                        </button>
                    </div>
                ) : (
                    <AnimatePresence>
                        {prescriptions.map((p, idx) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                                className="bg-espresso-900 p-5 rounded-2xl border border-coffee-100 shadow-sm"
                            >
                                <div 
                                    className="flex items-start justify-between gap-2 cursor-pointer"
                                    onClick={() => {
                                        if (editingId !== p.id) toggleExpand(p.id);
                                    }}
                                >
                                    <div className="flex-1 truncate">
                                        {editingId === p.id ? (
                                            <div className="flex items-center gap-2 mb-1 w-full" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={(e) => setEditTitle(e.target.value)}
                                                    className="flex-1 border border-espresso-700 rounded-lg px-2 py-1.5 text-[15px] font-bold text-espresso-50 bg-espresso-900 focus:outline-none focus:ring-1 focus:ring-coffee-500"
                                                    autoFocus
                                                />
                                                <button onClick={() => handleSaveEdit(p.id)} className="p-1.5 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg shrink-0"><Check size={16} /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg shrink-0"><X size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 mb-1 pl-1">
                                                <h3 className="font-bold text-espresso-50 text-[17px] leading-tight truncate">{p.title || t('history.default_title')}</h3>
                                                <div className="flex items-center gap-1 shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditTitle(p.title || t('history.default_title')); }} className="p-1 text-espresso-300 hover:bg-espresso-800 rounded cursor-pointer">
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-1 text-red-400 hover:bg-red-50 rounded cursor-pointer">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        <p className="text-[13px] pl-1 font-bold text-coffee-600 leading-tight truncate">{p.beanName}</p>
                                        <p className="text-[11px] pl-1 font-medium text-coffee-400 mt-0.5 uppercase tracking-wide truncate">{p.brand}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2 shrink-0 mt-0.5 ml-2">
                                        <div className="w-8 h-8 rounded-full bg-espresso-800 flex items-center justify-center text-espresso-200 shadow-inner shrink-0">
                                            <Sparkles size={14} />
                                        </div>
                                        <div className={`p-1 rounded-full bg-espresso-950/50 transition-transform duration-300 shrink-0 ${expandedIds.has(p.id) ? 'rotate-180' : ''}`}>
                                            <ChevronDown size={18} className="text-coffee-400" />
                                        </div>
                                    </div>
                                </div>
                                <AnimatePresence initial={false}>
                                    {expandedIds.has(p.id) && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-4">
                                                <div className="bg-espresso-950 p-4 rounded-xl text-espresso-100 text-[13px] leading-relaxed break-keep tracking-tight shadow-inner">
                                                    <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:text-espresso-50 prose-p:text-espresso-200 prose-p:font-medium prose-p:leading-relaxed prose-strong:text-espresso-50 prose-hr:border-espresso-700 prose-li:marker:text-espresso-300">
                                                        <ReactMarkdown
                                                            components={{
                                                                strong: ({ node, ...props }) => <strong {...props} className="text-amber-600 font-bold bg-amber-500/10 px-1 py-0.5 rounded" />,
                                                                a: ({ node, ...props }) => {
                                                                    const href = props.href || '';
                                                                    const isAbsolute = href.startsWith('http://') || href.startsWith('https://');
                                                                    const safeHref = isAbsolute ? href : `https://${href}`;
                                                                    return (
                                                                        <a
                                                                            {...props}
                                                                            href={safeHref}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-pink-600 underline decoration-pink-300 hover:decoration-pink-500 underline-offset-2 font-bold px-1 transition-all"
                                                                        />
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            {p.aiComment}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                                <div className="mt-3 pr-1 text-right">
                                                    <span className="text-[11px] font-bold tracking-wider text-coffee-400">
                                                        {formatLocalTime(p.createdAt, 'yyyy. MM. dd. HH:mm')}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}
