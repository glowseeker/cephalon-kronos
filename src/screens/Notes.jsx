/**
 * Notes.jsx
 *
 * A simplified Markdown note-taking tool for in-game goals and reminders.
 *
 * DATA STORAGE
 * ─────────────────────────────────────────
 * - Notes are stored as physical `.md` files in `src-tauri/data/user/notes/`.
 * - File I/O (list, read, write, delete) is handled by the Rust backend
 *   via Tauri IPC commands.
 *
 * FEATURES
 * ─────────────────────────────────────────
 * - Full MDX editor support with bold, italic, lists, and tables.
 * - Real-time auto-saving (or manual save depending on config).
 * - Click-to-rename filenames.
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, Plus, Trash, Edit2, Check, X } from 'lucide-react'
import { PageLayout, Card, Button } from '../components/UI'
import { invoke } from '@tauri-apps/api/tauri'
import { MDXEditor } from '@mdxeditor/editor'
import {
  headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin,
  markdownShortcutPlugin, linkPlugin, linkDialogPlugin, tablePlugin,
  codeBlockPlugin, codeMirrorPlugin, diffSourcePlugin,
  toolbarPlugin, BoldItalicUnderlineToggles, BlockTypeSelect,
  CreateLink, InsertTable, InsertThematicBreak, ListsToggle,
  UndoRedo, CodeToggle, DiffSourceToggleWrapper, Separator
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'




// Inline editable title - click to rename
function EditableTitle({ filename, onRename }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(filename.replace('.md', ''))
  const inputRef = useRef(null)

  useEffect(() => {
    setVal(filename.replace('.md', ''))
  }, [filename])

  const commit = () => {
    setEditing(false)
    const trimmed = val.trim()
    if (trimmed && trimmed !== filename.replace('.md', '')) {
      onRename(filename, trimmed)
    } else {
      setVal(filename.replace('.md', ''))
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setEditing(false); setVal(filename.replace('.md', '')) }
        }}
        className="text-lg font-semibold bg-transparent border-b border-kronos-accent/50 outline-none text-kronos-text w-48 pb-0.5"
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="flex items-center gap-2 text-lg font-semibold hover:text-kronos-accent transition-colors group"
      title="Click to rename"
    >
      <FileText size={18} />
      {val}
      <Edit2 size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
    </button>
  )
}

export default function Notes() {
  const [files, setFiles] = useState([])
  const [activeFile, setActiveFile] = useState(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingFile, setEditingFile] = useState(null)
  const [editName, setEditName] = useState('')
  const [fileToDelete, setFileToDelete] = useState(null)
  const latestContentRef = useRef('')
  const activeFileRef = useRef(null)

  const loadFiles = async () => {
    try {
      const list = await invoke('list_notes')
      setFiles(list)
      if (list.length > 0) selectFile(list[0])
    } catch (err) { console.error('list_notes failed:', err) }
  }

  useEffect(() => { loadFiles() }, [])

  // Save note when switching to another tab or unmounting
  useEffect(() => {
    return () => {
      if (activeFileRef.current && latestContentRef.current) {
        invoke('save_note', { filename: activeFileRef.current, content: latestContentRef.current }).catch(() => {})
      }
    }
  }, [])

  const selectFile = useCallback(async (filename) => {
    if (activeFileRef.current && activeFileRef.current !== filename) {
      try { await invoke('save_note', { filename: activeFileRef.current, content: latestContentRef.current }) }
      catch { }
    }
    if (!filename) {
      setActiveFile(null); setContent('')
      latestContentRef.current = ''; activeFileRef.current = null
      return
    }
    try {
      const text = await invoke('read_note', { filename })
      latestContentRef.current = text
      activeFileRef.current = filename
      setContent(text)
      setActiveFile(filename)
    } catch (err) { console.error('read_note failed:', err) }
  }, [])

  useEffect(() => () => {
    if (activeFileRef.current)
      invoke('save_note', { filename: activeFileRef.current, content: latestContentRef.current }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!activeFile) return
    const iv = setInterval(async () => {
      if (!activeFileRef.current) return
      setSaving(true)
      try { await invoke('save_note', { filename: activeFileRef.current, content: latestContentRef.current }) }
      catch { }
      finally { setTimeout(() => setSaving(false), 2000) }
    }, 15_000)
    return () => clearInterval(iv)
  }, [activeFile])

  const newFile = async () => {
    let name = 'New Note.md', n = 2
    while (files.includes(name)) name = `New Note ${n++}.md`
    try {
      await invoke('save_note', { filename: name, content: '# New Note\n' })
      const list = await invoke('list_notes')
      setFiles(list); selectFile(name)
    } catch { }
  }

  const handleRename = useCallback(async (oldName, newName) => {
    if (!newName.trim() || newName === oldName.replace('.md', '')) return
    const finalName = newName.endsWith('.md') ? newName : `${newName}.md`
    if (files.includes(finalName)) { alert('A note with that name already exists'); return }
    try {
      const src = activeFile === oldName ? latestContentRef.current : await invoke('read_note', { filename: oldName })
      await invoke('save_note', { filename: finalName, content: src })
      await invoke('delete_note', { filename: oldName })
      const list = await invoke('list_notes')
      setFiles(list)
      if (activeFile === oldName) {
        activeFileRef.current = finalName
        setActiveFile(finalName)
      }
    } catch (err) { console.error('rename failed:', err) }
    finally { if (editingFile) setEditingFile(null) }
  }, [files, activeFile, editingFile])

  const confirmDelete = async () => {
    if (!fileToDelete) return
    console.log('[DEBUG] Deleting note:', fileToDelete)
    try {
      const wasActive = fileToDelete === activeFileRef.current
      if (wasActive) {
        setActiveFile(null)
        setContent('')
        latestContentRef.current = ''
        activeFileRef.current = null
      }
      
      await invoke('delete_note', { filename: fileToDelete })
      console.log('[DEBUG] Delete successful')
      const list = await invoke('list_notes')
      setFiles(list)
      
      if (wasActive) {
        if (list.length > 0) selectFile(list[0])
        else { setActiveFile(null); setContent(''); latestContentRef.current = ''; activeFileRef.current = null }
      }
    } catch (err) { 
      console.error('[DEBUG] Delete failed:', err)
    }
    finally { setFileToDelete(null) }
  }

  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    codeBlockPlugin({ defaultCodeBlockLanguage: '' }),
    codeMirrorPlugin({
      codeBlockLanguages: {
        js: 'JavaScript', ts: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
        css: 'CSS', html: 'HTML', json: 'JSON', bash: 'Bash',
        py: 'Python', rs: 'Rust', '': 'Plain text'
      }
    }),
    diffSourcePlugin({ viewMode: 'rich-text' }),
    toolbarPlugin({
      toolbarContents: () => (
        <DiffSourceToggleWrapper>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <Separator />
          <BoldItalicUnderlineToggles />
          <CodeToggle />
          <Separator />
          <ListsToggle />
          <Separator />
          <InsertThematicBreak />
          <CreateLink />
          <InsertTable />
        </DiffSourceToggleWrapper>
      )
    }),
  ]

  return (
    <PageLayout title="Notes">
      {/* Kronos theme overrides for MDXEditor - using stable public class names from mdxeditor.dev/editor/docs/theming */}
      <style>{`
        /* ── CSS variable theme tokens ── */
        .dark-editor.kronos-editor {
          --accentBase: var(--color-accent);
          --accentBgSubtle: color-mix(in srgb, var(--color-accent) 10%, transparent);
          --accentBg: color-mix(in srgb, var(--color-accent) 15%, transparent);
          --accentBgHover: color-mix(in srgb, var(--color-accent) 25%, transparent);
          --accentBgActive: color-mix(in srgb, var(--color-accent) 30%, transparent);
          --accentLine: color-mix(in srgb, var(--color-accent) 40%, transparent);
          --accentBorder: color-mix(in srgb, var(--color-accent) 50%, transparent);
          --accentBorderHover: var(--color-accent);
          --accentSolid: var(--color-accent);
          --accentSolidHover: var(--color-accent);
          --accentText: var(--color-accent);
          --accentTextContrast: #ffffff;
          --baseBase: var(--color-bg);
          --baseBgSubtle: var(--color-panel);
          --baseBg: var(--color-panel);
          --baseBgHover: color-mix(in srgb, var(--color-panel) 80%, white 20%);
          --baseBgActive: color-mix(in srgb, var(--color-panel) 70%, white 30%);
          --baseLine: rgba(255,255,255,0.06);
          --baseBorder: rgba(255,255,255,0.08);
          --baseBorderHover: rgba(255,255,255,0.15);
          --baseSolid: rgba(255,255,255,0.15);
          --baseSolidHover: rgba(255,255,255,0.20);
          --baseText: var(--color-text);
          --baseTextContrast: #ffffff;
          --basePageBg: var(--color-bg);
          color: var(--color-text);
          background: var(--color-bg);
        }

        /* ── Toolbar ── */
        .kronos-editor .mdxeditor-toolbar {
          background: var(--color-panel) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
          flex-wrap: wrap !important;
          overflow: hidden !important;
        }

        /* ── Heading/block-type select dropdown (stable class from docs) ── */
        .kronos-editor .mdxeditor-select-content {
          background: var(--color-panel) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 6px !important;
          color: var(--color-text) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
        }
        .kronos-editor .mdxeditor-select-content [role='option']:hover,
        .kronos-editor .mdxeditor-select-content [role='option'][data-highlighted] {
          background: color-mix(in srgb, var(--color-accent) 20%, transparent) !important;
          color: var(--color-text) !important;
          outline: none !important;
        }
        .kronos-editor .mdxeditor-select-content [role='option'][data-state='checked'] {
          color: var(--color-accent) !important;
        }

        /* ── Rich text editor content (stable class from docs) ── */
        .kronos-editor .mdxeditor-root-contenteditable {
          color: var(--color-text) !important;
          background: var(--color-bg) !important;
          /* Let the outer wrapper handle scroll */
          overflow: visible !important;
          max-height: none !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable p,
        .kronos-editor .mdxeditor-root-contenteditable li,
        .kronos-editor .mdxeditor-root-contenteditable span {
          color: var(--color-text) !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable p { margin-bottom: 1em; line-height: 1.6; }
        .kronos-editor .mdxeditor-root-contenteditable ul { list-style-type: disc !important; padding-left: 1.5em !important; margin-bottom: 1em; }
        .kronos-editor .mdxeditor-root-contenteditable ol { list-style-type: decimal !important; padding-left: 1.5em !important; margin-bottom: 1em; }
        .kronos-editor .mdxeditor-root-contenteditable li { margin-bottom: 0.25em; }

        .kronos-editor .mdxeditor-root-contenteditable h1,
        .kronos-editor .mdxeditor-root-contenteditable h2,
        .kronos-editor .mdxeditor-root-contenteditable h3,
        .kronos-editor .mdxeditor-root-contenteditable h4 {
          color: var(--color-text) !important;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }
        .kronos-editor .mdxeditor-root-contenteditable h1 { font-size: 2.25em; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; margin-top: 0; }
        .kronos-editor .mdxeditor-root-contenteditable h2 { font-size: 1.75em; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
        .kronos-editor .mdxeditor-root-contenteditable h3 { font-size: 1.25em; font-weight: 600; }
        .kronos-editor .mdxeditor-root-contenteditable h4 { font-size: 1em; font-weight: 600; }

        .kronos-editor .mdxeditor-root-contenteditable blockquote {
          border-left: 4px solid var(--color-accent) !important;
          padding-left: 1em;
          margin: 1em 0;
          color: var(--color-text-dim) !important;
          font-style: italic;
        }
        .kronos-editor .mdxeditor-root-contenteditable code {
          color: var(--color-accent) !important;
        }
        .kronos-editor .mdxeditor-root-contenteditable a {
          color: var(--color-accent) !important;
        }

        /* ── Diff/source wrapper (stable class from docs) ── */
        .kronos-editor .mdxeditor-diff-source-wrapper {
          overflow: visible !important;
          max-height: none !important;
        }
        .kronos-editor .mdxeditor-source-editor,
        .kronos-editor .mdxeditor-diff-editor {
          overflow: visible !important;
        }

        /* ── CodeMirror (source/diff mode) ── */
        .kronos-editor .cm-editor {
          background: var(--color-bg) !important;
          color: var(--color-text) !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .kronos-editor .cm-scroller {
          font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace !important;
          font-size: 13px !important;
          overflow: visible !important;
        }
        .kronos-editor .cm-gutters {
          background: var(--color-panel) !important;
          border-right: 1px solid rgba(255,255,255,0.06) !important;
          color: var(--color-text-dim) !important;
        }
        .kronos-editor .cm-activeLineGutter,
        .kronos-editor .cm-activeLine {
          background: color-mix(in srgb, var(--color-accent) 6%, transparent) !important;
        }
        .kronos-editor .cm-selectionBackground,
        .kronos-editor .cm-focused .cm-selectionBackground {
          background: color-mix(in srgb, var(--color-accent) 25%, transparent) !important;
        }
        .kronos-editor .cm-cursor {
          border-left-color: var(--color-accent) !important;
        }

        /* ── Diff colours ── */
        .kronos-editor .mdxeditor-diff-editor ins { background: rgba(34,197,94,0.15) !important; }
        .kronos-editor .mdxeditor-diff-editor del { background: rgba(239,68,68,0.15) !important; }
      `}</style>

      {fileToDelete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="max-w-md w-full p-6 text-center border-red-500/20 shadow-2xl">
            <h2 className="text-xl font-bold mb-2">Delete Note?</h2>
            <p className="text-kronos-dim mb-6">Delete <span className="text-kronos-text font-bold">{fileToDelete}</span>?</p>
            <div className="flex gap-4 justify-center">
              <Button variant="secondary" onClick={() => setFileToDelete(null)}>Cancel</Button>
              <Button onClick={confirmDelete} className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-red-500/50">Delete</Button>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 h-full relative z-0">
        {/* File list */}
        <div className="col-span-1">
          <Card className="h-full p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Files</h3>
              <Button variant="ghost" title="New note" onClick={newFile}><Plus size={14} /></Button>
            </div>
            <div className="overflow-auto mt-2 flex-1">
              <ul className="space-y-2">
                {files.map(f => (
                  <li key={f} className="relative group">
                    {editingFile === f ? (
                      <div className="flex items-center gap-1 w-full bg-kronos-panel/40 p-1 rounded">
                        <input autoFocus value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRename(f, editName)
                            if (e.key === 'Escape') setEditingFile(null)
                          }}
                          className="bg-transparent text-sm text-kronos-text outline-none flex-1 min-w-0"
                        />
                        <button onClick={() => handleRename(f, editName)} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
                        <button onClick={() => setEditingFile(null)} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center group/item w-full pr-1">
                        <button onClick={() => selectFile(f)}
                          className={`flex-1 text-left px-2 py-2 rounded truncate text-sm ${activeFile === f ? 'bg-kronos-panel text-kronos-accent' : 'hover:bg-kronos-panel/40'}`}>
                          {f.replace('.md', '')}
                        </button>
                        <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); setEditingFile(f); setEditName(f.replace('.md', '')) }}
                            className="p-1.5 text-kronos-dim hover:text-kronos-accent bg-kronos-bg/90 rounded"><Edit2 size={12} /></button>
                          <button onClick={e => { e.stopPropagation(); setFileToDelete(f) }}
                            className="p-1.5 text-kronos-dim hover:text-red-400 bg-kronos-bg/90 rounded"><Trash size={12} /></button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        {/* Editor pane */}
        <div className="col-span-3">
          <Card className="p-4 h-full flex flex-col gap-3">
            {activeFile ? (
              <>
                <div className="flex items-center gap-2 shrink-0">
                  <EditableTitle filename={activeFile} onRename={handleRename} />
                  <div className={`ml-auto text-xs transition-opacity duration-500 ${saving ? 'opacity-100 text-kronos-accent' : 'opacity-0'}`}>Saved</div>
                </div>

                <div className="rounded-md border border-white/5 overflow-y-auto custom-scrollbar" style={{ height: 'calc(100vh - 200px)' }}>
                  <MDXEditor
                    key={activeFile}
                    markdown={content}
                    onChange={val => { latestContentRef.current = val }}
                    plugins={plugins}
                    className="dark-theme dark-editor kronos-editor h-full"
                    contentEditableClassName="prose-kronos-content"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-kronos-dim">
                Select or create a note
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageLayout>
  )
}