import React, { useEffect, useState } from 'react';
import { ScanResult, GeminiAnalysis } from '../types';
import { X, ExternalLink, Copy, Check, Sparkles, AlertTriangle, ShieldCheck, Globe, Wifi, Mail, FileText, Eye, EyeOff, Lock } from 'lucide-react';
import { analyzeContent, isAiAvailable } from '../services/geminiService';

interface ResultModalProps {
  result: ScanResult | null;
  onClose: () => void;
  onUpdate: (updatedResult: ScanResult) => void;
}

const ResultModal: React.FC<ResultModalProps> = ({ result, onClose, onUpdate }) => {
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const aiAvailable = isAiAvailable();

  useEffect(() => {
    if (result) {
      if (result.aiSummary) {
        setAnalysis(null); 
      } else {
        setAnalysis(null);
      }
    }
  }, [result]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    if (!result || !aiAvailable) return;
    setAnalyzing(true);
    const aiData = await analyzeContent(result.data);
    setAnalyzing(false);
    
    if (aiData) {
      setAnalysis(aiData);
      onUpdate({
        ...result,
        aiSummary: aiData.summary
      });
    }
  };

  if (!result) return null;

  const isUrl = result.type === 'url';
  const isWifi = result.data.startsWith('WIFI:');
  const isEmail = result.data.startsWith('mailto:');

  const renderContent = () => {
    try {
      if (isWifi) {
        const ssid = result.data.match(/S:([^;]+)/)?.[1] || 'Unknown Network';
        const password = result.data.match(/P:([^;]+)/)?.[1] || '';
        const type = result.data.match(/T:([^;]+)/)?.[1] || 'None';

        return (
          <div className="bg-dark-950 p-5 rounded-xl border border-gray-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <div className="bg-mask-cyan/10 p-2 rounded-lg text-mask-cyan">
                  <Wifi size={24} />
              </div>
              <div>
                <h4 className="text-sm text-gray-400 uppercase tracking-wide">WiFi Network</h4>
                <p className="text-xl font-semibold text-white break-all">{ssid}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 uppercase block mb-1">Security</label>
                <span className="text-gray-300 font-mono text-sm bg-dark-900 px-2 py-1 rounded border border-gray-800">{type}</span>
              </div>
              {password && (
                <div>
                    <label className="text-xs text-gray-500 uppercase block mb-1">Password</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-dark-900 border border-gray-800 rounded-lg px-3 py-2 font-mono text-gray-200 text-sm flex justify-between items-center overflow-hidden">
                        <span className="truncate">{showPassword ? password : '•'.repeat(password.length)}</span>
                        <button onClick={() => setShowPassword(!showPassword)} className="text-gray-500 hover:text-gray-300 ml-2">
                          {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                      </div>
                      <button 
                        onClick={() => handleCopy(password)}
                        className="bg-mask-gradient hover:opacity-90 text-white p-2 rounded-lg transition-colors shrink-0"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                </div>
              )}
            </div>
            <div className="pt-2">
              <button 
                onClick={() => handleCopy(password)}
                className="w-full py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl font-medium transition-colors border border-gray-700"
              >
                Copy Password & Connect
              </button>
            </div>
          </div>
        );
      }

      if (isEmail) {
        const email = result.data.replace('mailto:', '').split('?')[0];
        const params = new URLSearchParams(result.data.split('?')[1] || '');
        const subject = params.get('subject');
        const body = params.get('body');

        return (
          <div className="bg-dark-950 p-5 rounded-xl border border-gray-800 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-800">
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400">
                  <Mail size={24} />
              </div>
              <div>
                <h4 className="text-sm text-gray-400 uppercase tracking-wide">Email Action</h4>
                <p className="text-lg font-semibold text-white break-all">{email}</p>
              </div>
            </div>
            <div className="space-y-3">
              {subject && (
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Subject</label>
                  <div className="text-gray-300 text-sm bg-dark-900 p-2 rounded border border-gray-800 break-words">{subject}</div>
                </div>
              )}
              {body && (
                <div>
                  <label className="text-xs text-gray-500 uppercase block mb-1">Body</label>
                  <div className="text-gray-300 text-sm bg-dark-900 p-2 rounded border border-gray-800 italic break-words max-h-32 overflow-y-auto">{body}</div>
                </div>
              )}
            </div>
            <a 
              href={result.data}
              className="block w-full text-center py-3 bg-mask-gradient hover:opacity-90 text-white rounded-xl font-medium transition-colors mt-2"
            >
              Send Email
            </a>
          </div>
        );
      }

      if (isUrl) {
        let hostname = '';
        try {
          hostname = new URL(result.data).hostname;
        } catch (e) { hostname = 'Website'; }

        return (
          <div className="bg-dark-950 p-5 rounded-xl border border-gray-800 text-center">
              <div className="w-16 h-16 bg-mask-cyan/10 text-mask-cyan rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{hostname}</h3>
              <p className="text-gray-400 text-sm break-all mb-6 px-4">{result.data}</p>
              
              <div className="flex gap-3">
                <a 
                  href={result.data}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-mask-gradient hover:opacity-90 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <ExternalLink size={18} /> Open Link
                </a>
                <button 
                  onClick={() => handleCopy(result.data)}
                  className="bg-dark-800 hover:bg-dark-700 text-gray-200 px-4 rounded-xl border border-gray-700 shrink-0"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
          </div>
        );
      }
    } catch (e) {
      console.error("Error parsing scan result:", e);
    }

    // Default Text
    return (
      <div className="bg-dark-950 p-5 rounded-xl border border-gray-800">
         <div className="flex items-center gap-2 mb-3 text-gray-400 uppercase text-xs font-semibold tracking-wider">
            <FileText size={14} /> Plain Text Content
         </div>
         <p className="text-gray-200 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap mb-6 max-h-60 overflow-y-auto">
           {result.data}
         </p>
         <button 
            onClick={() => handleCopy(result.data)}
            className="w-full bg-dark-800 hover:bg-dark-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-gray-700"
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? 'Copied to Clipboard' : 'Copy Text'}
          </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-dark-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-800 animate-fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-dark-900 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-transparent bg-clip-text bg-mask-gradient-text">Scan Result</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-dark-800 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto overscroll-contain">
          
          {/* Main Parsed Content */}
          <div className="mb-6">
            {renderContent()}
          </div>

          {/* Gemini AI Section */}
          <div className="border-t border-dark-800 pt-6">
             {!result.aiSummary && !analysis ? (
               <div className="bg-gradient-to-r from-dark-800 to-dark-900 p-5 rounded-xl border border-gray-800 text-center">
                 <h4 className="text-mask-lime font-medium mb-2 flex items-center justify-center gap-2">
                   <Sparkles size={16} /> AI Smart Analysis
                 </h4>
                 <p className="text-xs text-gray-400 mb-4 px-4">Identify safety risks, categorize content, and get actionable insights.</p>
                 
                 {aiAvailable ? (
                   <button 
                     onClick={handleAnalyze}
                     disabled={analyzing}
                     className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                   >
                     {analyzing ? (
                       <>
                         <div className="w-4 h-4 border-2 border-mask-lime border-t-transparent rounded-full animate-spin"></div>
                         Analyzing...
                       </>
                     ) : (
                       'Run AI Analysis'
                     )}
                   </button>
                 ) : (
                   <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-xs text-red-400 font-medium">
                     <Lock size={12} /> AI Not Configured (Missing API Key)
                   </div>
                 )}
               </div>
             ) : (
               <div className="space-y-4 animate-fade-in">
                 <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                   <Sparkles size={12} className="text-mask-lime" /> AI Insights
                 </h4>
                 
                 {(analysis || result.aiSummary) && (
                   <div className="bg-dark-950 rounded-xl p-5 border border-mask-lime/20 relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-1 h-full bg-mask-gradient"></div>
                     
                     <div className="flex flex-wrap gap-2 mb-3">
                        {analysis?.safetyRating === 'safe' && (
                           <span className="text-[10px] uppercase font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1">
                             <ShieldCheck size={10} /> Safe Content
                           </span>
                        )}
                        {analysis?.safetyRating === 'caution' && (
                           <span className="text-[10px] uppercase font-bold bg-yellow-500/10 text-yellow-400 px-2 py-1 rounded border border-yellow-500/20 flex items-center gap-1">
                             <AlertTriangle size={10} /> Exercise Caution
                           </span>
                        )}
                        <span className="text-[10px] uppercase font-bold bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                          {analysis?.category || "General"}
                        </span>
                     </div>
                     
                     <p className="text-gray-300 text-sm leading-relaxed">
                       {analysis?.summary || result.aiSummary}
                     </p>
                     
                     {analysis?.actions && analysis.actions.length > 0 && (
                       <div className="mt-4 pt-4 border-t border-gray-800">
                         <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Recommended Actions</span>
                         <div className="flex flex-wrap gap-2">
                           {analysis.actions.map((action, i) => (
                             <span key={i} className="text-xs bg-mask-cyan/10 text-mask-cyan px-3 py-1.5 rounded-lg border border-mask-cyan/10">
                               {action}
                             </span>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             )}
          </div>
          
           {/* Branding Footer */}
           <div className="pt-8 pb-2 flex justify-center opacity-60">
            <p className="text-[10px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-mask-gradient-text uppercase">
              Created by Mask Intelligence
            </p>
           </div>

        </div>
      </div>
    </div>
  );
};

export default ResultModal;