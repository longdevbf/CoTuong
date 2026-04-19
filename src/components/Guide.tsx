"use client";
import Image from "next/image";

interface GuideProps {
  onBack: () => void;
}

export default function Guide({ onBack }: GuideProps) {
  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      <Image src="/assets/img/bgmanhinhchinh.png" alt="background" fill className="object-cover" />
      <div className="relative z-10 w-4/5 h-4/5">
        <Image src="/assets/img/luatchoi.jpg" alt="Luật chơi" fill className="object-contain rounded-lg shadow-xl" />
        <button
          onClick={onBack}
          className="absolute top-2 right-2 w-10 h-10 z-20"
          aria-label="Đóng"
        >
          <Image src="/assets/img/daux.png" alt="Đóng" width={40} height={40} />
        </button>
      </div>
    </div>
  );
}
