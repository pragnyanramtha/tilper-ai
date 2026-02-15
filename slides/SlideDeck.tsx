import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring} from 'remotion';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FaRobot, FaCode, FaRoad, FaLightbulb, FaLayerGroup, FaUserGraduate } from 'react-icons/fa';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Slide = ({
  title,
  subtitle,
  children,
  icon: Icon,
  color = "bg-white"
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  color?: string;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1]);
  const translateY = interpolate(frame, [0, 20], [50, 0]);

  return (
    <AbsoluteFill className={cn("flex flex-col items-center justify-center p-20", color)}>
      <div
        style={{ opacity, transform: `translateY(${translateY}px)` }}
        className="w-full max-w-6xl flex flex-col items-center gap-8"
      >
        {Icon && (
          <div className="mb-4 text-primary text-8xl text-orange-500">
            <Icon />
          </div>
        )}
        <h1 className="text-7xl font-bold text-gray-900 text-center mb-2">{title}</h1>
        {subtitle && <h2 className="text-4xl text-gray-600 text-center font-light">{subtitle}</h2>}
        <div className="w-full mt-12">
          {children}
        </div>
      </div>

      <div className="absolute bottom-8 right-8 text-gray-400 text-xl font-mono">
        Tilper AI Presentation
      </div>
    </AbsoluteFill>
  );
};

const BulletPoint = ({ text, delay }: { text: string; delay: number }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1]);
  const translateX = interpolate(frame, [delay, delay + 15], [-20, 0]);

  return (
    <div
      style={{ opacity, transform: `translateX(${translateX}px)` }}
      className="flex items-center gap-4 text-3xl text-gray-800 mb-6"
    >
      <div className="w-4 h-4 rounded-full bg-orange-500" />
      {text}
    </div>
  );
};

export const SlideDeck: React.FC = () => {
  return (
    <AbsoluteFill className="bg-white">
      <Sequence from={0} durationInFrames={150}>
        <Slide
          title="Tilper AI"
          subtitle="Your Personal AI Coding Mentor"
          icon={FaRobot}
          color="bg-slate-50"
        >
          <div className="grid grid-cols-2 gap-12 mt-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
              <h3 className="text-3xl font-bold mb-6 text-orange-600 flex items-center gap-3">
                <FaLightbulb /> What is it?
              </h3>
              <p className="text-2xl text-gray-600 leading-relaxed">
                An interactive coding education platform for teenage developers, powered by Claude Sonnet 4.5.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <BulletPoint text="24/7 Patient AI Tutor" delay={30} />
              <BulletPoint text="Interactive Browser IDE" delay={45} />
              <BulletPoint text="Visual Learning Animations" delay={60} />
              <BulletPoint text="Personalized Roadmaps" delay={75} />
            </div>
          </div>
        </Slide>
      </Sequence>

      <Sequence from={150} durationInFrames={150}>
        <Slide
          title="Architecture & Tech"
          subtitle="Modern Full-Stack Implementation"
          icon={FaLayerGroup}
          color="bg-slate-100"
        >
          <div className="flex justify-between items-center gap-8 mt-4">
            <div className="flex-1 bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
              <h3 className="text-2xl font-bold text-blue-700 mb-4">Frontend</h3>
              <div className="text-xl text-gray-700 space-y-2">
                <div>React 18 + Vite</div>
                <div>TailwindCSS</div>
                <div>Shadcn UI</div>
                <div>Framer Motion</div>
              </div>
            </div>

            <div className="text-4xl text-gray-400">↔</div>

            <div className="flex-1 bg-green-50 p-6 rounded-xl border border-green-100 text-center">
              <h3 className="text-2xl font-bold text-green-700 mb-4">Backend</h3>
              <div className="text-xl text-gray-700 space-y-2">
                <div>Express.js</div>
                <div>Drizzle ORM</div>
                <div>PostgreSQL</div>
                <div>Node.js</div>
              </div>
            </div>

            <div className="text-4xl text-gray-400">↔</div>

            <div className="flex-1 bg-purple-50 p-6 rounded-xl border border-purple-100 text-center">
              <h3 className="text-2xl font-bold text-purple-700 mb-4">AI Engine</h3>
              <div className="text-xl text-gray-700 space-y-2">
                <div>Anthropic Claude API</div>
                <div>Streaming SSE</div>
                <div>Tool Use & Memory</div>
                <div>Agentic Workflow</div>
              </div>
            </div>
          </div>
        </Slide>
      </Sequence>

      <Sequence from={300} durationInFrames={150}>
        <Slide
          title="User Journey & Roadmap"
          subtitle="From Beginner to Pro"
          icon={FaRoad}
          color="bg-slate-50"
        >
          <div className="grid grid-cols-3 gap-8 mb-12">
             <div className="bg-orange-100 p-6 rounded-xl border border-orange-200">
               <div className="text-4xl mb-4">1. Plan</div>
               <p className="text-xl text-gray-700">AI assesses skills and creates a custom roadmap.</p>
             </div>
             <div className="bg-orange-100 p-6 rounded-xl border border-orange-200">
               <div className="text-4xl mb-4">2. Learn</div>
               <p className="text-xl text-gray-700">Interactive lessons with visual animations.</p>
             </div>
             <div className="bg-orange-100 p-6 rounded-xl border border-orange-200">
               <div className="text-4xl mb-4">3. Code</div>
               <p className="text-xl text-gray-700">Practice in IDE with real-time feedback.</p>
             </div>
          </div>

          <div className="border-t border-gray-300 pt-8">
            <h3 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <FaUserGraduate /> Future Features
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <BulletPoint text="Video Export (Remotion)" delay={10} />
              <BulletPoint text="Multiplayer Challenges" delay={25} />
              <BulletPoint text="Mobile App (React Native)" delay={40} />
            </div>
          </div>
        </Slide>
      </Sequence>
    </AbsoluteFill>
  );
};
