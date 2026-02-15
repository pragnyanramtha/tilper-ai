import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";

const start = async () => {
  console.log("Starting slide generation...");

  try {
    // 1. Bundle the Remotion project
    // This creates a Webpack bundle that can be rendered
    const bundled = await bundle(path.join(process.cwd(), "slides/index.tsx"));
    console.log("Bundled successfully:", bundled);

    // 2. Select the composition to render
    const composition = await selectComposition({
      serveUrl: bundled,
      id: "Slides",
      inputProps: {},
    });

    if (!composition) {
      throw new Error("No composition with ID 'Slides' found.");
    }

    console.log(`Found composition: ${composition.id} (${composition.width}x${composition.height})`);

    // 3. Render the video
    const outputLocation = path.join(process.cwd(), "out", "slides.mp4");

    // Ensure output directory exists
    const outDir = path.dirname(outputLocation);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    console.log("Rendering video...");
    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation,
      inputProps: {},
      onProgress: ({ progress }) => {
        const percent = Math.round(progress * 100);
        process.stdout.write(`Rendering: ${percent}%\r`);
      },
    });

    console.log("\nRender complete! Video saved to:", outputLocation);
  } catch (err) {
    console.error("Error generating slides:", err);
    process.exit(1);
  }
};

start();
