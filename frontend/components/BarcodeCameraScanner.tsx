import React, { useRef, useState, useEffect } from 'react';
import { Camera, Delete, CornerDownLeft, X, Sparkles } from 'lucide-react';
import { audioService } from '../services/audioService';
import { normalizeBarcode } from '../services/mockData';

interface Props {
  onScanSuccess: (barcodeValue: string) => void;
}

export const BarcodeCameraScanner: React.FC<Props> = ({ onScanSuccess }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showSoftKeypad, setShowSoftKeypad] = useState(false);

  // Initialize Camera
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isCancelled = false;

    const startCamera = async () => {
      try {
        setCameraError(null);
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isCancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = media;
        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
        }
        setIsScanning(true);
      } catch (err: any) {
        console.warn('Camera stream could not start:', err);
        setCameraError('カメラの起動が許可されていないか、利用できません。');
      }
    };

    startCamera();

    return () => {
      isCancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Web BarcodeDetector API for camera scan
  useEffect(() => {
    if (!isScanning || !videoRef.current) return;
    let animationId: number;

    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    let detector: any = null;

    if (BarcodeDetectorClass) {
      try {
        detector = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'codabar', 'code_128', 'code_39', 'qr_code'],
        });
      } catch (e) {
        // Fallback
      }
    }

    const checkFrame = async () => {
      if (detector && videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawCode = barcodes[0].rawValue;
            if (rawCode) {
              const normalized = normalizeBarcode(rawCode);
              audioService.playTone('SUBTLE_PING');
              onScanSuccess(normalized);
              return;
            }
          }
        } catch {}
      }
      animationId = requestAnimationFrame(checkFrame);
    };

    if (detector) {
      animationId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isScanning, onScanSuccess]);

  const handleExecuteSubmit = (codeToSubmit: string) => {
    const trimmed = codeToSubmit.trim();
    if (trimmed.length >= 4) {
      const normalized = normalizeBarcode(trimmed);
      audioService.playTone('SUBTLE_PING');
      onScanSuccess(normalized);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecuteSubmit(manualCode);
  };

  // Software Keypad handlers
  const handleKeypadPress = (num: string) => {
    audioService.playTone('SUBTLE_PING');
    if (manualCode.length < 20) {
      setManualCode((prev) => prev + num);
    }
  };

  const handleKeypadDelete = () => {
    audioService.playTone('SUBTLE_PING');
    setManualCode((prev) => prev.slice(0, -1));
  };

  const handleKeypadClear = () => {
    audioService.playTone('SUBTLE_PING');
    setManualCode('');
  };

  const handlePresetSample = () => {
    audioService.playTone('SUBTLE_PING');
    setManualCode('298471049218');
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in text-center">
      {/* Video Viewport Container */}
      <div className="relative w-full aspect-4/3 sm:aspect-video bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-400/80 flex items-center justify-center">
        {cameraError ? (
          <div className="p-6 text-slate-300 text-center space-y-2">
            <Camera className="w-12 h-12 text-slate-500 mx-auto" />
            <div className="text-xs font-bold text-amber-300">{cameraError}</div>
            <p className="text-[11px] text-slate-400">
              下の入力欄をタッチして番号をご入力ください。
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-4/5 h-36 border-2 border-amber-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                {/* Red Laser Sweep */}
                <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse" />
                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold text-amber-300 tracking-wider">
                  会員バーコードをカメラの枠内にあわせてください
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Manual Barcode Input */}
      <div className="bg-[#161730] p-4 rounded-3xl border border-[#2c2d54] shadow-xl text-left space-y-3">
        <form onSubmit={handleManualSubmit} className="flex space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              inputMode="none" // Prevent native virtual keyboard conflict so the custom kiosk software keypad is used
              value={manualCode}
              onFocus={() => setShowSoftKeypad(true)}
              onClick={() => setShowSoftKeypad(true)}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="バーコード番号を手入力"
              className="w-full px-4 py-3 text-sm font-mono font-bold bg-[#121329] text-white border-2 border-[#383a6b] rounded-2xl focus:outline-none focus:border-amber-400 transition"
            />
            {manualCode && (
              <button
                type="button"
                onClick={handleKeypadClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                aria-label="クリア"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={manualCode.trim().length < 4}
            className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center ${
              manualCode.trim().length >= 4
                ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md cursor-pointer active:scale-95'
                : 'bg-[#222442] text-slate-500 cursor-not-allowed'
            }`}
          >
            照会
          </button>
        </form>

        {/* On-screen Numeric Software Keypad */}
        {showSoftKeypad && (
          <div className="pt-2 border-t border-[#26284f] space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-bold text-amber-300">タッチして番号を入力してください</span>
              <button
                type="button"
                onClick={() => setShowSoftKeypad(false)}
                className="text-slate-400 hover:text-white text-[11px] font-bold px-2 py-0.5 rounded bg-[#202244] border border-[#30335e]"
              >
                テンキーを閉じる ✕
              </button>
            </div>

            {/* Keypad Grid (3 columns, large touch targets) */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="h-12 sm:h-14 bg-[#1f2042] hover:bg-[#2b2d5c] active:scale-95 text-white text-lg sm:text-xl font-bold font-mono rounded-2xl border border-[#353766] shadow-sm flex items-center justify-center transition cursor-pointer"
                >
                  {digit}
                </button>
              ))}

              {/* Bottom row: [C] [0] [⌫] */}
              <button
                type="button"
                onClick={handleKeypadClear}
                className="h-12 sm:h-14 bg-[#2b1f32] hover:bg-[#3d2948] active:scale-95 text-rose-300 text-sm sm:text-base font-bold rounded-2xl border border-rose-500/30 flex items-center justify-center transition cursor-pointer"
              >
                クリア
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="h-12 sm:h-14 bg-[#1f2042] hover:bg-[#2b2d5c] active:scale-95 text-white text-lg sm:text-xl font-bold font-mono rounded-2xl border border-[#353766] shadow-sm flex items-center justify-center transition cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadDelete}
                className="h-12 sm:h-14 bg-[#1f2042] hover:bg-[#2b2d5c] active:scale-95 text-slate-300 rounded-2xl border border-[#353766] flex items-center justify-center transition cursor-pointer"
                aria-label="1文字削除"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Actions under Keypad: Sample autofill helper & Submit */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePresetSample}
                className="py-2.5 px-3 bg-[#171933] hover:bg-[#22244a] text-slate-300 text-xs font-semibold rounded-xl border border-[#2e315e] transition text-center"
              >
                サンプル番号を入力
              </button>

              <button
                type="button"
                disabled={manualCode.trim().length < 4}
                onClick={() => handleExecuteSubmit(manualCode)}
                className={`py-2.5 px-3 rounded-xl text-xs font-black transition flex items-center justify-center space-x-1.5 ${
                  manualCode.trim().length >= 4
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md cursor-pointer'
                    : 'bg-[#222442] text-slate-500 cursor-not-allowed'
                }`}
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>番号で照会する</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
