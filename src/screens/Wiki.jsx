import { useRef, useState, useEffect, useCallback } from 'react';
import { useUi } from '../contexts/UiContext'
import { X, RefreshCw } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { PageLayout } from '../components/UI';

// Module-level: persists across component unmount/remount within this JS context (per-window).
let lastActiveId = null;

export default function Wiki() {
  const { t } = useUi()
  const containerRef = useRef(null);
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const activeTabRef = useRef(null);
  const tabsRef = useRef([]);
  const lastRectRef = useRef(null);
  const debounceRef = useRef(null);

  activeTabRef.current = activeTab;
  tabsRef.current = tabs;

  const reportBounds = useCallback((id) => {
    if (!id) return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const last = lastRectRef.current;
    if (last && Math.abs(last.width - r.width) < 2 && Math.abs(last.height - r.height) < 2 &&
    Math.abs(last.left - r.left) < 2 && Math.abs(last.top - r.top) < 2) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      console.log('📐 Wiki container rect (logical):', r.left, r.top, r.width, r.height);
      lastRectRef.current = { left: r.left, top: r.top, width: r.width, height: r.height };
      invoke('reflow_wiki_tab', {
        label: id, x: r.left, y: r.top, width: r.width, height: r.height
      }).catch((err) => console.error('reflow error:', err));
    }, 150);
  }, []);

  const showTab = useCallback((id, url) => {
    invoke('show_wiki_tab', { label: id, url }).
    then(() => {
      setActiveTab(id);
      setTimeout(() => {
        const el = containerRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          invoke('reflow_wiki_tab', { label: id, x: r.left, y: r.top, width: r.width, height: r.height }).
          catch(() => {});
        }
      }, 50);
    }).
    catch((err) => console.error('show wiki tab error:', err));
  }, []);

  useEffect(() => {
    const currentLabel = getCurrentWindow().label;

    // Seed tabs from Rust on mount  -  re-show the previously active tab if one exists.
    invoke('list_wiki_tabs').then((list) => {
      if (list.length === 0) {
        showTab('wiki-0');
      } else {
        // Part A: sync URLs for all existing webviews in this window
        list.forEach((t) => invoke('sync_wiki_tab', { label: t.id, url: t.url }).catch(() => {}));
        setTabs(list);
        const toShow = list.find((t) => t.id === lastActiveId) || list[list.length - 1];
        showTab(toShow.id, toShow.url);
        lastActiveId = null;
      }
    });

    // Shared tab list changes  -  broadcast app-wide, no source_window filter.
    const unlistenTabsChanged = listen('wiki-tabs-changed', (e) => {
      const newTabs = e.payload;
      setTabs(newTabs);

      if (newTabs.length === 0) {
        // All tabs closed  -  create a fresh initial tab.
        setActiveTab(null);
        showTab('wiki-0');
        return;
      }

      // If the current active tab was removed, switch to the last remaining.
      if (activeTabRef.current && !newTabs.find((t) => t.id === activeTabRef.current)) {
        const next = newTabs[newTabs.length - 1];
        showTab(next.id, next.url);
      }
    });

    // New tab from THIS window's middle-click handler.
    const unlistenOpen = listen('wiki-tab-opened', (e) => {
      const { label: id, url, source_window } = e.payload;
      if (source_window && source_window !== currentLabel) return;
      showTab(id, url);
    });
    // Optimistic title update for THIS window's tabs.
    const unlistenTitle = listen('wiki-tab-title', (e) => {
      const { title, source_window, label: id } = e.payload;
      if (source_window && source_window !== currentLabel) return;
      setTabs((t) => t.map((tab) => tab.id === id ? { ...tab, title } : tab));
    });

    // Part B: when sidebar becomes visible, sync URLs for all of this window's live webviews.
    const unlistenSidebar = listen('sidebar-visible', (e) => {
      if (e.payload?.visible) {
        tabsRef.current.forEach((t) => {
          invoke('sync_wiki_tab', { label: t.id, url: t.url }).catch(() => {});
        });
      }
    });

    const measure = () => reportBounds(activeTabRef.current);
    requestAnimationFrame(measure);
    const timeout = setTimeout(measure, 200);

    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timeout);
      clearTimeout(debounceRef.current);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      unlistenTabsChanged.then((f) => f());
      unlistenOpen.then((f) => f());
      unlistenTitle.then((f) => f());
      unlistenSidebar.then((f) => f());
      // Hide the active tab's webview so it doesn't float over other screens.
      // Do NOT close the tab  -  the persisted list survives unmount.
      if (activeTabRef.current) {
        lastActiveId = activeTabRef.current;
        invoke('hide_wiki_tab', { label: activeTabRef.current }).catch(() => {});
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab) reportBounds(activeTab);
  }, [activeTab, reportBounds]);

  const closeTab = (id, e) => {
    e.stopPropagation();
    invoke('close_wiki_tab', { label: id }).catch(() => {});
    // The wiki-tabs-changed listener handles tab list update and
    // automatically switches to another tab if the active one was removed.
  };

  return (
    <PageLayout
      titleKey="screen.wiki"
      extra={
      <div className="flex items-center gap-1">
          {tabs.map((t) =>
        <div key={t.id}
        onClick={() => showTab(t.id, t.url)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors ${
        activeTab === t.id ?
        'bg-kronos-accent/20 text-kronos-accent' :
        'bg-white/5 text-kronos-dim hover:bg-white/10'}`
        }>
              <span className="max-w-[120px] truncate">{t.title}</span>
              {tabs.length > 1 &&
          <X size={12} onClick={(e) => closeTab(t.id, e)} className="hover:text-red-400" />
          }
            </div>
        )}
          {activeTab &&
        <button
          onClick={() => invoke('refresh_wiki_tab', { label: activeTab }).catch(() => {})}
          className="flex items-center justify-center w-7 h-7 rounded-lg text-sm cursor-pointer transition-colors bg-white/5 text-kronos-dim hover:bg-white/10"
          title={t('wiki.refresh')}>
          
              <RefreshCw size={14} />
            </button>
        }
        </div>
      }>
      
      <div ref={containerRef} className="absolute inset-0" />
    </PageLayout>);

}