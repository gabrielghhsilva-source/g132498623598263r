import { useState, useCallback, useEffect } from "react";

const DB_NAME = "app-file-storage";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(key: string, file: File): Promise<string> {
  const db = await openDB();
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ key, dataUrl, name: file.name, type: file.type });
    tx.oncomplete = () => resolve(dataUrl);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFile(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result?.dataUrl || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useFileField(storageKey: string) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFile(storageKey).then(url => {
      setDataUrl(url);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [storageKey]);

  const upload = useCallback(async (file: File) => {
    const url = await saveFile(storageKey, file);
    setDataUrl(url);
    return url;
  }, [storageKey]);

  const remove = useCallback(async () => {
    await deleteFile(storageKey);
    setDataUrl(null);
  }, [storageKey]);

  return { dataUrl, loading, upload, remove };
}
