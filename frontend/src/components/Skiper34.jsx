import {
  motion,
  useScroll,
  useTransform,
} from "motion/react";
import ReactLenis from "lenis/react";
import { useRef } from "react";
import { LuChevronRight } from "react-icons/lu";

const STATIC_URL = import.meta.env.PROD ? 'https://cdn.jsdelivr.net/gh/yadavnikhil03/CozyPixels@main/frontend/public' : '';
const getImageUrl = (path) => `${STATIC_URL}${path.startsWith('/') ? path : `/${path}`}`;

const featuredCollections = [
  {
    title: "Catppuccin Sanctuary",
    desc: "Obsessively curated warm, pastel, and cozy minimal illustrations for your desktop.",
    img: "/Catppuccin/Abstract%20%26%20Artistic/cartoon-castle.png",
    category: "Featured Theme",
    link: "#gallery"
  },
  {
    title: "Abstract Dreamscapes",
    desc: "Vibrant wave-forms, custom shapes, and futuristic digital flow for modern workspaces.",
    img: "/Catppuccin/Abstract%20%26%20Artistic/galaxy-waves.jpg",
    category: "Modern Art",
    link: "#gallery"
  },
  {
    title: "Nordic Frost",
    desc: "Cool, serene, and clean minimal pixel art of snow-swept cities and landscapes.",
    img: "/Nord/Pixel%20Art/pixelcity.png",
    category: "Pixel Aesthetics",
    link: "#gallery"
  },
  {
    title: "Cozy Interiors",
    desc: "Warm indoor digital art designed to bring focus and comfort to your workspace.",
    img: "/Catppuccin/Cozy%20Interiors/coffee-shop.png",
    category: "Serene Spaces",
    link: "#gallery"
  },
  {
    title: "Nature Whispers",
    desc: "Breathtaking mountain peaks, cliff paths, and starry forest vistas.",
    img: "/Catppuccin/Nature%20%26%20Landscapes/cliff-path.jpg",
    category: "Scenic Vibe",
    link: "#gallery"
  }
];

const titleWords = "Featured Collections".split(" ");

const titleContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    }
  }
};

const letterVariants = {
  hidden: { opacity: 0, y: 30, rotate: -8 },
  visible: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 12,
    }
  }
};

const Skiper34 = () => {
  return (
    <ReactLenis root>
      <section className="skiper-section">
        <div className="skiper-header">
          <motion.span 
            className="skiper-eyebrow"
            initial={{ opacity: 0, y: -10 }}
            whileInView={{ opacity: 0.55, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            Interactive Spotlight
          </motion.span>
          <motion.h2 
            className="skiper-title"
            variants={titleContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: "0.3em", rowGap: "0.1em" }}
          >
            {titleWords.map((word, wordIdx) => (
              <span key={wordIdx} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                {Array.from(word).map((char, charIdx) => {
                  // Calculate absolute index in the original string for animation stagger ordering
                  const prevWordsLength = titleWords.slice(0, wordIdx).join("").length;
                  const absoluteIdx = prevWordsLength + charIdx;
                  return (
                    <motion.span
                      key={charIdx}
                      variants={letterVariants}
                      custom={absoluteIdx}
                      style={{ display: "inline-block" }}
                    >
                      {char}
                    </motion.span>
                  );
                })}
              </span>
            ))}
          </motion.h2>
          <motion.p 
            className="skiper-desc"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Scroll down to explore our handpicked digital sanctuaries. Each stack reveals a new visual realm.
          </motion.p>
        </div>
        <div className="skiper-cards-container">
          {featuredCollections.map((col, idx) => (
            <StickyCard_003 key={col.title} collection={col} index={idx} />
          ))}
        </div>
      </section>
    </ReactLenis>
  );
};

const StickyCard_003 = ({ collection, index }) => {
  const container = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"]
  });

  // Scale down and rotate as we scroll past the card container
  // Start scaling down after it reaches center (approx 0.5 to 0.85)
  const scale = useTransform(scrollYProgress, [0.5, 0.85], [1, 0.88]);
  const rotate = useTransform(scrollYProgress, [0.5, 0.85], [0, index % 2 === 0 ? 3 : -3]);
  const opacity = useTransform(scrollYProgress, [0.5, 0.85], [1, 0.7]);
  const blur = useTransform(scrollYProgress, [0.5, 0.85], [0, 4]);

  const negateRotate = useTransform(rotate, (value) => -value);
  const filterStyle = useTransform(blur, (v) => `blur(${v}px)`);

  return (
    <div ref={container} className="skiper-card-wrapper">
      <motion.div
        className="skiper-card"
        style={{
          scale,
          rotate,
          opacity,
          filter: filterStyle,
          top: `${12 + index * 2.5}vh`,
        }}
      >
        <motion.img
          src={getImageUrl(collection.img)}
          alt={collection.title}
          style={{
            rotate: negateRotate,
          }}
          whileHover={{ scale: 1.22 }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
          className="skiper-card-img"
          initial={{ scale: 1.12 }}
          sizes="90vw"
          loading="lazy"
          decoding="async"
        />
        
        <div className="skiper-card-overlay" />
        
        <div className="skiper-card-content">
          <span className="skiper-card-badge">{collection.category}</span>
          <h3 className="skiper-card-title">{collection.title}</h3>
          <p className="skiper-card-desc">{collection.desc}</p>
          <motion.a 
            href={collection.link} 
            className="skiper-card-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 10 }}
          >
            Explore Collection <LuChevronRight />
          </motion.a>
        </div>
      </motion.div>
    </div>
  );
};

export { Skiper34, StickyCard_003 };
export default Skiper34;
