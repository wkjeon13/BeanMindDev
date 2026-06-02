import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Coins, DollarSign, Filter, Info, ShieldAlert, Sparkles } from 'lucide-react';

interface PaymentUser {
  id: string;
  email: string;
  nickname: string;
  pointBalance: number;
}

interface PaymentTransaction {
  id: string;
  userId: string;
  storeTransactionId: string;
  amount: number;
  platform: string;
  productId: string;
  createdAt: string;
  isCancelled: boolean;
  user: PaymentUser | null;
}

export default function AdminCoffeeBeans() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Cancel Modal states
  const [selectedTx, setSelectedTx] = useState<PaymentTransaction | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [forceCancel, setForceCancel] = useState<boolean>(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';
      
      const res = await fetch(`${apiBase}/api/admin/payments?search=${searchQuery}&platform=${platformFilter}&status=${statusFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('결제 내역 데이터를 불러오지 못했습니다.');
      }

      const data = await res.json();
      setTransactions(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '데이터 로딩 중 예상치 못한 에러가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [platformFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleOpenCancelModal = (tx: PaymentTransaction) => {
    setSelectedTx(tx);
    setCancelReason('');
    setForceCancel(false);
    setCancelError(null);
  };

  const handleCloseCancelModal = () => {
    setSelectedTx(null);
  };

  const handleExecuteCancel = async () => {
    if (!selectedTx) return;
    if (!cancelReason.trim()) {
      setCancelError('보안 감사 및 이력 보존을 위해 취소 사유를 필수로 기입해 주세요.');
      return;
    }

    try {
      setIsSubmittingCancel(true);
      setCancelError(null);

      const token = localStorage.getItem('token');
      const apiBase = import.meta.env.VITE_API_URL || '';

      const res = await fetch(`${apiBase}/api/admin/payments/${selectedTx.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          force: forceCancel,
          reason: cancelReason
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || '결제 취소 처리에 실패했습니다.');
      }

      alert('🎉 커피콩 결제 취소 및 포인트 회수 처리가 무결하게 완료되었습니다.');
      handleCloseCancelModal();
      fetchPayments();
    } catch (err: any) {
      console.error(err);
      setCancelError(err.message || '서버 연동 중 에러가 발생했습니다.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Aggregated KPI Stats
  const activeTx = transactions.filter(t => !t.isCancelled);
  const cancelledTx = transactions.filter(t => t.isCancelled);

  const totalChargeBeans = activeTx.reduce((acc, t) => acc + t.amount, 0);
  const totalCancelledBeans = cancelledTx.reduce((acc, t) => acc + t.amount, 0);
  
  const successRate = transactions.length > 0 
    ? Math.round((activeTx.length / transactions.length) * 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <Coins className="text-amber-500 w-7 h-7" /> 커피콩 충전 및 취소 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            사용자들의 실시간 커피콩 충전/환불 거래를 정밀 검증하고 취소 처리를 제어하는 통합 금융 정산 감사 패널입니다.
          </p>
        </div>
        <button 
          onClick={fetchPayments}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-medium text-gray-600 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" /> 새로고침
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Charges Card */}
        <div className="bg-gradient-to-br from-amber-50 to-white p-6 rounded-2xl shadow-sm border border-amber-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-700 tracking-wider uppercase">정상 완료 커피콩</span>
            <div className="text-3xl font-extrabold text-gray-900">
              +{totalChargeBeans.toLocaleString()}<span className="text-base font-semibold text-gray-500 ml-1">알</span>
            </div>
            <p className="text-xs text-gray-500">정상적으로 유통되어 활성화된 충전량</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl">
            <Coins className="w-8 h-8 text-amber-600 animate-pulse" />
          </div>
        </div>

        {/* Total Cancellations Card */}
        <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl shadow-sm border border-red-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-red-700 tracking-wider uppercase">회수/취소된 커피콩</span>
            <div className="text-3xl font-extrabold text-red-600">
              -{totalCancelledBeans.toLocaleString()}<span className="text-base font-semibold text-gray-400 ml-1">알</span>
            </div>
            <p className="text-xs text-gray-500">결제 취소 처리로 회수 회계 처리된 물량</p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        {/* Success Ratio Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-white p-6 rounded-2xl shadow-sm border border-emerald-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-700 tracking-wider uppercase">충전 활성 비율</span>
            <div className="text-3xl font-extrabold text-emerald-600">
              {successRate}%
            </div>
            <p className="text-xs text-gray-500">정상 충전 건수 / 전체 시도 건수 비율</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <input 
              type="text"
              placeholder="닉네임, 이메일, 영수증 번호, TxID 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-gray-400 w-4.5 h-4.5" />
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
            {/* Platform Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <Filter className="w-4 h-4 text-gray-400" />
              <select 
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="ALL">모든 플랫폼</option>
                <option value="REVENUECAT_CAPACITOR">RevenueCat (인앱)</option>
                <option value="GOOGLE">Google Play Store</option>
                <option value="APPLE">Apple App Store</option>
                <option value="TOSS">Toss Payments</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-600 focus:outline-none cursor-pointer"
              >
                <option value="ALL">모든 상태</option>
                <option value="COMPLETED">정상 완료</option>
                <option value="CANCELLED">취소/환불됨</option>
              </select>
            </div>

            <button 
              type="submit"
              className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-all active:scale-95 shadow-sm"
            >
              검색 필터 적용
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-20 text-center space-y-3">
            <Coins className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
            <p className="text-gray-500 font-semibold text-sm">실시간 커피콩 금융 결제 장부를 대조하여 조회 중입니다...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center space-y-3 text-red-500">
            <AlertTriangle className="w-12 h-12 mx-auto" />
            <p className="font-semibold">{error}</p>
            <button onClick={fetchPayments} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all">재시도</button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-20 text-center space-y-3 text-gray-500">
            <Info className="w-12 h-12 mx-auto text-gray-300" />
            <p className="font-semibold">조회 조건에 일치하는 충전/결제 거래 내역이 존재하지 않습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="px-6 py-4">회원 정보 (닉네임 / 이메일)</th>
                  <th className="px-6 py-4">플랫폼</th>
                  <th className="px-6 py-4">외부 주문 ID (영수증 ID)</th>
                  <th className="px-6 py-4">충전 커피콩</th>
                  <th className="px-6 py-4">충전 일시</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4 text-center">정산 통제 (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-600">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* User profile info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.user ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-800">{tx.user.nickname}</div>
                          <div className="text-xs text-gray-400">{tx.user.email}</div>
                          <div className="text-xs font-medium text-amber-600">
                            현재 잔액: <span className="font-bold">{tx.user.pointBalance.toLocaleString()}</span> 콩
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">탈퇴한 회원</span>
                      )}
                    </td>
                    
                    {/* Platform */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                        tx.platform.includes('APPLE') ? 'bg-black text-white' :
                        tx.platform.includes('GOOGLE') ? 'bg-blue-50 text-blue-700' :
                        tx.platform.includes('REVENUE') ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {tx.platform === 'REVENUECAT_CAPACITOR' ? '인앱결제' : tx.platform}
                      </span>
                    </td>

                    {/* Store Receipt ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs max-w-[200px] truncate text-gray-500" title={tx.storeTransactionId}>
                        {tx.storeTransactionId}
                      </div>
                      <div className="text-[10px] text-gray-300">내부 TxID: {tx.id.substring(0, 8)}...</div>
                    </td>

                    {/* Charge Amount */}
                    <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                      +{tx.amount.toLocaleString()} 콩
                    </td>

                    {/* Created Time */}
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('ko-KR')}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {tx.isCancelled ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-full whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" /> 취소/회수 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 충전 성공
                        </span>
                      )}
                    </td>

                    {/* Refund Actions */}
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      {tx.isCancelled ? (
                        <button 
                          disabled
                          className="px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg cursor-not-allowed whitespace-nowrap"
                        >
                          취소 완료됨
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleOpenCancelModal(tx)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 active:scale-95 text-xs font-bold rounded-lg transition-all whitespace-nowrap"
                        >
                          결제 취소 처리
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2-Step Secure Cancellation Confirmation Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-white flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-white/95" />
              <div>
                <h3 className="text-lg font-bold">⚠️ 커피콩 충전 취소 및 긴급 회수 승인</h3>
                <p className="text-xs text-white/80 mt-0.5">결제 영수증 환불에 따른 디지털 커피콩 회수 보안 감사 프로세스입니다.</p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* User Balance vs Revoke Amount Analysis Card */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">취소 대상 회원:</span>
                  <strong className="text-gray-800">{selectedTx.user?.nickname} ({selectedTx.user?.email})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">회수할 커피콩 물량:</span>
                  <strong className="text-red-600 font-bold">{selectedTx.amount.toLocaleString()} 콩</strong>
                </div>
                <div className="flex justify-between border-t border-gray-200/60 pt-2 mt-1">
                  <span className="text-gray-500">회원의 현재 보유 잔액:</span>
                  <strong className="text-amber-600 font-extrabold">{selectedTx.user?.pointBalance.toLocaleString()} 콩</strong>
                </div>
              </div>

              {/* Insufficient Balance Security Warning Banner */}
              {selectedTx.user && selectedTx.user.pointBalance < selectedTx.amount && (
                <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex gap-3 text-red-800 text-xs">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold">⚠️ 잔액 부족 경보 (Negative Balance Warning)</p>
                    <p className="text-red-700/90 leading-relaxed">
                      이 회원의 현재 커피콩 잔액이 회수해야 할 수량보다 부족합니다. 일반 취소는 원천 차단되며, 
                      진행할 시 마이너스 잔고(<span className="font-bold">{(selectedTx.user.pointBalance - selectedTx.amount).toLocaleString()} 콩</span>)가 발생합니다.
                    </p>
                    {/* Force Cancel Checkbox */}
                    <label className="flex items-center gap-2 mt-2 cursor-pointer bg-red-600/10 p-2 rounded-xl border border-red-300 w-fit text-red-950 font-bold">
                      <input 
                        type="checkbox"
                        checked={forceCancel}
                        onChange={(e) => setForceCancel(e.target.checked)}
                        className="rounded border-red-400 text-red-600 focus:ring-red-500"
                      />
                      <span>잔액 부족 상태에서 마이너스 강제 회수 승인</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Mandatory Reason Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 취소/회수 진행 사유 기입 <span className="text-red-500 font-bold">(필수)</span>
                </label>
                <textarea 
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="고객 단순 변심, 앱스토어 환불 요청 승인, 영수증 대조 결과 불일치 등 정산 감사 로그에 기록될 사유를 정확하게 기입해 주세요."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none leading-relaxed"
                />
              </div>

              {/* Cancel Process Error Notice */}
              {cancelError && (
                <div className="p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200/50 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{cancelError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end items-center border-t border-gray-100">
              <button 
                onClick={handleCloseCancelModal}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-xl text-xs font-bold text-gray-500 transition-all"
              >
                취소 닫기
              </button>
              <button 
                onClick={handleExecuteCancel}
                disabled={isSubmittingCancel || !!(selectedTx.user && selectedTx.user.pointBalance < selectedTx.amount && !forceCancel)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 ${
                  isSubmittingCancel || !!(selectedTx.user && selectedTx.user.pointBalance < selectedTx.amount && !forceCancel)
                    ? 'bg-red-300 cursor-not-allowed shadow-none'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isSubmittingCancel ? '취소 승인 진행 중...' : '최종 결제 취소 승인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
