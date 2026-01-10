import React, { useState } from 'react';
import { ScanResult, GeneratedQR } from '../types';
import { Clock, Trash2, ExternalLink, Copy, Check, X, Download, AlertTriangle } from 'lucide-react';

interface HistoryProps {
  scans: ScanResult[];
  generated: GeneratedQR[];
  onClear: (type: 'scans' | 'generated') => void;
  onSelectScan: (scan: ScanResult) => void;
}

const History: React.FC<HistoryProps> = ({ scans, generated, onClear, onSelectScan }) => {
  const [filter, setFilter] = useState<'scans' | 'generated'>('scans');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  // Reset confirmation when switching tabs
  const handleTabChange = (newFilter: 'scans' | 'generated') => {
      setFilter(newFilter);
      setIsConfirmingClear(false);
  };

  const currentListEmpty = filter === 'scans' ? scans.length === 0 : generated.length === 0;

  return (
    <div className="h-full w-full overflow-y-auto p-4 pb-24 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-mask-gradient-text font-mono">History</h2>
        
        {!currentListEmpty && (
            isConfirmingClear ? (
              <div className="flex items-center gap-2 animate-fade-in bg-dark-800 p-1 rounded-full border border-red-500/30">
                <span className="text-xs text-red-300 font-medium pl-2">Delete All?</span>
                <button 
                  onClick={() => { onClear(filter); setIsConfirmingClear(false); }}
                  className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full transition-colors"
                >
                  Yes
                </button>
                <button 
                  onClick={() => setIsConfirmingClear(false)}
                  className="bg-dark-700 hover:bg-dark-600 text-gray-300 text-xs px-2 py-1 rounded-full transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsConfirmingClear(true)}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 px-3 py-1 rounded-full hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={14} /> Clear {filter === 'scans' ? 'Scans' : 'Generated'}
              </button>
            )
        )}
      </div>

      <div className="flex gap-2 mb-6 bg-dark-800 p-1 rounded-lg inline-flex">
        <button
          onClick={() => handleTabChange('scans')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'scans' ? 'bg-dark-700 text-mask-cyan shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Scanned
        </button>
        <button
          onClick={() => handleTabChange('generated')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'generated' ? 'bg-dark-700 text-mask-cyan shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Generated
        </button>
      </div>

      <div className="space-y-3">
        {filter === 'scans' && scans.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 opacity-50">
             <Clock size={48} className="mb-4 text-gray-600" />
             <p>No scan history found</p>
          </div>
        )}
        {filter === 'generated' && generated.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 opacity-50">
             <Download size={48} className="mb-4 text-gray-600" />
             <p>No generated QRs yet</p>
          </div>
        )}

        {filter === 'scans' && scans.map(item => (
          <div 
            key={item.id}
            onClick={() => onSelectScan(item)}
            className="group bg-dark-800 hover:bg-dark-750 p-4 rounded-xl border border-dark-800 hover:border-mask-cyan/30 transition-all cursor-pointer"
          >
             <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.type === 'url' ? 'bg-blue-500/20 text-blue-400' :
                  item.type === 'wifi' ? 'bg-purple-500/20 text-purple-400' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {item.type.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={12} /> {formatDate(item.timestamp)}
                </span>
             </div>
             <p className="text-gray-200 font-mono text-sm truncate mb-2">{item.data}</p>
             {item.aiSummary && (
               <div className="text-xs text-mask-cyan mb-2 border-l-2 border-mask-cyan/50 pl-2">
                  ✨ {item.aiSummary}
               </div>
             )}
             <div className="flex gap-3 mt-2 opacity-60 group-hover:opacity-100 transition-opacity">
               <button 
                 onClick={(e) => handleCopy(e, item.data, item.id)}
                 className="p-1.5 hover:bg-dark-700 rounded text-gray-400 hover:text-white"
               >
                  {copiedId === item.id ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
               </button>
               {item.type === 'url' && (
                 <a 
                   href={item.data} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   onClick={(e) => e.stopPropagation()} 
                   className="p-1.5 hover:bg-dark-700 rounded text-gray-400 hover:text-white"
                 >
                   <ExternalLink size={16} />
                 </a>
               )}
             </div>
          </div>
        ))}

        {filter === 'generated' && generated.map(item => (
           <div key={item.id} className="bg-dark-800 p-4 rounded-xl border border-dark-800 flex gap-4">
              <button 
                onClick={() => setPreviewImage(item.base64)}
                className="bg-white p-1 rounded h-fit shrink-0 hover:scale-105 transition-transform cursor-zoom-in"
              >
                <img src={item.base64} alt="QR" className="w-16 h-16 object-contain" />
              </button>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-xs text-gray-500">{formatDate(item.timestamp)}</span>
                  </div>
                  <p className="text-gray-200 font-mono text-sm truncate mb-3">{item.data}</p>
                </div>
                <div className="flex gap-2">
                   <a 
                     href={item.base64} 
                     download={`qr-${item.timestamp}.png`}
                     className="flex items-center gap-1 text-xs bg-dark-700 hover:bg-dark-600 text-white px-3 py-1.5 rounded-md transition-colors"
                   >
                     <Download size={12} /> Download
                   </a>
                   <button 
                     onClick={(e) => handleCopy(e, item.data, item.id)}
                     className="flex items-center gap-1 text-xs bg-dark-700 hover:bg-dark-600 text-white px-3 py-1.5 rounded-md transition-colors"
                   >
                      {copiedId === item.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                   </button>
                </div>
              </div>
           </div>
        ))}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-full max-h-full">
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300"
            >
              <X size={24} />
            </button>
            <div className="bg-white p-4 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
              <img src={previewImage} alt="Full size QR" className="max-w-[80vw] max-h-[70vh] object-contain" />
            </div>
            <div className="mt-4 flex justify-center">
                <a 
                  href={previewImage} 
                  download={`qr-full-${Date.now()}.png`}
                  className="bg-mask-gradient hover:opacity-90 text-white px-6 py-2 rounded-full font-medium flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={18} /> Save Image
                </a>
            </div>
          </div>
        </div>
      )}

      {/* Branding Footer */}
      <div className="py-6 flex justify-center opacity-60">
        <p className="text-[10px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-mask-gradient-text uppercase">
          Created by Mask Intelligence
        </p>
      </div>
    </div>
  );
};

export default History;