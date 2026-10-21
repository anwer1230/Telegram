import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  Sliders,
  Check,
  Crop,
  Sparkles,
  Download,
  Send,
  Undo2,
} from 'lucide-react';

export interface PhotoEditorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (editedBlob: Blob, dataUrl: string) => void;
  isArabic?: boolean;
}

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  isOpen,
  imageUrl,
  onClose,
  onSave,
  isArabic = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [filter, setFilter] = useState<'none' | 'grayscale' | 'sepia' | 'invert' | 'vintage' | 'cool'>('none');
  const [rotation, setRotation] = useState<number>(0);
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setFilter('none');
      setRotation(0);
      setIsFlippedH(false);
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (!imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rad = (rotation * Math.PI) / 180;
    const isSideways = rotation % 180 !== 0;
    const w = isSideways ? imageObj.height : imageObj.width;
    const h = isSideways ? imageObj.width : imageObj.height;

    canvas.width = w;
    canvas.height = h;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    if (isFlippedH) ctx.scale(-1, 1);

    // Apply CSS filters directly to canvas context
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (filter === 'grayscale') filterString += ' grayscale(100%)';
    else if (filter === 'sepia') filterString += ' sepia(100%)';
    else if (filter === 'invert') filterString += ' invert(100%)';
    else if (filter === 'vintage') filterString += ' sepia(50%) contrast(120%)';
    else if (filter === 'cool') filterString += ' hue-rotate(180deg)';

    ctx.filter = filterString;
    ctx.drawImage(imageObj, -imageObj.width / 2, -imageObj.height / 2);
    ctx.restore();
  }, [imageObj, brightness, contrast, saturation, filter, rotation, isFlippedH]);

  if (!isOpen || !imageUrl) return null;

  const handleApply = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const dataUrl = canvasRef.current!.toDataURL('image/jpeg', 0.92);
        onSave(blob, dataUrl);
      }
    }, 'image/jpeg', 0.92);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFilter('none');
    setRotation(0);
    setIsFlippedH(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl bg-[#17212b] border border-[#2b394a] rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm text-white">
              {isArabic ? 'محرر الصور المتقدم (Canvas Photo Editor)' : 'Canvas Photo Editor'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Display Viewport */}
        <div className="flex-1 min-h-[280px] max-h-[50vh] p-4 flex items-center justify-center bg-black/40 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-h-full max-w-full object-contain rounded-xl shadow-lg border border-white/5"
          />
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#111922]">
          {/* Quick Transform Controls */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 flex items-center gap-1.5 transition-colors"
                title={isArabic ? 'تدوير لليسار' : 'Rotate left'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>-90°</span>
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 flex items-center gap-1.5 transition-colors"
                title={isArabic ? 'تدوير لليمين' : 'Rotate right'}
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>+90°</span>
              </button>
              <button
                onClick={() => setIsFlippedH((f) => !f)}
                className={`px-2.5 py-1.5 rounded-xl text-gray-200 flex items-center gap-1.5 transition-colors ${
                  isFlippedH ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40' : 'bg-white/5 hover:bg-white/10'
                }`}
                title={isArabic ? 'عكس أفقي' : 'Flip horizontal'}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{isArabic ? 'مرآة' : 'Flip'}</span>
              </button>
              <button
                onClick={handleReset}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
                title={isArabic ? 'إعادة ضبط' : 'Reset'}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{isArabic ? 'استعادة' : 'Reset'}</span>
              </button>
            </div>

            {/* Filter Presets */}
            <div className="flex items-center gap-1">
              {[
                { id: 'none', labelAr: 'طبيعي', labelEn: 'Normal' },
                { id: 'grayscale', labelAr: 'أبيض وأسود', labelEn: 'B&W' },
                { id: 'sepia', labelAr: 'دافئ (Sepia)', labelEn: 'Sepia' },
                { id: 'vintage', labelAr: 'كلاسيكي', labelEn: 'Vintage' },
                { id: 'cool', labelAr: 'بارد', labelEn: 'Cool' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    filter === f.id
                      ? 'bg-[#2481cc] text-white shadow-sm font-semibold'
                      : 'bg-white/5 hover:bg-white/10 text-gray-300'
                  }`}
                >
                  {isArabic ? f.labelAr : f.labelEn}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders (Brightness & Contrast) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-16 shrink-0">{isArabic ? 'السطوع' : 'Brightness'}</span>
              <input
                type="range"
                min="40"
                max="180"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="flex-1 accent-[#2481cc] cursor-pointer"
              />
              <span className="font-mono text-gray-400 w-9 text-right">{brightness}%</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-16 shrink-0">{isArabic ? 'التباين' : 'Contrast'}</span>
              <input
                type="range"
                min="40"
                max="180"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="flex-1 accent-[#2481cc] cursor-pointer"
              />
              <span className="font-mono text-gray-400 w-9 text-right">{contrast}%</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-[#17212b]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[#2481cc] hover:bg-[#1f70b3] active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-950/50 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isArabic ? 'اعتماد وإرسال الصورة' : 'Apply & Send'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
