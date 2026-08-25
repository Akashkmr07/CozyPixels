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
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black' }}>
      <video 
        src={videoUrl} 
        autoPlay 
        loop 
        muted 
        playsInline 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  );
};
