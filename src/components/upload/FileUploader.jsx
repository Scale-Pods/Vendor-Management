import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Table as TableIcon } from 'lucide-react';
import Papa from 'papaparse';

const FileUploader = () => {
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setUploading(true);

    // Simulate parsing
    Papa.parse(selectedFile, {
      header: true,
      complete: (results) => {
        setPreviewData(results.data.slice(0, 5));
        setUploading(false);
      },
      error: () => {
        setUploading(false);
      }
    });
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files[0];
    handleFile(selectedFile);
  }, []);

  const onFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    handleFile(selectedFile);
  };

  return (
    <div className="space-y-10 stagger-item">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Import Datasets</h1>
        <p className="text-[rgba(255,255,255,0.4)] font-medium leading-relaxed">Securely ingest Purchase Request or PO manifests (CSV/XLSX) to execute change detection and financial trend analysis.</p>
      </div>

      <div 
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`
          relative glass-panel !border-dashed border-2 p-16 text-center transition-all duration-500
          ${isDragging ? 'border-[#F59E0B] bg-[rgba(245,158,11,0.05)]' : 'border-[rgba(255,255,255,0.1)]'}
          ${file ? 'py-20' : ''}
        `}
      >
        <input 
          type="file" 
          id="fileInput" 
          className="hidden" 
          accept=".csv,.xlsx" 
          onChange={onFileSelect}
        />

        {!file ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-3xl flex items-center justify-center mb-8 text-[#F59E0B]">
              <Upload size={36} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Manifest Dropzone</h3>
            <p className="text-[rgba(255,255,255,0.4)] mb-8 font-medium">Drag and drop or click to browse (CSV, XLSX)</p>
            <label 
              htmlFor="fileInput"
              className="px-10 py-4 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black rounded-[12px] font-black text-[14px] hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 cursor-pointer transition-all"
            >
              CHOOSE FILE
            </label>
          </div>
        ) : (
          <div className="flex flex-col items-center">
             <div className="w-20 h-20 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-3xl flex items-center justify-center mb-8 text-[#10B981] animate-bounce">
              <CheckCircle2 size={36} strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{file.name}</h3>
            <p className="text-[rgba(255,255,255,0.4)] mb-10 font-medium">{(file.size / 1024).toFixed(2)} KB • Verified for Processing</p>
            <div className="flex gap-4">
               <button 
                onClick={() => { setFile(null); setPreviewData([]); }}
                className="px-8 py-3 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-[12px] font-bold text-[rgba(255,255,255,0.6)] hover:text-white transition-all"
               >
                 REMOVE
               </button>
               <button className="px-8 py-3 bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-black rounded-[12px] font-black text-[14px] hover:shadow-[0_4px_24px_rgba(245,158,11,0.4)] hover:-translate-y-0.5 transition-all">
                 PROCESS DATA
               </button>
            </div>
          </div>
        )}
      </div>

      {previewData.length > 0 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] rounded-lg flex items-center justify-center text-[#F59E0B]">
              <TableIcon size={18} />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">Dataset Preview</h3>
          </div>
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[rgba(255,255,255,0.07)]">
                    {Object.keys(previewData[0]).map((key) => (
                      <th key={key} className="px-6 py-4 text-[10px] font-bold text-[rgba(255,255,255,0.3)] uppercase tracking-wider">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                  {previewData.map((row, i) => (
                    <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-6 py-4 text-[13px] text-[rgba(255,255,255,0.5)] font-medium">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="glass-panel !border-[#F59E0B]/20 bg-[#F59E0B]/5 p-8 rounded-[20px] flex gap-6">
        <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-2xl flex items-center justify-center text-[#F59E0B] shrink-0">
          <AlertCircle size={28} strokeWidth={1.5} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-[#F59E0B] mb-2 tracking-tight">Processing Guidelines</h4>
          <p className="text-[14px] text-[rgba(255,255,255,0.5)] leading-relaxed font-medium">
            To ensure optimal synchronization, your manifest should include indexed headers for <span className="text-white bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded font-mono text-xs">PR_Number</span>, 
            <span className="text-white bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded font-mono text-xs">Supplier</span>, and 
            <span className="text-white bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded font-mono text-xs">Amount</span>. 
            Deviations will be flagged for manual mapping during the verification stage.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
