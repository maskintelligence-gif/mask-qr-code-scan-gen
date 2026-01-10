import React, { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCcw, AlertTriangle, Zap, ZapOff, Image as ImageIcon } from 'lucide-react';
import { ScanResult } from '../types';

interface ScannerProps {
  onScan: (data: string, image?: string) => void;
  isActive: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // Visible overlay canvas
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Offscreen processing
  const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string>('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  // Torch/Flashlight state
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  
  // Front camera & Screen flash state
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [isScreenFlashOn, setIsScreenFlashOn] = useState(false);
  
  // Clean up stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        // Ensure torch is off when stream stops
        if ('torch' in track.getSettings()) {
            track.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Initialize Camera
  const startCamera = useCallback(async (deviceId?: string) => {
    // Reset states
    setHasPermission(null);
    setPermissionError('');
    setHasTorch(false);
    setIsTorchOn(false);
    setIsScreenFlashOn(false);
    stopStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          facingMode: deviceId ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream; // Store reference to stop later
      
      const track = stream.getVideoTracks()[0];
      if (track) {
        // Detect Torch Capability
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        if ('torch' in capabilities) {
          setHasTorch(true);
        }

        // Detect Front Camera
        const settings = track.getSettings();
        const isFront = settings.facingMode === 'user' || track.label.toLowerCase().includes('front');
        setIsFrontCamera(isFront);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // iOS support
        
        // Wait for video to load to avoid black screen
        await new Promise((resolve) => {
            if (!videoRef.current) return resolve(false);
            videoRef.current.onloadedmetadata = () => resolve(true);
        });

        await videoRef.current.play();
        setHasPermission(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setHasPermission(false);
      
      // Determine user-friendly error message
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError("Camera permission denied. Please allow camera access in your browser settings.");
      } else if (err.name === 'NotFoundError') {
        setPermissionError("No camera device found on this device.");
      } else if (err.name === 'NotReadableError') {
        setPermissionError("Camera is currently in use by another application.");
      } else {
        setPermissionError(err.message || "Failed to access camera.");
      }
    }
  }, [stopStream]);

  const toggleTorch = async () => {
    if (hasTorch && streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      
      try {
         const targetStatus = !isTorchOn;
         
         // Apply constraint to toggle torch
         await track.applyConstraints({
           advanced: [{ torch: targetStatus } as any]
         });
         
         setIsTorchOn(targetStatus);
      } catch (err) {
         console.error("Failed to toggle torch", err);
         // Fallback: If trying to turn OFF and it failed, try clearing advanced constraints
         if (isTorchOn) {
            try {
                await track.applyConstraints({ advanced: [] });
                setIsTorchOn(false);
            } catch (retryErr) {
                console.error("Retry failed", retryErr);
            }
         }
      }
    } else if (isFrontCamera) {
      // Screen Flash Fallback
      setIsScreenFlashOn(!isScreenFlashOn);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const resultDataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Downsample for performance if needed
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;
        
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
             inversionAttempts: "attemptBoth",
          });

          if (code) {
            setIsScanning(false);
            onScan(code.data, resultDataUrl);
            setScanFeedback(null);
          } else {
            setScanFeedback("No QR code found in image");
            setTimeout(() => setScanFeedback(null), 3000);
          }
        } catch (e) {
          console.error(e);
          setScanFeedback("Could not process image");
          setTimeout(() => setScanFeedback(null), 3000);
        }
      };
      img.src = resultDataUrl;
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Get available devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setCameras(videoDevices);
      } catch (e) {
        console.warn("Could not enumerate devices", e);
      }
    };
    getDevices();
  }, [hasPermission]);

  // Start/Stop based on active tab
  useEffect(() => {
    let mounted = true;

    if (isActive && isScanning) {
        // Delay slightly to prevent rapid mounting/unmounting issues
        const timer = setTimeout(() => {
            if (mounted) startCamera(activeCameraId || undefined);
        }, 100);
        return () => clearTimeout(timer);
    } else {
        stopStream();
    }

    return () => {
        mounted = false;
        stopStream();
    };
  }, [isActive, isScanning, activeCameraId, startCamera, stopStream]);

  // Scanning Loop
  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      if (!isActive || !isScanning) return;

      const video = videoRef.current;
      const overlayCanvas = canvasRef.current; // Visible canvas (overlays only)
      
      // Lazy init offscreen canvas
      if (!scanCanvasRef.current) {
        scanCanvasRef.current = document.createElement('canvas');
      }
      const scanCanvas = scanCanvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA && overlayCanvas && scanCanvas) {
        
        // 1. Throttle Scanning (every 100ms is enough, 60fps is overkill for QR)
        const now = Date.now();
        const shouldScan = (now - lastScanTimeRef.current) > 100;

        if (shouldScan) {
           lastScanTimeRef.current = now;

           // Optimize: Downsample for scanning. 
           // 720p or 1080p is too big for jsQR to crunch 60fps on mobile.
           // Scale down to max 800px width while maintaining aspect ratio.
           const scale = Math.min(1, 800 / video.videoWidth);
           const scanW = video.videoWidth * scale;
           const scanH = video.videoHeight * scale;
           
           if (scanCanvas.width !== scanW || scanCanvas.height !== scanH) {
             scanCanvas.width = scanW;
             scanCanvas.height = scanH;
           }

           // Use 'willReadFrequently' for performance optimization
           const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
           
           if (scanCtx) {
             // Pre-processing for better accuracy:
             // 1. Grayscale: Reduces noise from color channels.
             // 2. Contrast: Enhances the difference between light and dark modules.
             scanCtx.filter = 'grayscale(100%) contrast(125%)';

             scanCtx.drawImage(video, 0, 0, scanW, scanH);
             const imageData = scanCtx.getImageData(0, 0, scanW, scanH);
             
             // Inversion attempts help with white-on-black QR codes
             const code = jsQR(imageData.data, imageData.width, imageData.height, {
               inversionAttempts: "attemptBoth",
             });

             // 2. Update Overlay Canvas (Synchronize with video size)
             if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
                overlayCanvas.width = video.videoWidth;
                overlayCanvas.height = video.videoHeight;
             }

             const overlayCtx = overlayCanvas.getContext('2d');
             if (overlayCtx) {
               // Clear previous drawings
               overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

               if (code && code.data) {
                 // Draw box (Need to scale coordinates back up if we downsampled)
                 const invScale = 1 / scale;
                 
                 // Brand Gradient for QR Detection Box
                 const gradient = overlayCtx.createLinearGradient(0, 0, overlayCanvas.width, overlayCanvas.height);
                 gradient.addColorStop(0, "#22d3ee");
                 gradient.addColorStop(0.5, "#a3e635");
                 gradient.addColorStop(1, "#f97316");

                 overlayCtx.lineWidth = 5;
                 overlayCtx.strokeStyle = gradient;
                 overlayCtx.lineJoin = 'round';
                 
                 overlayCtx.beginPath();
                 overlayCtx.moveTo(code.location.topLeftCorner.x * invScale, code.location.topLeftCorner.y * invScale);
                 overlayCtx.lineTo(code.location.topRightCorner.x * invScale, code.location.topRightCorner.y * invScale);
                 overlayCtx.lineTo(code.location.bottomRightCorner.x * invScale, code.location.bottomRightCorner.y * invScale);
                 overlayCtx.lineTo(code.location.bottomLeftCorner.x * invScale, code.location.bottomLeftCorner.y * invScale);
                 overlayCtx.lineTo(code.location.topLeftCorner.x * invScale, code.location.topLeftCorner.y * invScale);
                 overlayCtx.stroke();

                 if (navigator.vibrate) navigator.vibrate(50);
                 
                 setIsScanning(false);
                 onScan(code.data);
               }
             }
           }
        }
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isActive && isScanning) {
      animationFrameId = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isActive, isScanning, onScan]);

  const switchCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.deviceId === activeCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setActiveCameraId(cameras[nextIndex].deviceId);
    }
  };

  const resumeScanning = () => {
    setIsScanning(true);
    setScanFeedback(null);
  };

  // If tab not active, don't render video processing to save battery
  if (!isActive) return null;

  return (
    <div className="relative h-full w-full flex flex-col bg-black">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileUpload} 
      />

      {hasPermission === false && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center bg-dark-950">
          <div className="bg-dark-900 p-8 rounded-2xl border border-red-500/20 shadow-2xl max-w-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
            <p className="text-gray-400 mb-6">{permissionError}</p>
            <button 
              onClick={() => startCamera(activeCameraId || undefined)}
              className="bg-bg-mask-gradient hover:opacity-90 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg active:scale-95 flex items-center gap-2"
            >
              <RefreshCcw size={18} />
              Try Again
            </button>
          </div>
        </div>
      )}
      
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* The video element provides the smooth 60fps preview */}
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover" 
          muted 
        />
        {/* The canvas is transparent and only used for drawing the detection box */}
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
        />
        
        {/* UI Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center overflow-hidden">
             
             {/* Dark/Light Mask */}
             <div 
               className="absolute inset-0 transition-colors duration-300"
               style={{
                 boxShadow: isScreenFlashOn 
                   ? 'inset 0 0 0 4000px rgba(255, 255, 255, 1)' 
                   : 'inset 0 0 0 4000px rgba(0, 0, 0, 0.5)'
               }}
             ></div>

             {/* Scan Marker */}
             <div className="relative w-64 h-64 z-20">
                {/* Border Frame */}
                <div className={`absolute inset-0 border-2 rounded-lg transition-colors duration-300 ${isScreenFlashOn ? 'border-black/10' : 'border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]'}`}></div>
                
                {isScanning && hasPermission && !isScreenFlashOn && <div className="scan-overlay"></div>}
                
                {/* Corner Accents - Gradient */}
                <div className={`absolute -top-1 -left-1 w-6 h-6 border-l-4 border-t-4 transition-colors ${isScreenFlashOn ? 'border-mask-orange' : 'border-mask-cyan'}`}></div>
                <div className={`absolute -top-1 -right-1 w-6 h-6 border-r-4 border-t-4 transition-colors ${isScreenFlashOn ? 'border-mask-orange' : 'border-mask-cyan'}`}></div>
                <div className={`absolute -bottom-1 -left-1 w-6 h-6 border-l-4 border-b-4 transition-colors ${isScreenFlashOn ? 'border-mask-orange' : 'border-mask-orange'}`}></div>
                <div className={`absolute -bottom-1 -right-1 w-6 h-6 border-r-4 border-b-4 transition-colors ${isScreenFlashOn ? 'border-mask-orange' : 'border-mask-orange'}`}></div>
             </div>
             
             {/* Feedback Toast */}
             {scanFeedback && (
                <div className="absolute top-32 z-30 bg-red-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-fade-in flex items-center gap-2">
                  <AlertTriangle size={16} /> {scanFeedback}
                </div>
             )}
             
             {!isScanning && hasPermission && !scanFeedback && (
               <div className="mt-8 pointer-events-auto animate-fade-in z-20">
                 <button 
                  onClick={resumeScanning}
                  className="bg-mask-gradient hover:opacity-90 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95"
                 >
                   <RefreshCcw size={20} />
                   Scan Again
                 </button>
               </div>
             )}

             {/* Branding Footer */}
             <div className="absolute bottom-8 z-20 opacity-70">
                <p className="text-[10px] font-bold tracking-[0.2em] text-transparent bg-clip-text bg-mask-gradient-text uppercase">
                  Created by Mask Intelligence
                </p>
             </div>
        </div>

        {/* Camera Controls */}
        <div className="absolute top-6 right-6 z-20 pointer-events-auto flex flex-col gap-4">
          
          {/* Upload Button */}
          <button 
            onClick={triggerFileUpload}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors border border-white/10"
          >
            <ImageIcon size={24} />
          </button>

          {hasPermission && (hasTorch || isFrontCamera) && (
             <button
               onClick={toggleTorch}
               className={`p-3 backdrop-blur-md rounded-full transition-all border border-white/10 ${
                 (isTorchOn || isScreenFlashOn)
                   ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' 
                   : 'bg-black/40 text-white hover:bg-black/60'
               }`}
             >
               {(isTorchOn || isScreenFlashOn) ? <ZapOff size={24} /> : <Zap size={24} />}
             </button>
          )}

          {cameras.length > 1 && hasPermission && (
            <button 
              onClick={switchCamera}
              className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors border border-white/10"
            >
              <Camera size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scanner;