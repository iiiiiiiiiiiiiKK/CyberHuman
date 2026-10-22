import { SITE_DISCLAIMER, SITE_NAME } from '../data/site';
import { clearAll } from '../lib/storage';
import { useState } from 'react';

interface SiteFooterProps {
  onCleared?: () => void;
  onViewLastResult?: () => void;
}

export default function SiteFooter({ onCleared, onViewLastResult }: SiteFooterProps) {
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    clearAll();
    setCleared(true);
    onCleared?.();
    window.setTimeout(() => setCleared(false), 4000);
  };

  return (
    <footer className="site-foot">
      <div className="shell site-foot-inner">
        <div>
          <div>
            © {new Date().getFullYear()} {SITE_NAME} · 娱乐用趣味测试
          </div>
          <div className="foot-warn">{SITE_DISCLAIMER}</div>
        </div>
        <div className="foot-links">
          {onViewLastResult ? (
            <button type="button" className="foot-link" onClick={onViewLastResult}>
              查看上次结果
            </button>
          ) : null}
          <button type="button" className="foot-link" onClick={handleClear}>
            {cleared ? '已清除本地数据' : '清除本地数据'}
          </button>
          <span className="foot-link" style={{ cursor: 'default', border: 'none' }}>
            纯前端 · 无账号 · 不上传
          </span>
        </div>
      </div>
    </footer>
  );
}
