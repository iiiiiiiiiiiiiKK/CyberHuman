import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 顶层错误边界：渲染异常时给出可操作的兜底界面，而不是白屏。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 仅打印到控制台，不上报任何数据
    console.error('[赛博人类鉴定所] 渲染异常', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    try {
      window.localStorage.removeItem('chl.progress.v1');
      window.localStorage.removeItem('chl.last-result.v1');
    } catch {
      /* 忽略 */
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="crash">
          <div className="crash-inner">
            <h1>检测仪发生异常</h1>
            <p className="muted">页面渲染时出错，你的答案没有被上传，仍保存在本机浏览器内。</p>
            <pre>{this.state.error.message}</pre>
            <div className="btn-row">
              <button type="button" className="btn btn-primary btn-sm" onClick={this.handleReload}>
                重新加载
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={this.handleReset}>
                清除本地数据并重试
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
