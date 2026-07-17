import { useCallback, useEffect, useState } from "react";

export interface DocImage {
  id: string;
  type: "image";
  src: string;      // data URL
  x: number;       // px
  y: number;
  w: number;
  h: number;
  rotate?: number;
}

export interface DocTemplate {
  id: string;
  name: string;
  /** HTML with {{placeholder}} tokens */
  html: string;
  placeholders: string[];
  createdAt: string;
}

export interface DocPage {
  id: string;
  name: string;
  /** Sanitized HTML da camada de texto */
  html: string;
  images: DocImage[];
  /** Dimensões do documento em px (A4 ~ 794x1123 em 96dpi) */
  width: number;
  height: number;
  createdAt: string;
  updatedAt: string;
}

const DOCS_KEY = "user-docs-v1";
const TPL_KEY  = "user-doc-templates-v1";

function load<T>(k: string): T[] {
  try {
    const raw = localStorage.getItem(k);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function save<T>(k: string, v: T[]) {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch (e) { console.warn("Falha ao salvar", k, e); }
}

export function useDocsStore() {
  const [docs, setDocs] = useState<DocPage[]>(() => load<DocPage>(DOCS_KEY));
  const [templates, setTemplates] = useState<DocTemplate[]>(() => load<DocTemplate>(TPL_KEY));

  useEffect(() => { save(DOCS_KEY, docs); }, [docs]);
  useEffect(() => { save(TPL_KEY, templates); }, [templates]);

  const createDoc = useCallback((name = "Novo documento", html = "", images: DocImage[] = []) => {
    const now = new Date().toISOString();
    const doc: DocPage = {
      id: crypto.randomUUID(),
      name: name.trim() || "Novo documento",
      html,
      images,
      width: 794,
      height: 1123,
      createdAt: now,
      updatedAt: now,
    };
    setDocs(prev => [doc, ...prev]);
    return doc;
  }, []);

  const updateDoc = useCallback((id: string, patch: Partial<DocPage>) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d));
  }, []);

  const deleteDoc = useCallback((id: string) => {
    setDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  const addTemplate = useCallback((name: string, html: string) => {
    const placeholders = Array.from(new Set([...html.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)].map(m => m[1])));
    const tpl: DocTemplate = {
      id: crypto.randomUUID(),
      name: name.trim() || "Modelo",
      html,
      placeholders,
      createdAt: new Date().toISOString(),
    };
    setTemplates(prev => [tpl, ...prev]);
    return tpl;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  return { docs, templates, createDoc, updateDoc, deleteDoc, addTemplate, deleteTemplate };
}
