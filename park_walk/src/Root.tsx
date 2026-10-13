import {Composition} from 'remotion';
import {ParkWalk} from './ParkWalk';
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
    </>
  );
};
