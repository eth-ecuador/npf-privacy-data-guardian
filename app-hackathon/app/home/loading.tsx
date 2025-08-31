export default function Loading() {
  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col">
      {/* Mobile Status Bar */}
      <div className="flex justify-between items-center px-6 py-3 text-[#141a21]">
        <div className="text-lg font-medium">9:41</div>
        <div className="flex items-center gap-1">
          {/* Signal bars */}
          <div className="flex items-end gap-1">
            <div className="w-1 h-2 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-3 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-4 bg-[#141a21] rounded-full"></div>
            <div className="w-1 h-4 bg-[#141a21] rounded-full"></div>
          </div>
          {/* WiFi icon */}
          <svg className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 20h.01M8.5 16.5a7 7 0 0 1 7 0M5 13a12 12 0 0 1 14 0M1.5 9.5a18 18 0 0 1 21 0"
              stroke="#141a21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          {/* Battery */}
          <div className="ml-1 w-6 h-3 border border-[#141a21] rounded-sm relative">
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-0.5 h-1.5 bg-[#141a21] rounded-r-sm translate-x-full"></div>
            <div className="w-full h-full bg-[#141a21] rounded-sm"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Animated Gear Icon */}
        <div className="mb-8 gear-slow-spin">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <path d="M60 75c8.284 0 15-6.716 15-15s-6.716-15-15-15-15 6.716-15 15 6.716 15 15 15z" stroke="#3B82F6" strokeWidth="4" fill="none" />
            <path
              d="M60 15c-2.5 0-4.5 2-4.5 4.5v7.5c-3.5 0.5-6.8 1.5-9.8 3l-5.3-5.3c-1.8-1.8-4.7-1.8-6.4 0l-6.4 6.4c-1.8 1.8-1.8 4.7 0 6.4l5.3 5.3c-1.5 3-2.5 6.3-3 9.8h-7.5c-2.5 0-4.5 2-4.5 4.5v9c0 2.5 2 4.5 4.5 4.5h7.5c0.5 3.5 1.5 6.8 3 9.8l-5.3 5.3c-1.8 1.8-1.8 4.7 0 6.4l6.4 6.4c1.8 1.8 4.7 1.8 6.4 0l5.3-5.3c3 1.5 6.3 2.5 9.8 3v7.5c0 2.5 2 4.5 4.5 4.5h9c2.5 0 4.5-2 4.5-4.5v-7.5c3.5-0.5 6.8-1.5 9.8-3l5.3 5.3c1.8 1.8 4.7 1.8 6.4 0l6.4-6.4c1.8-1.8 1.8-4.7 0-6.4l-5.3-5.3c1.5-3 2.5-6.3 3-9.8h7.5c2.5 0 4.5-2 4.5-4.5v-9c0-2.5-2-4.5-4.5-4.5h-7.5c-0.5-3.5-1.5-6.8-3-9.8l5.3-5.3c1.8-1.8 1.8-4.7 0-6.4l-6.4-6.4c-1.8-1.8-4.7-1.8-6.4 0l-5.3 5.3c-3-1.5-6.3-2.5-9.8-3v-7.5c0-2.5-2-4.5-4.5-4.5h-9z"
              stroke="#3B82F6" strokeWidth="4" fill="none"
            />
          </svg>
        </div>

        {/* Loading Text */}
        <h1 className="text-2xl font-medium text-[#141a21] text-center">
          Creating your data vault...
        </h1>
      </div>

      {/* Bottom Progress Indicator */}
      <div className="pb-8 px-6">
        <div className="w-full h-1 bg-[#dfe6f1] rounded-full overflow-hidden relative">
          <div className="absolute top-0 left-1/2 h-full bg-[#3B82F6] rounded-full progress-pingpong" style={{ width: "40%" }}></div>
        </div>
      </div>

      {/* Local animations */}
      <style>{`
        @keyframes slowSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gear-slow-spin {
          animation: slowSpin 2.8s linear infinite;
        }
        
        @keyframes progressBounce {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(60%); }
        }
        .progress-pingpong {
          animation: progressBounce 1.8s ease-in-out infinite alternate;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}

