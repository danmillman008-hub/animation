import {Composition} from 'remotion';
import {ParkWalk} from './ParkWalk';
import {LongWalk, LONG_DURATION_FRAMES} from './long/LongScene';
import {DURATION_FRAMES, FPS} from './motion/timeline';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="ParkWalk"
        component={ParkWalk}
        durationInFrames={DURATION_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="LongWalk"
        component={LongWalk}
        durationInFrames={LONG_DURATION_FRAMES}
        fps={24}
        width={1920}
        height={1080}
      />
    </>
  );
};
