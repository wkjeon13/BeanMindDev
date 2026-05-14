import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, Coffee } from 'lucide-react';
import { useIAP } from '../../hooks/useIAP';

interface IAPPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (amount: number, transactionId?: string) => void;
    userId: string;
}

export default function IAPPaymentModal({ isOpen, onClose, onSuccess, userId }: IAPPaymentModalProps) {
    const { isConfigured, offerings, isLoading: iapLoading, error: iapError, purchasePackage } = useIAP(userId);
    const [step, setStep] = useState<'amount' | 'processing' | 'success'>('amount');
    const [selectedAmount, setSelectedAmount] = useState<number>(0);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const resetAndClose = () => {
        setStep('amount');
        setSelectedAmount(0);
        setErrorMessage(null);
        setIsPurchasing(false);
        onClose();
    };

    // Default mapping for fallback if offerings fail to load properly in Dev environment
    const fallbackAmounts = [
        { value: 1000, label: '1,000콩', price: '₩1,100' },
        { value: 5000, label: '5,000콩', price: '₩5,500' },
        { value: 10000, label: '10,000콩', price: '₩11,000' },
        { value: 50000, label: '50,000콩', price: '₩55,000' },
    ];

    const handlePurchase = async (pkg: any) => {
        setStep('processing');
        setIsPurchasing(true);
        setErrorMessage(null);
        
        try {
            // Check if we are running in a real environment with loaded offerings
            if (!pkg.identifier) {
                // Mock behavior for web/dev fallback
                setTimeout(() => {
                    setSelectedAmount(pkg.value);
                    setStep('success');
                    setTimeout(() => {
                        onSuccess(pkg.value, `mock-txn-${Date.now()}`);
                        resetAndClose();
                    }, 2000);
                }, 1500);
                return;
            }

            // Real RevenueCat purchase
            const result = await purchasePackage(pkg);
            
            if (result.success) {
                // Extract amount from package identifier (e.g. com.beanmind.beans.1000 -> 1000)
                const amountMatch = pkg.product.identifier.match(/\d+$/);
                const amount = amountMatch ? parseInt(amountMatch[0], 10) : 1000; // default 1000
                setSelectedAmount(amount);
                
                setStep('success');
                setTimeout(() => {
                    // Normally the transaction ID is in result.customerInfo or the backend gets webhook
                    onSuccess(amount, result.customerInfo?.originalAppUserId || `txn-${Date.now()}`);
                    resetAndClose();
                }, 2000);
            } else {
                if (result.error === 'USER_CANCELLED') {
                    setStep('amount');
                } else {
                    setErrorMessage(`결제 실패: ${result.error}`);
                    setStep('amount');
                }
            }
        } catch (e: any) {
            setErrorMessage(`결제 오류: ${e.message}`);
            setStep('amount');
        } finally {
            setIsPurchasing(false);
        }
    };

    if (!isOpen) return null;

    // Use actual offerings from RevenueCat or fallback for Web testing
    const availablePackages = offerings?.availablePackages || fallbackAmounts;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
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
                                    충전하실 상품을 선택해주세요.<br/>
                                    <span className="text-xs text-amber-500/80">안전한 스토어 인앱 결제로 진행됩니다.</span>
                                </p>
                                
                                {errorMessage && (
                                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                                        {errorMessage}
                                    </div>
                                )}

                                {iapLoading ? (
                                    <div className="py-8 flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-espresso-400 animate-spin mb-2" />
                                        <p className="text-xs text-espresso-400">스토어 상품 정보 불러오는 중...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        {availablePackages.map((pkg: any, idx: number) => {
                                            // Handle both RevenueCat Package object and Fallback mock object
                                            const isMock = !pkg.identifier;
                                            const label = isMock ? pkg.label : pkg.product.title;
                                            const price = isMock ? pkg.price : pkg.product.priceString;
                                            const beans = isMock ? pkg.value : parseInt(pkg.product.identifier.match(/\d+$/)?.[0] || '1000', 10);
                                            
                                            return (
                                                <button
                                                    key={pkg.identifier || idx}
                                                    onClick={() => handlePurchase(pkg)}
                                                    disabled={isPurchasing}
                                                    className="p-4 rounded-xl border flex flex-col items-center justify-center transition-all bg-espresso-950 border-espresso-800 text-espresso-300 hover:border-amber-500 hover:text-amber-400 active:scale-95 disabled:opacity-50"
                                                >
                                                    <span className="font-bold text-lg mb-1">{beans.toLocaleString()}콩</span>
                                                    <span className="text-xs font-medium text-espresso-400 bg-espresso-900 px-2 py-0.5 rounded-full mt-1">{price}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 'processing' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 flex flex-col items-center justify-center">
                                <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                                <h3 className="text-lg font-bold text-espresso-100 mb-2">결제 진행 중...</h3>
                                <p className="text-sm text-espresso-400 text-center">App Store / Play Store 와 안전하게<br/>통신하고 있습니다.</p>
                            </motion.div>
                        )}

                        {step === 'success' && (
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="py-12 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">결제 완료!</h3>
                                <p className="text-sm text-espresso-300 text-center">{selectedAmount.toLocaleString()}콩이 성공적으로<br/>충전되었습니다.</p>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
