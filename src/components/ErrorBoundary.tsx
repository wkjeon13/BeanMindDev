import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-espresso-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-espresso-50 mb-3">
            앗, 일시적인 오류가 발생했어요!
          </h1>
          <p className="text-sm text-espresso-300 mb-8 max-w-sm">
            앱을 렌더링하는 중 문제가 발생했습니다. 이용에 불편을 드려 죄송합니다.
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold rounded-2xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
          >
            홈 화면으로 돌아가기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
