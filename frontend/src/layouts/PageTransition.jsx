import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Fades route content in on every navigation.
 *
 * Mounted once per layout, so no page has to know it exists. The timing lives in
 * the `--motion-page` token; this component only decides *when* the animation runs.
 *
 * It re-triggers by removing and re-adding the class rather than by keying the
 * wrapper, because a changing key would remount the whole subtree — and two
 * routes that differ only by an :id param would lose their local state on every
 * navigation between them.
 *
 * Reduced motion is honoured globally in index.css, so there is nothing to check
 * here.
 */
export default function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation();
  const ref = useRef(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;

    node.classList.remove('motion-page');
    // Reading a layout property flushes the removal, so re-adding the class
    // starts a new animation instead of continuing the finished one.
    void node.offsetWidth;
    node.classList.add('motion-page');
  }, [pathname]);

  return (
    <div ref={ref} className={`motion-page ${className}`.trim()}>
      {children}
    </div>
  );
}
