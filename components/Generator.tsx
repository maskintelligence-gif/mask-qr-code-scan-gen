import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  Download, Copy, Check, ChevronDown, Upload, Image as ImageIcon, 
  Palette, Type, RefreshCw, MoveDown, MoveRight, MoveDiagonal, Circle,
  Link, Wifi, Mail, UserSquare, FileText, Globe, Smartphone, Building, AtSign, AlertTriangle, Eye, Type as TypeIcon,
  Maximize, Square, AppWindow
} from 'lucide-react';
import { GeneratedQR } from '../types';

interface GeneratorProps {
  onGenerate: (item: GeneratedQR) => void;
}

type DotStyle = 'square' | 'rounded' | 'dots' | 'extra-rounded' | 'classy' | 'classy-inverted' | 'diamond' | 'cross';
type EyeStyle = 'square' | 'circle' | 'rounded' | 'leaf';
type ColorMode = 'solid' | 'gradient';
type GradientType = 'vertical' | 'horizontal' | 'diagonal' | 'radial';
type QRContentType = 'text' | 'url' | 'wifi' | 'email' | 'vcard';
type LogoShape = 'none' | 'circle' | 'rounded' | 'square';

const Generator: React.FC<GeneratorProps> = ({ onGenerate }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');
  
  // Content State
  const [contentType, setContentType] = useState<QRContentType>('text');
  const [text, setText] = useState(''); // The final generated string
  
  // Template States
  const [urlValue, setUrlValue] = useState('');
  
  const [wifiData, setWifiData] = useState({
    ssid: '',
    password: '',
    encryption: 'WPA' as 'WPA' | 'WEP' | 'nopass',
    hidden: false
  });

  const [emailData, setEmailData] = useState({
    email: '',
    subject: '',
    body: ''
  });

  const [vcardData, setVcardData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    org: '',
    title: '',
    url: ''
  });
  
  // Style State
  const [fgColorMode, setFgColorMode] = useState<ColorMode>('solid');
  const [fgColor1, setFgColor1] = useState('#000000');
  const [fgColor2, setFgColor2] = useState('#a3e635'); // Default Lime
  const [fgGradientType, setFgGradientType] = useState<GradientType>('vertical');

  const [bgColorMode, setBgColorMode] = useState<ColorMode>('solid');
  const [bgColor1, setBgColor1] = useState('#ffffff');
  const [bgColor2, setBgColor2] = useState('#e2e8f0');
  const [bgGradientType, setBgGradientType] = useState<GradientType>('diagonal');
  
  const [errorLevel, setErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M');
  const [dotStyle, setDotStyle] = useState<DotStyle>('square');
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>('square');
  
  // Logo State
  const [logo, setLogo] = useState<string | null>(null);
  // Fixed logo size at 25% as requested
  const logoSize = 25; 
  const [logoShape, setLogoShape] = useState<LogoShape>('rounded');
  
  // Dimensions State
  const [qrSize, setQrSize] = useState<number>(1000); // Base resolution

  // Label / Text State
  const [labelText, setLabelText] = useState('');
  const [labelPosition, setLabelPosition] = useState<'top' | 'bottom'>('bottom');
  const [labelColor, setLabelColor] = useState('#000000');
  const [labelSize, setLabelSize] = useState(60);
  const [labelFont, setLabelFont] = useState('Inter, sans-serif');

  // Output State
  const [generatedBase64, setGeneratedBase64] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper: Calculate relative luminance for contrast check
  const getLuminance = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return 0.5; // default
    const [r, g, b] = [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };

  const contrastRatio = (() => {
      const l1 = getLuminance(fgColor1);
      const l2 = getLuminance(bgColor1);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
  })();

  const isLowContrast = contrastRatio < 2.2; // Threshold for reliable scanning

  // Template Logic: Update `text` when template data changes
  useEffect(() => {
    let newText = '';
    switch (contentType) {
      case 'text':
        // Text is handled directly via textarea onChange for this mode
        return; 
      case 'url':
        newText = urlValue;
        break;
      case 'wifi':
        const { ssid, password, encryption, hidden } = wifiData;
        if (ssid) {
          const enc = encryption === 'nopass' ? '' : encryption;
          newText = `WIFI:T:${enc};S:${ssid};P:${password};H:${hidden};;`;
        }
        break;
      case 'email':
        const { email, subject, body } = emailData;
        if (email) {
          newText = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        }
        break;
      case 'vcard':
        const { firstName, lastName, phone, org, title, url } = vcardData;
        if (firstName || lastName || vcardData.email || phone) {
           newText = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName};;;\nFN:${firstName} ${lastName}\nORG:${org}\nTITLE:${title}\nTEL:${phone}\nEMAIL:${vcardData.email}\nURL:${url}\nEND:VCARD`;
        }
        break;
    }
    setText(newText);
  }, [contentType, urlValue, wifiData, emailData, vcardData]);

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setLogo(ev.target?.result as string);
        if (errorLevel === 'L' || errorLevel === 'M') {
          setErrorLevel('H');
        }
      };
      reader.readAsDataURL(file);
      // Reset input value to allow re-uploading same file if needed
      e.target.value = '';
    }
  };

  const getFillStyle = (ctx: CanvasRenderingContext2D, width: number, height: number, mode: ColorMode, type: GradientType, c1: string, c2: string) => {
    if (mode === 'solid') return c1;
    
    let grd: CanvasGradient;
    if (type === 'vertical') {
      grd = ctx.createLinearGradient(0, 0, 0, height);
    } else if (type === 'horizontal') {
      grd = ctx.createLinearGradient(0, 0, width, 0);
    } else if (type === 'diagonal') {
      grd = ctx.createLinearGradient(0, 0, width, height);
    } else {
      grd = ctx.createRadialGradient(width/2, height/2, width/10, width/2, height/2, Math.max(width, height) * 0.8);
    }
    
    grd.addColorStop(0, c1);
    grd.addColorStop(1, c2);
    return grd;
  };

  // Helper for rounded rectangles path
  const roundRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  
  // Helper for Leaf shape path (Top-Left and Bottom-Right rounded)
  const leafPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w, y); // Sharp Top-Right
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); // Round Bottom-Right
      ctx.lineTo(x, y + h); // Sharp Bottom-Left
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y); // Round Top-Left
      ctx.closePath();
  };

  const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number, style: EyeStyle) => {
    // 7 modules wide
    const os = cellSize * 7; // Outer Size
    const is = cellSize * 3; // Inner Size (the filled block)
    
    ctx.beginPath();
    
    // 1. OUTER RING
    switch (style) {
        case 'circle':
            ctx.moveTo(x + os, y + os/2);
            ctx.arc(x + os/2, y + os/2, os/2, 0, Math.PI * 2); // Outer
            ctx.moveTo(x + os - cellSize, y + os/2);
            ctx.arc(x + os/2, y + os/2, (os - 2*cellSize)/2, 0, Math.PI * 2); // Hole (5 modules)
            break;
        case 'rounded':
            roundRectPath(ctx, x, y, os, os, cellSize * 2);
            // Hole needs to be subtracted. 
            // Canvas 'evenodd' rule handles subtraction if we draw the inner shape here too?
            // Wait, roundRectPath closes path. 
            // We need to construct a single path for evenodd fill.
            
            // Re-implement path commands without beginPath/closePath for composite shape
            ctx.moveTo(x + cellSize * 2, y);
            ctx.lineTo(x + os - cellSize * 2, y);
            ctx.quadraticCurveTo(x + os, y, x + os, y + cellSize * 2);
            ctx.lineTo(x + os, y + os - cellSize * 2);
            ctx.quadraticCurveTo(x + os, y + os, x + os - cellSize * 2, y + os);
            ctx.lineTo(x + cellSize * 2, y + os);
            ctx.quadraticCurveTo(x, y + os, x, y + os - cellSize * 2);
            ctx.lineTo(x, y + cellSize * 2);
            ctx.quadraticCurveTo(x, y, x + cellSize * 2, y);
            
            // Inner Hole (Counter-clockwise for nonzero winding, or just same direction for evenodd)
            const hx = x + cellSize;
            const hy = y + cellSize;
            const hw = os - 2*cellSize;
            const hr = cellSize * 1.5;
            
            ctx.moveTo(hx + hr, hy);
            ctx.lineTo(hx + hw - hr, hy);
            ctx.quadraticCurveTo(hx + hw, hy, hx + hw, hy + hr);
            ctx.lineTo(hx + hw, hy + hw - hr);
            ctx.quadraticCurveTo(hx + hw, hy + hw, hx + hw - hr, hy + hw);
            ctx.lineTo(hx + hr, hy + hw);
            ctx.quadraticCurveTo(hx, hy + hw, hx, hy + hw - hr);
            ctx.lineTo(hx, hy + hr);
            ctx.quadraticCurveTo(hx, hy, hx + hr, hy);
            break;
            
        case 'leaf':
             // Simplified Leaf Outer
             const lr = cellSize * 2.5;
             ctx.moveTo(x + lr, y);
             ctx.lineTo(x + os, y);
             ctx.lineTo(x + os, y + os - lr);
             ctx.quadraticCurveTo(x + os, y + os, x + os - lr, y + os);
             ctx.lineTo(x, y + os);
             ctx.lineTo(x, y + lr);
             ctx.quadraticCurveTo(x, y, x + lr, y);
             
             // Leaf Hole
             const lix = x + cellSize;
             const liy = y + cellSize;
             const liw = os - 2*cellSize;
             const lir = cellSize * 1.5;
             ctx.moveTo(lix + lir, liy);
             ctx.lineTo(lix + liw, liy);
             ctx.lineTo(lix + liw, liy + liw - lir);
             ctx.quadraticCurveTo(lix + liw, liy + liw, lix + liw - lir, liy + liw);
             ctx.lineTo(lix, liy + liw);
             ctx.lineTo(lix, liy + lir);
             ctx.quadraticCurveTo(lix, liy, lix + lir, liy);
             break;
             
        case 'square':
        default:
            ctx.rect(x, y, os, os);
            ctx.rect(x + cellSize, y + cellSize, os - 2*cellSize, os - 2*cellSize);
            break;
    }
    
    // 2. INNER BLOCK (3x3 modules)
    const ix = x + 2*cellSize;
    const iy = y + 2*cellSize;
    
    switch (style) {
        case 'circle':
             ctx.moveTo(ix + is, iy + is/2);
             ctx.arc(ix + is/2, iy + is/2, is/2, 0, Math.PI * 2);
             break;
        case 'rounded':
             roundRectPath(ctx, ix, iy, is, is, cellSize * 1);
             break;
        case 'leaf':
             // Leaf Inner
             const ir = cellSize * 1;
             ctx.moveTo(ix + ir, iy);
             ctx.lineTo(ix + is, iy);
             ctx.lineTo(ix + is, iy + is - ir);
             ctx.quadraticCurveTo(ix + is, iy + is, ix + is - ir, iy + is);
             ctx.lineTo(ix, iy + is);
             ctx.lineTo(ix, iy + ir);
             ctx.quadraticCurveTo(ix, iy, ix + ir, iy);
             break;
        case 'square':
        default:
             ctx.rect(ix, iy, is, is);
             break;
    }
    
    ctx.fill("evenodd"); 
  };

  const drawModule = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, style: DotStyle) => {
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.beginPath();

    switch (style) {
      case 'dots':
        ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
        break;
      case 'rounded':
        roundRectPath(ctx, x, y, size, size, size * 0.25);
        break;
      case 'extra-rounded':
        roundRectPath(ctx, x, y, size, size, size * 0.45);
        break;
      case 'classy':
        // TL, TR, BR, BL
        roundRectAdvanced(ctx, x, y, size, size, size * 0.5, 0, size * 0.5, 0);
        break;
      case 'classy-inverted':
        roundRectAdvanced(ctx, x, y, size, size, 0, size * 0.5, 0, size * 0.5);
        break;
      case 'diamond':
        ctx.moveTo(cx, y);
        ctx.lineTo(x + size, cy);
        ctx.lineTo(cx, y + size);
        ctx.lineTo(x, cy);
        break;
      case 'cross':
        const w = size * 0.35;
        const inset = (size - w) / 2;
        ctx.rect(x + inset, y, w, size);
        ctx.rect(x, y + inset, size, w);
        break;
      case 'square':
      default:
        ctx.rect(x, y, size + 0.5, size + 0.5); // +0.5 to prevent sub-pixel rendering gaps
        break;
    }
    
    ctx.fill();
    ctx.closePath();
  };

  const roundRectAdvanced = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number) => {
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
  };

  const generateQR = useCallback(async () => {
    if (!text) {
      setGeneratedBase64('');
      return;
    }

    try {
      const qrData = QRCode.create(text, {
        errorCorrectionLevel: errorLevel
      });

      const canvas = canvasRef.current;
      if (!canvas) return;

      const size = qrSize; // User selected resolution
      const margin = 2;
      const modules = qrData.modules;
      const moduleCount = modules.size;
      const cellSize = size / (moduleCount + margin * 2);
      
      const scaleFactor = qrSize / 1000;
      let extraHeight = 0;
      let qrOffsetY = 0;

      const renderLabelSize = labelSize * scaleFactor;

      if (labelText) {
          extraHeight = renderLabelSize * 2.5; 
      }

      const totalWidth = size;
      const totalHeight = size + extraHeight;

      canvas.width = totalWidth;
      canvas.height = totalHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill Background
      const bgFill = getFillStyle(ctx, totalWidth, totalHeight, bgColorMode, bgGradientType, bgColor1, bgColor2);
      ctx.fillStyle = bgFill;
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Determine QR Y-Offset based on text position
      if (labelText && labelPosition === 'top') {
          qrOffsetY = extraHeight;
      }

      const fgFill = getFillStyle(ctx, size, size, fgColorMode, fgGradientType, fgColor1, fgColor2); 
      ctx.fillStyle = fgFill;

      const offset = margin * cellSize;

      // Logo bounds logic
      let logoStart = -1;
      let logoEnd = -1;
      const logoScale = logoSize / 100;

      if (logo) {
         const center = moduleCount / 2;
         const logoModuleSize = Math.ceil((size * logoScale) / cellSize);
         // Ensure odd size for better centering
         const adjustedSize = logoModuleSize % 2 === 0 ? logoModuleSize + 1 : logoModuleSize;
         
         logoStart = Math.floor(center - adjustedSize / 2);
         logoEnd = Math.ceil(center + adjustedSize / 2);
      }

      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          
          // Skip modules that are under the logo "Quiet Zone"
          if (logo && r >= logoStart && r < logoEnd && c >= logoStart && c < logoEnd) {
             continue;
          }

          // Check for Finder Pattern Zones (7x7 in corners)
          const isFinderPattern = 
              (r < 7 && c < 7) || 
              (r < 7 && c >= moduleCount - 7) || 
              (r >= moduleCount - 7 && c < 7);

          if (isFinderPattern) continue;

          if (modules.get(r, c)) {
            const x = offset + c * cellSize;
            const y = qrOffsetY + offset + r * cellSize;
            drawModule(ctx, x, y, cellSize, dotStyle);
          }
        }
      }

      // Draw Finder Patterns (Eyes) explicitly
      drawFinderPattern(ctx, offset, qrOffsetY + offset, cellSize, eyeStyle);
      drawFinderPattern(ctx, offset + (moduleCount - 7) * cellSize, qrOffsetY + offset, cellSize, eyeStyle);
      drawFinderPattern(ctx, offset, qrOffsetY + offset + (moduleCount - 7) * cellSize, cellSize, eyeStyle);

      // Draw Logo
      if (logo) {
        const logoImg = new Image();
        // Removed crossOrigin to avoid Tainted Canvas errors with Data URLs in some browsers
        logoImg.src = logo;
        
        await new Promise((resolve) => {
          if (logoImg.complete) {
              resolve(true);
          } else {
              logoImg.onload = () => resolve(true);
              logoImg.onerror = () => resolve(false);
          }
        });

        const logoSizePx = size * logoScale;
        const logoX = (size - logoSizePx) / 2;
        const logoY = qrOffsetY + (size - logoSizePx) / 2;
        
        ctx.save();
        
        if (logoShape !== 'none') {
            ctx.beginPath();
            if (logoShape === 'circle') {
                ctx.arc(logoX + logoSizePx/2, logoY + logoSizePx/2, logoSizePx/2, 0, Math.PI * 2);
            } else if (logoShape === 'rounded') {
                // Use robust path fallback instead of ctx.roundRect for compatibility
                roundRectPath(ctx, logoX, logoY, logoSizePx, logoSizePx, logoSizePx * 0.2); 
            } else {
                ctx.rect(logoX, logoY, logoSizePx, logoSizePx);
            }
            ctx.clip();
        }
        
        ctx.drawImage(logoImg, logoX, logoY, logoSizePx, logoSizePx);
        ctx.restore();
      }

      // Draw Label Text
      if (labelText) {
         ctx.fillStyle = labelColor;
         ctx.font = `bold ${renderLabelSize}px ${labelFont}`;
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         
         const textX = totalWidth / 2;
         let textY = 0;
         if (labelPosition === 'top') {
             textY = extraHeight / 2;
         } else {
             textY = size + extraHeight / 2;
         }
         
         ctx.fillText(labelText, textX, textY);
      }

      setGeneratedBase64(canvas.toDataURL('image/png'));

    } catch (err) {
      console.error("QR Generation failed", err);
    }
  }, [text, fgColor1, fgColor2, fgColorMode, fgGradientType, bgColor1, bgColor2, bgColorMode, bgGradientType, errorLevel, dotStyle, eyeStyle, logo, logoSize, logoShape, labelText, labelPosition, labelSize, labelColor, labelFont, qrSize]);

  useEffect(() => {
    const timer = setTimeout(() => {
      generateQR();
    }, 300);
    return () => clearTimeout(timer);
  }, [generateQR]);

  const handleDownload = () => {
    if (!generatedBase64) return;
    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = generatedBase64;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onGenerate({
      id: crypto.randomUUID(),
      data: text,
      timestamp: Date.now(),
      base64: generatedBase64
    });
  };

  const copyToClipboard = async () => {
    if(!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch(e) {
      console.error("Copy failed", e);
    }
  }

  const renderColorControls = (
    label: string, 
    mode: ColorMode, 
    setMode: (m: ColorMode) => void,
    c1: string, 
    setC1: (c: string) => void,
    c2: string, 
    setC2: (c: string) => void,
    gType: GradientType,
    setGType: (t: GradientType) => void
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
        <div className="flex bg-dark-950 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => setMode('solid')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'solid' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Solid
          </button>
          <button
            onClick={() => setMode('gradient')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${mode === 'gradient' ? 'bg-mask-gradient text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Gradient
          </button>
        </div>
      </div>

      {mode === 'solid' ? (
        <div className="flex items-center gap-3 bg-dark-950 p-3 rounded-xl border border-gray-700">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-600 shadow-inner">
            <input 
              type="color" 
              value={c1} 
              onChange={(e) => setC1(e.target.value)} 
              className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-none"
            />
          </div>
          <div className="flex-1">
            <span className="text-sm font-mono text-gray-300 block mb-1">Color Code</span>
            <input 
              type="text" 
              value={c1}
              onChange={(e) => setC1(e.target.value)}
              className="bg-transparent border-none text-gray-400 text-xs font-mono focus:ring-0 p-0 w-full uppercase"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'vertical', icon: MoveDown, label: 'Vert' },
                { id: 'horizontal', icon: MoveRight, label: 'Horiz' },
                { id: 'diagonal', icon: MoveDiagonal, label: 'Diag' },
                { id: 'radial', icon: Circle, label: 'Radial' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setGType(type.id as GradientType)}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border transition-all ${
                    gType === type.id
                      ? 'bg-mask-cyan/10 border-mask-cyan text-mask-cyan'
                      : 'bg-dark-950 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                    <type.icon size={16} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 bg-dark-950 p-2 rounded-xl border border-gray-700">
                  <input type="color" value={c1} onChange={e => setC1(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                  <span className="text-xs font-mono text-gray-400">Start</span>
              </div>
              <div className="flex-1 flex items-center gap-3 bg-dark-950 p-2 rounded-xl border border-gray-700">
                  <input type="color" value={c2} onChange={e => setC2(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" />
                  <span className="text-xs font-mono text-gray-400">End</span>
              </div>
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full w-full overflow-y-auto p-4 pb-24 md:pb-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-mask-gradient-text mb-6 font-mono">Creator Studio</h2>
      
      <canvas ref={canvasRef} className="hidden" />

      <div className="bg-dark-800 rounded-2xl shadow-xl border border-dark-800 overflow-hidden">
        
        {/* Main Tabs */}
        <div className="flex border-b border-gray-700">
          <button 
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'content' ? 'bg-dark-700 text-mask-cyan border-b-2 border-mask-cyan' : 'text-gray-400 hover:text-white'}`}
          >
            <TypeIcon size={16} /> Content
          </button>
          <button 
            onClick={() => setActiveTab('style')}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'style' ? 'bg-dark-700 text-mask-cyan border-b-2 border-mask-cyan' : 'text-gray-400 hover:text-white'}`}
          >
            <Palette size={16} /> Style & Logo
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* CONTENT TAB */}
          {activeTab === 'content' && (
            <div className="animate-fade-in space-y-6">
              {/* Content Type Selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {[
                  { id: 'text', icon: FileText, label: 'Text' },
                  { id: 'url', icon: Link, label: 'URL' },
                  { id: 'wifi', icon: Wifi, label: 'WiFi' },
                  { id: 'email', icon: Mail, label: 'Email' },
                  { id: 'vcard', icon: UserSquare, label: 'Contact' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setContentType(type.id as QRContentType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm whitespace-nowrap transition-all ${
                      contentType === type.id 
                        ? 'bg-mask-gradient text-white border-transparent' 
                        : 'bg-dark-950 text-gray-400 border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <type.icon size={14} />
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Dynamic Forms */}
              <div className="bg-dark-950/50 p-4 rounded-xl border border-gray-800">
                {contentType === 'text' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Plain Text</label>
                    <textarea
                      value={text}
                      onChange={(e) => { setText(e.target.value); }}
                      placeholder="Enter text content..."
                      className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none h-32 resize-none text-sm font-mono"
                    />
                  </div>
                )}

                {contentType === 'url' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Website URL</label>
                    <div className="flex items-center gap-2 bg-dark-950 border border-gray-700 rounded-lg p-3 focus-within:ring-2 focus-within:ring-mask-cyan">
                      <Globe size={16} className="text-gray-500" />
                      <input
                        type="url"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-transparent outline-none text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                )}

                {contentType === 'wifi' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Network Name (SSID)</label>
                      <input
                        type="text"
                        value={wifiData.ssid}
                        onChange={(e) => setWifiData({...wifiData, ssid: e.target.value})}
                        className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                        placeholder="MyWiFi"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Password</label>
                        <input
                          type="text"
                          value={wifiData.password}
                          onChange={(e) => setWifiData({...wifiData, password: e.target.value})}
                          className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                          placeholder="Password"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Encryption</label>
                        <select
                           value={wifiData.encryption}
                           onChange={(e) => setWifiData({...wifiData, encryption: e.target.value as any})}
                           className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm appearance-none"
                        >
                          <option value="WPA">WPA/WPA2</option>
                          <option value="WEP">WEP</option>
                          <option value="nopass">None</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {contentType === 'email' && (
                  <div className="space-y-4">
                     <div>
                      <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Email Address</label>
                      <input
                        type="email"
                        value={emailData.email}
                        onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                        className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                )}

                {contentType === 'vcard' && (
                   <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">First Name</label>
                          <input
                            type="text"
                            value={vcardData.firstName}
                            onChange={(e) => setVcardData({...vcardData, firstName: e.target.value})}
                            className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Last Name</label>
                          <input
                            type="text"
                            value={vcardData.lastName}
                            onChange={(e) => setVcardData({...vcardData, lastName: e.target.value})}
                            className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                          />
                        </div>
                      </div>
                      <div>
                           <label className="block text-xs font-medium text-gray-400 mb-2 uppercase">Mobile</label>
                           <input
                            type="tel"
                            value={vcardData.phone}
                            onChange={(e) => setVcardData({...vcardData, phone: e.target.value})}
                            className="w-full bg-dark-950 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                          />
                      </div>
                   </div>
                )}
              </div>

              <div className="bg-dark-900/50 p-4 rounded-lg border border-gray-700/50">
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-mask-cyan/10 rounded-lg text-mask-cyan mt-1">
                     <RefreshCw size={16} />
                   </div>
                   <div>
                     <h4 className="text-sm font-medium text-gray-200">Real-time Preview</h4>
                     <p className="text-xs text-gray-400 mt-1">
                       The QR code updates automatically as you type. 
                       <br/>
                       <span className="opacity-70 font-mono mt-1 block truncate max-w-[250px]">{text || 'Waiting for input...'}</span>
                     </p>
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* STYLE TAB */}
          {activeTab === 'style' && (
            <div className="animate-fade-in space-y-8">
              
              {/* Size / Resolution Control */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Output Size & Quality</label>
                <div className="bg-dark-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-300 font-mono">{qrSize} x {qrSize} px</span>
                        <Maximize size={16} className="text-gray-500"/>
                    </div>
                    <input 
                        type="range" 
                        min="500" 
                        max="2000" 
                        step="100"
                        value={qrSize}
                        onChange={(e) => setQrSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-mask-lime"
                    />
                    <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
                        <span>Low (500px)</span>
                        <span>High (2000px)</span>
                    </div>
                </div>
              </div>

              {/* Foreground Controls */}
              {renderColorControls(
                "Foreground", 
                fgColorMode, setFgColorMode, 
                fgColor1, setFgColor1, 
                fgColor2, setFgColor2, 
                fgGradientType, setFgGradientType
              )}

              <div className="h-px bg-gray-700/50"></div>

              {/* Background Controls */}
              {renderColorControls(
                "Background", 
                bgColorMode, setBgColorMode, 
                bgColor1, setBgColor1, 
                bgColor2, setBgColor2, 
                bgGradientType, setBgGradientType
              )}

              <div className="h-px bg-gray-700/50"></div>

              {/* Pattern & Settings Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Pattern</label>
                  <div className="relative">
                    <select
                      value={dotStyle}
                      onChange={(e) => setDotStyle(e.target.value as DotStyle)}
                      className="w-full bg-dark-950 border border-gray-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-mask-cyan outline-none appearance-none text-sm cursor-pointer h-[42px]"
                    >
                      <option value="square">Square</option>
                      <option value="rounded">Rounded</option>
                      <option value="extra-rounded">Extra Rounded</option>
                      <option value="dots">Dots</option>
                      <option value="classy">Classy</option>
                      <option value="classy-inverted">Classy Inverted</option>
                      <option value="diamond">Diamond</option>
                      <option value="cross">Cross</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Eye Style */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Eye Style</label>
                  <div className="relative">
                    <select
                      value={eyeStyle}
                      onChange={(e) => setEyeStyle(e.target.value as EyeStyle)}
                      className="w-full bg-dark-950 border border-gray-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-mask-cyan outline-none appearance-none text-sm cursor-pointer h-[42px]"
                    >
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                      <option value="rounded">Rounded</option>
                      <option value="leaf">Leaf</option>
                    </select>
                    <Eye className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>

                {/* Error Level */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">Correction</label>
                  <div className="relative">
                    <select
                      value={errorLevel}
                      onChange={(e) => setErrorLevel(e.target.value as any)}
                      disabled={!!logo}
                      className={`w-full bg-dark-950 border border-gray-700 rounded-xl p-2.5 text-white focus:ring-2 focus:ring-mask-cyan outline-none appearance-none text-sm h-[42px] ${logo ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <option value="L">Low (7%)</option>
                      <option value="M">Medium (15%)</option>
                      <option value="Q">Quartile (25%)</option>
                      <option value="H">High (30%)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="border-t border-gray-700/50 pt-6">
                <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide">Logo Overlay</label>
                <div className="relative group mb-4">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-4 transition-all flex items-center justify-center gap-3 ${logo ? 'border-mask-lime bg-mask-lime/5' : 'border-gray-700 hover:border-gray-500 bg-dark-950'}`}>
                    {logo ? (
                      <>
                        <img src={logo} alt="Logo preview" className="w-10 h-10 object-contain rounded" />
                        <span className="text-sm text-mask-lime font-medium">Logo Uploaded</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault(); 
                            setLogo(null);
                            setErrorLevel('M');
                          }} 
                          className="z-20 p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="p-2 bg-dark-800 rounded-lg text-gray-400">
                          <ImageIcon size={20} />
                        </div>
                        <span className="text-sm text-gray-400 group-hover:text-gray-300">Click to upload logo</span>
                      </>
                    )}
                  </div>
                </div>

                {logo && (
                    <div className="space-y-4 animate-fade-in bg-dark-950 p-4 rounded-xl border border-gray-800">
                        {/* Logo Shape */}
                        <div>
                             <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Shape / Crop</label>
                             <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'rounded', icon: AppWindow, label: 'Round' },
                                    { id: 'square', icon: Square, label: 'Square' },
                                    { id: 'circle', icon: Circle, label: 'Circle' },
                                    { id: 'none', icon: ImageIcon, label: 'Original' },
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setLogoShape(s.id as LogoShape)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${logoShape === s.id ? 'bg-gray-700 border-gray-500 text-white' : 'border-gray-800 text-gray-500 hover:bg-dark-900'}`}
                                        title={s.id === 'none' ? 'No Background / Original' : s.label}
                                    >
                                        <s.icon size={16} />
                                    </button>
                                ))}
                             </div>
                             {logoShape === 'none' && (
                                 <p className="text-[10px] text-mask-cyan mt-2">
                                     * Original shape preserves transparency (no background).
                                 </p>
                             )}
                        </div>
                    </div>
                )}
              </div>

              {/* Label / Text Editor */}
              <div className="border-t border-gray-700/50 pt-6">
                 <label className="block text-xs font-medium text-gray-400 mb-4 uppercase tracking-wide flex items-center gap-2">
                    <TypeIcon size={14} /> Label Text
                 </label>
                 <div className="space-y-4">
                    <input 
                      type="text" 
                      value={labelText}
                      onChange={(e) => setLabelText(e.target.value)}
                      className="w-full bg-dark-950 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-mask-cyan outline-none text-sm"
                      placeholder="Add text (e.g. Scan Me!)"
                    />
                    
                    {labelText && (
                      <div className="animate-fade-in space-y-5 bg-dark-950 p-4 rounded-xl border border-gray-800">
                         {/* Position & Font Row */}
                         <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Position</label>
                                <div className="flex bg-dark-900 rounded-lg p-1 border border-gray-700">
                                  <button
                                    onClick={() => setLabelPosition('top')}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${labelPosition === 'top' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                                  >
                                    Top
                                  </button>
                                  <button
                                    onClick={() => setLabelPosition('bottom')}
                                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${labelPosition === 'bottom' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
                                  >
                                    Bottom
                                  </button>
                                </div>
                             </div>
                             <div>
                                <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Font</label>
                                <div className="relative">
                                  <select
                                    value={labelFont}
                                    onChange={(e) => setLabelFont(e.target.value)}
                                    className="w-full bg-dark-900 border border-gray-700 rounded-lg p-1.5 text-white text-xs outline-none appearance-none h-[34px]"
                                  >
                                    <option value="Inter, sans-serif">Sans Serif</option>
                                    <option value="Times New Roman, serif">Serif</option>
                                    <option value="JetBrains Mono, monospace">Monospace</option>
                                    <option value="Impact, sans-serif">Impact</option>
                                    <option value="Brush Script MT, cursive">Cursive</option>
                                  </select>
                                </div>
                             </div>
                         </div>
                         
                         {/* Size Slider */}
                         <div>
                            <div className="flex justify-between mb-1">
                              <label className="text-[10px] text-gray-500 uppercase font-bold">Size</label>
                              <span className="text-[10px] text-gray-400">{labelSize}px</span>
                            </div>
                            <input 
                              type="range" 
                              min="20" 
                              max="120" 
                              value={labelSize}
                              onChange={(e) => setLabelSize(Number(e.target.value))}
                              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-mask-lime"
                            />
                         </div>
                         
                         {/* Color Picker */}
                         <div>
                            <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Text Color</label>
                            <div className="flex items-center gap-3">
                               <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-600">
                                  <input 
                                    type="color" 
                                    value={labelColor} 
                                    onChange={(e) => setLabelColor(e.target.value)} 
                                    className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer p-0 border-none"
                                  />
                               </div>
                               <input 
                                 type="text" 
                                 value={labelColor}
                                 onChange={(e) => setLabelColor(e.target.value)}
                                 className="flex-1 bg-dark-900 border border-gray-700 rounded-lg p-1.5 text-white text-xs font-mono uppercase"
                               />
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* RESULT PREVIEW AREA */}
      {generatedBase64 && (
        <div className="mt-8 flex flex-col items-center animate-fade-in pb-8">
          <div className="relative group">
            <div className="absolute -inset-1 bg-mask-gradient rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative bg-white p-4 rounded-xl shadow-2xl">
              <img src={generatedBase64} alt="Generated QR" className="w-64 h-64 object-contain" />
            </div>
          </div>

          <div className="flex gap-4 mt-8 w-full max-w-sm">
             <button 
               onClick={handleDownload}
               className="flex-1 flex items-center justify-center gap-2 bg-mask-gradient hover:opacity-90 text-white px-6 py-3 rounded-xl font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg"
             >
               <Download size={20} />
               <span>Download</span>
             </button>
             
             <button 
               onClick={copyToClipboard}
               className="flex items-center justify-center gap-2 bg-dark-800 hover:bg-dark-700 text-gray-200 px-6 py-3 rounded-xl font-medium transition-all border border-gray-700"
             >
               {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
             </button>
          </div>
        </div>
      )}
      
      {!text && activeTab === 'content' && (
        <div className="mt-12 text-center text-gray-500">
           <p className="flex items-center justify-center gap-2 opacity-50"><Upload size={16}/> Enter text to start</p>
        </div>
      )}
      
      {/* Branding Footer */}
      <div className="py-8 flex justify-center opacity-60">
        <p className="text-[10px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-mask-gradient-text uppercase">
          Created by Mask Intelligence
        </p>
      </div>
    </div>
  );
};

export default Generator;