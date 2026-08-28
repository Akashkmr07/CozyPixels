import React, { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

export const VideoBackgroundPlayer = ({ initialUrl }) => {
  const [videoUrl, setVideoUrl] = React.useState(initialUrl);

  useEffect(() => {
    let unlisten;
    const setupListener = async () => {
      unlisten = await listen('change-video', (event) => {
        if (event.payload) {
          setVideoUrl(event.payload);
        }
      });
    };
    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  if (!videoUrl) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black', margin: 0 }}>
      <video 
        src={videoUrl} 
        autoPlay 
        loop 
        muted 
        playsInline 
        style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', margin: 0 }}
      />
    </div>
  );
};
