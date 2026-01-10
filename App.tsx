import React, { useState, useEffect, useCallback } from 'react';
import { Scan, QrCode, History as HistoryIcon, User } from 'lucide-react';
import Scanner from './components/Scanner';
import Generator from './components/Generator';
import History from './components/History';
import ResultModal from './components/ResultModal';
import { Tab, ScanResult, GeneratedQR } from './types';

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('scan');
  const [scannedHistory, setScannedHistory] = useState<ScanResult[]>([]);
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedQR[]>([]);
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);

  // Load History
  useEffect(() => {
    const loadedScans = localStorage.getItem('qr-scans');
    const loadedGen = localStorage.getItem('qr-gen');
    if (loadedScans) setScannedHistory(JSON.parse(loadedScans));
    if (loadedGen) setGeneratedHistory(JSON.parse(loadedGen));
  }, []);

  // Save History
  // Exclude heavy originalImage data from localStorage to prevent quota issues
  useEffect(() => {
    const safeHistory = scannedHistory.map(item => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { originalImage, ...rest } = item;
      return rest;
    });
    localStorage.setItem('qr-scans', JSON.stringify(safeHistory));
  }, [scannedHistory]);

  useEffect(() => {
    localStorage.setItem('qr-gen', JSON.stringify(generatedHistory));
  }, [generatedHistory]);

  const handleScan = useCallback((data: string, image?: string) => {
    // Detect type simple heuristic
    const type = data.startsWith('http') ? 'url' : 
                 data.startsWith('WIFI:') ? 'wifi' : 
                 data.includes('@') && data.includes('.') ? 'email' : 'text';

    const newScan: ScanResult = {
      id: crypto.randomUUID(),
      data,
      timestamp: Date.now(),
      type: type as any,
      originalImage: image,
    };

    setScannedHistory(prev => {
        // Prevent duplicate scans within a short window at the top of the list
        if (prev.length > 0 && prev[0].data === data && (Date.now() - prev[0].timestamp < 2000)) {
            return prev;
        }
        return [newScan, ...prev];
    });
    setCurrentResult(newScan);
  }, []);

  const handleGenerate = useCallback((item: GeneratedQR) => {
    setGeneratedHistory(prev => [item, ...prev]);
  }, []);

  const handleClearHistory = useCallback((type: 'scans' | 'generated') => {
    if (type === 'scans') {
      setScannedHistory([]);
    } else if (type === 'generated') {
      setGeneratedHistory([]);
    }
  }, []);

  const updateScanResult = useCallback((updated: ScanResult) => {
    setCurrentResult(updated);
    setScannedHistory(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  return (
    <div className="h-screen w-full bg-dark-950 flex flex-col text-white font-sans overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'scan' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
           <Scanner onScan={handleScan} isActive={activeTab === 'scan'} />
        </div>
        <div className={`absolute inset-0 bg-dark-900 transition-opacity duration-300 ${activeTab === 'generate' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
           {activeTab === 'generate' && <Generator onGenerate={handleGenerate} />}
        </div>
        <div className={`absolute inset-0 bg-dark-900 transition-opacity duration-300 ${activeTab === 'history' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
           {activeTab === 'history' && <History scans={scannedHistory} generated={generatedHistory} onClear={handleClearHistory} onSelectScan={setCurrentResult} />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-dark-950/80 backdrop-blur-lg border-t border-white/10 safe-area-bottom z-20">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all group ${activeTab === 'scan' ? 'scale-105' : ''}`}
          >
            <div className={`${activeTab === 'scan' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500 group-hover:text-gray-300'}`}>
                <Scan size={26} />
            </div>
            <span className={`text-[10px] mt-1 font-medium tracking-wide ${activeTab === 'scan' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500'}`}>SCAN</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('generate')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all group ${activeTab === 'generate' ? 'scale-105' : ''}`}
          >
             <div className={`${activeTab === 'generate' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500 group-hover:text-gray-300'}`}>
                <QrCode size={26} />
             </div>
            <span className={`text-[10px] mt-1 font-medium tracking-wide ${activeTab === 'generate' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500'}`}>CREATE</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center w-full h-full transition-all group ${activeTab === 'history' ? 'scale-105' : ''}`}
          >
             <div className={`${activeTab === 'history' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500 group-hover:text-gray-300'}`}>
                <HistoryIcon size={26} />
             </div>
            <span className={`text-[10px] mt-1 font-medium tracking-wide ${activeTab === 'history' ? 'text-transparent bg-clip-text bg-mask-gradient-text' : 'text-gray-500'}`}>HISTORY</span>
          </button>
        </div>
      </nav>

      {/* Result Modal */}
      {currentResult && (
        <ResultModal 
          result={currentResult} 
          onClose={() => setCurrentResult(null)} 
          onUpdate={updateScanResult}
        />
      )}
    </div>
  );
};

export default App;