import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { nanoid } from "nanoid";

interface AnimationConfig {
  concept: string;
  title: string;
  description: string;
  type: string;
}

export async function generateAnimationVideo(config: AnimationConfig): Promise<string> {
  const videoId = nanoid(10);
  const outputDir = join(process.cwd(), "public", "animations");
  
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, `${videoId}.mp4`);

  try {
    // For MVP, we'll generate a simpler animation data structure
    // Full Remotion rendering requires webpack bundling which is heavy
    // Instead, return animation steps for canvas rendering
    
    const animationSteps = generateAnimationSteps(config);
    
    // Save animation data as JSON for now
    const jsonPath = join(outputDir, `${videoId}.json`);
    await writeFile(jsonPath, JSON.stringify(animationSteps, null, 2));
    
    return `/animations/${videoId}.json`;
  } catch (error) {
    console.error("Error generating animation:", error);
    throw error;
  }
}

function generateAnimationSteps(config: AnimationConfig) {
  const { concept, title, description, type } = config;
  
  const steps = [
    {
      type: "highlight",
      content: title,
      duration: 2,
      color: "#d97757"
    },
    {
      type: "text",
      content: description.slice(0, 150),
      duration: 3,
      fontSize: 16
    },
    {
      type: "diagram",
      content: type || concept.toLowerCase(),
      duration: 5
    },
    {
      type: "text",
      content: "Practice makes perfect!",
      duration: 2,
      fontSize: 18
    }
  ];
  
  return { steps, metadata: { concept, title, type } };
}

// Generate Remotion React component code (for future full implementation)
export function generateRemotionComponent(config: AnimationConfig): string {
  const { concept, title, description } = config;
  const c = concept.toLowerCase();
  
  if (c.includes("tree") || c.includes("binary")) {
    return `
import { AbsoluteFill, useCurrentFrame, interpolate, spring } from 'remotion';

export const TreeAnimation = () => {
  const frame = useCurrentFrame();
  const opacity = spring({ frame, fps: 30, from: 0, to: 1 });
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a19', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="400" height="300">
        <circle cx="200" cy="50" r="30" fill="#d97757" opacity={opacity} />
        <circle cx="120" cy="150" r="30" fill="#5b9bd5" opacity={interpolate(frame, [30, 60], [0, 1])} />
        <circle cx="280" cy="150" r="30" fill="#5b9bd5" opacity={interpolate(frame, [30, 60], [0, 1])} />
        <text x="200" y="60" textAnchor="middle" fill="white" fontSize="16">8</text>
        <text x="120" y="160" textAnchor="middle" fill="white" fontSize="16">4</text>
        <text x="280" y="160" textAnchor="middle" fill="white" fontSize="16">12</text>
      </svg>
    </AbsoluteFill>
  );
};
`;
  }
  
  if (c.includes("sort")) {
    return `
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const SortAnimation = () => {
  const frame = useCurrentFrame();
  const values = [5, 2, 8, 1, 9];
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a19', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        {values.map((val, i) => (
          <div
            key={i}
            style={{
              width: 40,
              height: val * 30,
              backgroundColor: '#d97757',
              opacity: interpolate(frame, [i * 10, i * 10 + 20], [0, 1])
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
`;
  }
  
  return `
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export const ConceptAnimation = () => {
  const frame = useCurrentFrame();
  const titleOpacity = interpolate(frame, [0, 30], [0, 1]);
  const descOpacity = interpolate(frame, [30, 60], [0, 1]);
  
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a19', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ color: '#d97757', fontSize: 48, opacity: titleOpacity }}>${title}</h1>
      <p style={{ color: '#d4d4d0', fontSize: 20, opacity: descOpacity, maxWidth: 600, textAlign: 'center' }}>
        ${description.slice(0, 150)}
      </p>
    </AbsoluteFill>
  );
};
`;
}
