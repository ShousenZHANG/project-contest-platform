/**
 * Loading.jsx
 *
 * Full-screen loading state. Migrated to Tailwind + shadcn-aware tokens.
 * Keeps the existing Lottie animation.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import animationData from './loading-animation.json';

function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
      <Player
        autoplay
        loop
        src={animationData}
        style={{ height: 300, width: 300 }}
      />
      <h2 className="mt-5 text-2xl font-semibold tracking-tight drop-shadow-sm">
        Loading, please wait…
      </h2>
    </div>
  );
}

export default Loading;
