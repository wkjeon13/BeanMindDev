import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, CheckCircle2, Loader2, Coffee } from 'lucide-react';

interface MockPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number) => void;
}

export default function MockPaymentModal({ isOpen, onClose, onSuccess }: MockPaymentModalProps) {
    const [amount, setAmount] = useState<number>(0);
    const [step, setStep] = useState<'amount' | 'card' | 'processing' | 'success'>('amount');
    
    // Mock Form State
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');

    const amounts = [
        { value: 1000, label: '1,000콩', price: '1,000원' },
        { value: 5000, label: '5,000콩', price: '5,000원' },
        { value: 10000, label: '10,000콩', price: '10,000원' },
        { value: 50000, label: '50,000콩', price: '50,000원' },
    ];

    const resetAndClose = () => {
        setAmount(0);
        setStep('amount');
        setCardNumber('');
        setExpiry('');
        setCvc('');
        onClose();
    };

    const handleMockPayment = () => {
        if (!cardNumber || !expiry || !cvc) {
            alert('카드 정보를 시뮬레이션 용으로 입력해주세요.');
            return;
        }
        
        setStep('processing');
        
        // Mock PG delay (2 seconds)
        setTimeout(() => {
            setStep('success');
            setTimeout(() => {
                onSuccess(amount);
                resetAndClose();
            }, 1500); // Close after showing success for 1.5s
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="w-full max-w-sm bg-espresso-900 rounded-2xl shadow-2xl border border-espresso-800 overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-espresso-800 flex justify-between items-center bg-espresso-950/50">
                        <h2 className="text-lg font-bold text-espresso-50 flex items-center gap-2">
                            <Coffee className="w-5 h-5 text-amber-500" />
                            커피콩 충전
                        </h2>
                        {step !== 'processing' && (
                            <button onClick={resetAndClose} className="text-espresso-400 hover:text-espresso-200 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                        {step === 'amount' && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                <p className="text-sm text-espresso-300 mb-4 px-1">
                                    충전하실 금액을 선택해주세요. (1원 = 1콩)
                                </p>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {amounts.map((item) => (
                                        <button
                                            key={item.value}
                                            onClick={() => setAmount(item.value)}
                                            className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${
                                                amount === item.value 
                                                ? 'bg-amber-500/20 border-amber-500 text-amber-400' 
                                                : 'bg-espresso-950 border-espresso-800 text-espresso-300 hover:border-espresso-600'
                                            }`}
                                        >
                                            <span className="font-bold text-lg mb-1">{item.label}</span>
                                            <span className="text-xs opacity-70">{item.price}</span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={amount === 0}
                                    onClick={() => setStep('card')}
                                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 disabled:bg-espresso-800 disabled:text-espresso-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-900/20 disabled:shadow-none"
                                >
                                    다음 단계로
                                </button>
                            </motion.div>
                        )}

                        {step === 'card' && (
                            <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                                <div className="mb-5 p-4 bg-espresso-950 rounded-xl flex justify-between items-center font-bold">
                                    <span className="text-espresso-300">결제 금액</span>
                                    <span className="text-amber-400 text-xl">{amount.toLocaleString()}원</span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-xs font-medium text-espresso-400 mb-1.5 ml-1">카드 번호 (Mock)</label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-espresso-500" />
                                            <input 
                                                type="text" 
                                                placeholder="0000-0000-0000-0000"
                                                value={cardNumber}
                                                onChange={e => setCardNumber(e.target.value)}
                                                className="w-full bg-espresso-800 border border-espresso-700 rounded-xl py-3 pl-10 pr-4 text-espresso-100 placeholder-espresso-600 focus:outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-espresso-400 mb-1.5 ml-1">유효 기간</label>
                                            <input 
                                                type="text" 
                                                placeholder="MM/YY"
                                                value={expiry}
                                                onChange={e => setExpiry(e.target.value)}
                                                className="w-full bg-espresso-800 border border-espresso-700 rounded-xl py-3 px-4 text-espresso-100 placeholder-espresso-600 focus:outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-espresso-400 mb-1.5 ml-1">CVC (3자리)</label>
                                            <input 
                                                type="password" 
                                                placeholder="***"
                                                value={cvc}
                                                maxLength={3}
                                                onChange={e => setCvc(e.target.value)}
                                                className="w-full bg-espresso-800 border border-espresso-700 rounded-xl py-3 px-4 text-espresso-100 placeholder-espresso-600 focus:outline-none focus:border-amber-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setStep('amount')}
                                        className="flex-shrink-0 px-4 py-3.5 bg-espresso-800 hover:bg-espresso-700 text-espresso-200 font-bold rounded-xl transition-colors"
                                    >
                                        뒤로
                                    </button>
                                    <button
                                        onClick={handleMockPayment}
                                        className="flex-1 py-3.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-amber-900/20"
                                    >
                                        결제하기 (Test)
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 'processing' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                                <h3 className="text-lg font-bold text-espresso-100 mb-2">결제 진행 중...</h3>
                                <p className="text-sm text-espresso-400 text-center">PG사와 통신하고 있습니다.<br/>잠시만 기다려주세요.</p>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">결제 완료!</h3>
                                <p className="text-sm text-espresso-300 text-center">{amount.toLocaleString()}콩이 성공적으로<br/>충전되었습니다.</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
