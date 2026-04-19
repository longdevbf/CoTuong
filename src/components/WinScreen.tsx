"use client";

interface WinScreenProps {
  message: string;
  onBack: () => void;
  onRestart: () => void;
}

export default function WinScreen({ message, onBack, onRestart }: WinScreenProps) {
  let title = message;
  let subtitle = "";

  if (message === "Đỏ thắng!") {
    title = "Chiến thắng!";
    subtitle = "Bạn có muốn tiếp tục chuỗi thắng không?";
  } else if (message === "Đen thắng!") {
    title = "Thua cuộc!";
    subtitle = "Bạn có muốn phục thù không?";
  } else if (message === "Hòa cờ!") {
    title = "Hòa cờ!";
    subtitle = "Một ván cờ giằng co, chơi lại chứ?";
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-black/80 border border-yellow-500/60 rounded-[2.5rem] px-16 py-12 flex flex-col items-center gap-10 shadow-2xl min-w-[450px]">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-6xl font-extrabold text-yellow-400 tracking-wider drop-shadow-lg" style={{ fontFamily: "serif" }}>{title}</h2>
          <p className="text-xl font-semibold text-yellow-100 tracking-wide mt-2">{subtitle}</p>
        </div>
        
        <div className="flex flex-col gap-4 w-full items-center mt-4">
          <button
            onClick={onRestart}
            className="w-56 py-3 bg-yellow-500 text-black border-2 border-yellow-400 rounded-full text-xl font-bold hover:bg-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] tracking-widest uppercase"
          >
            Chơi lại
          </button>
          <button
            onClick={onBack}
            className="w-56 py-3 bg-transparent text-yellow-300 border-2 border-yellow-600/50 rounded-full text-xl font-bold hover:bg-yellow-600/20 transition-all tracking-widest shadow-sm uppercase"
          >
            Menu
          </button>
        </div>
      </div>
    </div>
  );
}
