import { SITE_AUTHOR_HANDLE, SITE_AUTHOR_URL } from '../data/site';

/**
 * 顶栏的作者 X（Twitter）链接。
 * 独立组件，方便替换图标或改成多位作者。
 */
export default function AuthorLink() {
  return (
    <a
      className="author-link"
      href={SITE_AUTHOR_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`作者 X：${SITE_AUTHOR_HANDLE}（在新标签页打开）`}
      title={`作者 ${SITE_AUTHOR_HANDLE}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
        />
      </svg>
      <span className="author-handle">{SITE_AUTHOR_HANDLE}</span>
    </a>
  );
}
