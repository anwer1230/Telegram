import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Plus,
  Play,
  Pause,
  Eye,
  Heart,
  Share2,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Flame,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useTelegram } from '../../context/TelegramContext';
import { Story } from '../../types';

export const StoriesBar: React.FC = () => {
  const { currentUser, showToast } = useTelegram();

  const [stories, setStories] = useState<Story[]>(() => {
    try {
      const saved = localStorage.getItem('tg_user_stories_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strictly filter out any mock/demo stories
          const realStories = parsed.filter(
            (s) =>
              s &&
              s.id &&
              !s.id.startsWith('st_tg_news') &&
              !s.id.startsWith('st_durov') &&
              !s.id.startsWith('st_ton_web3') &&
              s.userName !== 'Telegram News' &&
              s.userName !== 'Pavel Durov' &&
              s.userName !== 'TON Ecosystem'
          );
          if (realStories.length !== parsed.length) {
            localStorage.setItem('tg_user_stories_v1', JSON.stringify(realStories));
          }
          return realStories;
        }
      }
    } catch {}
    return [];
  });

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Story playback timer
  useEffect(() => {
    if (activeStoryIndex === null || isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Go to next story
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex((idx) => (idx !== null ? idx + 1 : null));
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, isPaused, stories.length]);

  const openStory = (idx: number) => {
    setActiveStoryIndex(idx);
    setProgress(0);
    setStories((prev) =>
      prev.map((st, i) => (i === idx ? { ...st, isViewed: true } : st))
    );
  };

  const handleUploadMyStory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const newStory: Story = {
          id: `my-st-${Date.now()}`,
          userId: currentUser.id,
          userName: 'قصتي',
          userAvatar: currentUser.avatar,
          mediaUrl: ev.target.result as string,
          mediaType: file.type.startsWith('video') ? 'video' : 'image',
          caption: '✨ قصة جديدة',
          timestamp: 'الآن',
          expiresAt: Date.now() + 86400000,
          viewsCount: 1,
          isViewed: false,
          isMyStory: true,
        };
        setStories([newStory, ...stories]);
        showToast('تم نشر قصتك بنجاح على سحابة تيليجرام 🌟', '📸');
      }
    };
    reader.readAsDataURL(file);
  };

  const currentStory = activeStoryIndex !== null ? stories[activeStoryIndex] : null;

  return (
    <>
      {/* Horizontal Stories Tray */}
      <div className="px-3 py-2.5 bg-black/20 border-b border-white/10 flex items-center gap-3 overflow-x-auto no-scrollbar select-none">
        {/* Add My Story Button */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
        >
          <div className="relative w-13 h-13 rounded-full p-0.5 border-2 border-dashed border-indigo-400 group-hover:scale-105 transition-transform flex items-center justify-center">
            {currentUser.avatar ? (
              <img
                src={currentUser.avatar}
                alt="My Avatar"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-xs">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs shadow-md">
              <Plus className="w-3 h-3" />
            </div>
          </div>
          <span className="text-[10px] font-medium text-gray-300 group-hover:text-indigo-300">
            قصتك
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleUploadMyStory}
          />
        </div>

        {/* Stories from Contacts & Channels */}
        {stories.map((story, idx) => (
          <div
            key={story.id}
            onClick={() => openStory(idx)}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
          >
            <div
              className={`w-13 h-13 rounded-full p-0.5 transition-transform group-hover:scale-105 ${
                story.isViewed
                  ? 'border-2 border-gray-500'
                  : 'bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500'
              }`}
            >
              {story.userAvatar ? (
                <img
                  src={story.userAvatar}
                  alt={story.userName}
                  className="w-full h-full rounded-full object-cover p-0.5 bg-[#17212b]"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-xs">
                  {story.userName ? story.userName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium text-gray-300 truncate max-w-[55px] text-center">
              {story.userName}
            </span>
          </div>
        ))}
      </div>

      {/* Fullscreen Story Viewer Modal */}
      {currentStory && (
        <div
          className="fixed inset-0 z-[99999] bg-black/95 flex items-center justify-center p-0 select-none animate-in fade-in duration-150"
          dir="rtl"
        >
          {/* Story Container Frame (Mobile/Telegram 9:16 aspect ratio) */}
          <div className="relative w-full max-w-sm h-[90vh] max-h-[800px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col justify-between">
            {/* Progress Bars */}
            <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
              {stories.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-white transition-all duration-100"
                    style={{
                      width:
                        i < activeStoryIndex!
                          ? '100%'
                          : i === activeStoryIndex
                          ? `${progress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header info */}
            <div className="relative z-30 pt-6 px-4 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent pb-4">
              <div className="flex items-center gap-2.5">
                {currentStory.userAvatar ? (
                  <img
                    src={currentStory.userAvatar}
                    alt={currentStory.userName}
                    className="w-9 h-9 rounded-full object-cover border border-white/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#5288c1] flex items-center justify-center text-white font-bold text-xs border border-white/30">
                    {currentStory.userName ? currentStory.userName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold">{currentStory.userName}</h4>
                  <p className="text-[10px] text-gray-300">{currentStory.timestamp}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setActiveStoryIndex(null)}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Media Content */}
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              {currentStory.mediaUrl ? (
                <img
                  src={currentStory.mediaUrl}
                  alt="Story Media"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-gray-400 text-sm">No Media</div>
              )}
            </div>

            {/* Touch navigation zones */}
            <div
              className="absolute inset-y-20 left-0 w-1/3 z-20 cursor-pointer"
              onClick={() => {
                if (activeStoryIndex! > 0) {
                  setActiveStoryIndex(activeStoryIndex! - 1);
                  setProgress(0);
                }
              }}
            />
            <div
              className="absolute inset-y-20 right-0 w-1/3 z-20 cursor-pointer"
              onClick={() => {
                if (activeStoryIndex! < stories.length - 1) {
                  setActiveStoryIndex(activeStoryIndex! + 1);
                  setProgress(0);
                } else {
                  setActiveStoryIndex(null);
                }
              }}
            />

            {/* Caption & Reactions Footer */}
            <div className="relative z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent space-y-3 text-white">
              {currentStory.caption && (
                <p className="text-xs text-gray-100 font-medium leading-relaxed drop-shadow">
                  {currentStory.caption}
                </p>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-300">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{currentStory.viewsCount} مشاهدة</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => showToast('أرسلت تفاعلاً للقصة ❤️', '🔥')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur active:scale-95 transition-transform"
                  >
                    <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
                  </button>
                  <button
                    onClick={() => showToast('تم نسخ رابط القصة', '🔗')}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur active:scale-95 transition-transform"
                  >
                    <Share2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
