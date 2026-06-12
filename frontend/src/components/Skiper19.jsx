import React from "react";
import { m } from "motion/react";

const Skiper19 = () => {
  return (
    <section className="skiper19-section">
      <div className="skiper19-header">
        <m.span 
          className="skiper19-eyebrow"
          initial={{ opacity: 0, y: -10 }}
          whileInView={{ opacity: 0.7, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Interactive Sanctuary
        </m.span>
        <m.h2 
          className="skiper19-title"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Pixels Crafted <br /> With Serene <br /> Comfort
        </m.h2>
        <m.p 
          className="skiper19-desc"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 0.8, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.25 }}
        >
          Explore our curated palettes and minimalist wallpapers designed for focused and peaceful workspaces.
        </m.p>
      </div>

      <div className="skiper19-bento-container">
        <m.div 
          className="skiper19-bento-grid"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="bento-card bento-themes">
            <div className="bento-icon">🎨</div>
            <p className="bento-label">Color Themes</p>
            <h3 className="bento-value">Catppuccin & Nord</h3>
            <div className="bento-themes-preview">
              <div className="theme-dot catppuccin-1"></div>
              <div className="theme-dot catppuccin-2"></div>
              <div className="theme-dot catppuccin-3"></div>
              <div className="theme-dot catppuccin-4"></div>
              <div className="theme-divider"></div>
              <div className="theme-dot nord-1"></div>
              <div className="theme-dot nord-2"></div>
              <div className="theme-dot nord-3"></div>
              <div className="theme-dot nord-4"></div>
            </div>
          </div>
          
          <div className="bento-card bento-vibe">
            <div className="bento-icon">🌿</div>
            <p className="bento-label">Vibe</p>
            <h3 className="bento-value">Minimalist Focus<br/>& Serene Aesthetics</h3>
          </div>

          <div className="bento-card bento-curator">
            <img src="/ay.jpg" alt="Ayanokoji" className="bento-avatar" />
            <div className="bento-curator-info">
              <p className="bento-label">Curator</p>
              <h3 className="bento-value">@yadavnikhil03</h3>
            </div>
          </div>
          
          <div className="bento-card bento-license">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: '24px', color: '#39406d' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <p className="bento-label">MIT License</p>
            <h3 className="bento-value">Open Source & Free</h3>
          </div>
        </m.div>
      </div>
    </section>
  );
};

export { Skiper19 };
export default Skiper19;
