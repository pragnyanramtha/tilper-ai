import React from 'react';
import {Composition} from 'remotion';
import {SlideDeck} from './SlideDeck';
import './tailwind.css';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Slides"
        component={SlideDeck}
        durationInFrames={450} // 15 seconds (5s per slide * 3)
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
