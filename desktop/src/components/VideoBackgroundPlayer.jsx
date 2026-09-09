import React, { useEffect, useState, useRef, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';

const TRANSITION_DURATION = 1200; // ms

export const VideoBackgroundPlayer = ({ initialUrl }) => {
  // Track two layers for crossfade: current (bottom) and next (top, fading in)
  const [layers, setLayers] = useState([
    { url: initialUrl, id: 0 }
  ]);
  const [errorMsg, setErrorMsg] = useState(null);
  const idCounter = useRef(1);
  const currentVideoRef = useRef(null);
  const nextVideoRef = useRef(null);
  const [nextReady, setNextReady] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitionTimer = useRef(null);

  useEffect(() => {
    let unlisten;
    const setupListener = async () => {
      unlisten = await listen('change-video', (event) => {
        if (event.payload) {
          setErrorMsg(null);
          const newId = idCounter.current++;
          setLayers(prev => {
            // Keep only the current layer and add the new one on top
            const current = prev[prev.length - 1];
            return [current, { url: event.payload, id: newId }];
          });
          setNextReady(false);
          setTransitioning(false);
        }
      });
    };
    setupListener();
    return () => { if (unlisten) unlisten(); };
  }, []);

  // When the next layer's media is ready, start the crossfade transition
  const handleNextReady = useCallback(() => {
    setNextReady(true);
    setTransitioning(true);

    // After transition completes, remove the bottom layer
    clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      setLayers(prev => {
        if (prev.length > 1) return [prev[prev.length - 1]];
        return prev;
      });
      setTransitioning(false);
      setNextReady(false);
    }, TRANSITION_DURATION + 100);
  }, []);

  useEffect(() => {
    return () => clearTimeout(transitionTimer.current);
  }, []);

  // Debug logging
  useEffect(() => {
    const logs = JSON.parse(localStorage.getItem('debug_video_logs') || '[]');
    logs.push({ time: new Date().toISOString(), layers: layers.map(l => l.url) });
    localStorage.setItem('debug_video_logs', JSON.stringify(logs.slice(-20)));
  }, [layers]);

  const currentLayer = layers[0];
  const nextLayer = layers.length > 1 ? layers[1] : null;

  if (!currentLayer?.url) {
    const logs = JSON.parse(localStorage.getItem('debug_video_logs') || '[]');
    logs.push({ time: new Date().toISOString(), error: "NO VIDEO URL" });
    localStorage.setItem('debug_video_logs', JSON.stringify(logs.slice(-20)));
    return null;
  }

  const isGif = (url) => url ? url.toLowerCase().endsWith('.gif') : false;

  const mediaStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    margin: 0,
    pointerEvents: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: 'black', margin: 0 }}>
      {/* Inject transition keyframes */}
      <style>{`
        @keyframes videoCrossfadeIn {
          0% {
            opacity: 0;
            transform: scale(1.08);
            filter: brightness(1.3) saturate(0.6);
          }
          40% {
            opacity: 0.6;
            transform: scale(1.03);
            filter: brightness(1.1) saturate(0.85);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: brightness(1) saturate(1);
          }
        }
        @keyframes videoInitialFadeIn {
          0% {
            opacity: 0;
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes shimmerOverlay {
          0% {
            opacity: 0;
            background-position: -200% center;
          }
          30% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
            background-position: 200% center;
          }
        }
      `}</style>

      {errorMsg && (
        <div style={{ position: 'absolute', top: 20, left: 20, color: 'red', zIndex: 9999, fontSize: '24px', backgroundColor: 'rgba(0,0,0,0.8)', padding: '10px' }}>
          Video Error: {errorMsg} <br/> URL: {currentLayer.url}
        </div>
      )}

      {/* Bottom layer (current) */}
      {isGif(currentLayer.url) ? (
        <img
          key={`current-${currentLayer.id}`}
          src={currentLayer.url}
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setErrorMsg("Image failed to load")}
          style={{
            ...mediaStyle,
            animation: layers.length === 1 ? `videoInitialFadeIn 800ms ease-out both` : undefined,
          }}
          alt=""
        />
      ) : (
        <video
          ref={currentVideoRef}
          key={`current-${currentLayer.id}`}
          src={currentLayer.url}
          autoPlay
          loop
          muted
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          onError={(e) => setErrorMsg(e.target.error ? `Code ${e.target.error.code}: ${e.target.error.message}` : "Unknown video error")}
          style={{
            ...mediaStyle,
            animation: layers.length === 1 ? `videoInitialFadeIn 800ms ease-out both` : undefined,
          }}
        />
      )}

      {/* Top layer (next — fades in during crossfade) */}
      {nextLayer && (
        isGif(nextLayer.url) ? (
          <img
            key={`next-${nextLayer.id}`}
            src={nextLayer.url}
            onContextMenu={(e) => e.preventDefault()}
            onLoad={handleNextReady}
            onError={() => {
              setErrorMsg("Image failed to load");
              // Fall through to current
              setLayers(prev => prev.length > 1 ? [prev[0]] : prev);
            }}
            style={{
              ...mediaStyle,
              zIndex: 2,
              opacity: nextReady ? 1 : 0,
              animation: nextReady ? `videoCrossfadeIn ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) both` : undefined,
            }}
            alt=""
          />
        ) : (
          <video
            ref={nextVideoRef}
            key={`next-${nextLayer.id}`}
            src={nextLayer.url}
            autoPlay
            loop
            muted
            playsInline
            onContextMenu={(e) => e.preventDefault()}
            onCanPlayThrough={handleNextReady}
            onError={(e) => {
              setErrorMsg(e.target.error ? `Code ${e.target.error.code}: ${e.target.error.message}` : "Unknown video error");
              setLayers(prev => prev.length > 1 ? [prev[0]] : prev);
            }}
            style={{
              ...mediaStyle,
              zIndex: 2,
              opacity: nextReady ? 1 : 0,
              animation: nextReady ? `videoCrossfadeIn ${TRANSITION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) both` : undefined,
            }}
          />
        )
      )}

      {/* Shimmer overlay during transition for premium feel */}
      {transitioning && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 3,
            pointerEvents: 'none',
            background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: `shimmerOverlay ${TRANSITION_DURATION}ms ease-out both`,
          }}
        />
      )}
    </div>
  );
};
