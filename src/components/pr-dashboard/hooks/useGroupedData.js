import { useState, useEffect, useRef } from 'react';

const useGroupedData = (rows) => {
  const [groups, setGroups] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef(null);

  useEffect(() => {
    if (!rows || rows.length === 0) {
      setGroups([]);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    const worker = new Worker(
      new URL('./prGroupWorker.js', import.meta.url),
      { type: 'module' }
    );

    workerRef.current = worker;

    worker.onmessage = (e) => {
      setGroups(e.data.groups);
      setIsProcessing(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.onerror = (err) => {
      console.error('PR Group Worker error:', err);
      setIsProcessing(false);
      worker.terminate();
      workerRef.current = null;
    };

    worker.postMessage({ rows });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [rows]);

  return { groups, isProcessing };
};

export default useGroupedData;
