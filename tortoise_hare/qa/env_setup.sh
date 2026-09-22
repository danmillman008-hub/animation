#!/usr/bin/env bash
# One-shot environment restore after a sandbox reset (everything non-snapshotted). Idempotent.
set -e
cd /home/user
[ -d OpenMontage ] || git clone -q --depth 1 https://github.com/calesthio/OpenMontage OpenMontage && rm -rf OpenMontage/.git
sudo apt-get update -qq >/dev/null 2>&1 || true
sudo apt-get install -y -qq libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 >/dev/null 2>&1 || true
# ffmpeg + node22 (HyperFrames needs >=22) in ~/.local (not snapshotted, so re-fetch)
mkdir -p .local/bin
[ -x .local/bin/ffmpeg ] || { curl -sL -o /tmp/ff.tar.xz https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz && tar xJf /tmp/ff.tar.xz --strip-components=2 -C .local/bin --wildcards '*/bin/ffmpeg' '*/bin/ffprobe'; }
[ -x .local/node22/bin/node ] || { curl -fsSL https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz -o /tmp/n.tar.xz && mkdir -p .local/node22 && tar xJf /tmp/n.tar.xz --strip-components=1 -C .local/node22; }
export PATH=$HOME/.local/bin:$HOME/.local/node22/bin:$PATH
# python
cd OpenMontage; [ -x .venv/bin/python ] || python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt pyyaml pydantic jsonschema python-dotenv Pillow numpy requests google-auth cairosvg lxml faster-whisper mediapipe playwright 2>&1 | grep -v notice || true
.venv/bin/python -m playwright install chromium >/dev/null 2>&1 || true
# node (remotion-composer + animation libs)
cd remotion-composer; npm install --silent 2>&1 | tail -1 || true
npm install --silent --legacy-peer-deps gsap spelling-buddy motion-svg flubber svgo matter-js planck lottie-web closed-chain-ik @tensorflow/tfjs@^4 @tensorflow-models/pose-detection @tensorflow-models/face-landmarks-detection @mediapipe/tasks-vision playwright 2>&1 | tail -1 || true
REMV=$(node -p "require('remotion/package.json').version"); npm install --silent --legacy-peer-deps @remotion/lottie@$REMV 2>&1 | tail -1 || true
# skills -> ~/.agents/skills
mkdir -p ~/.agents/skills; for s in character-rigging canvas-procedural-animation svg-character-animation pose-library-design character-animation-qa hyperframes hyperframes-cli hyperframes-core remotion-best-practices remotion-to-hyperframes playwright-recording; do cp -r /home/user/OpenMontage/.agents/skills/$s ~/.agents/skills/ 2>/dev/null || true; done
# restore project
mkdir -p /home/user/OpenMontage/projects/th3/{work,public} && cp -r /home/user/animation_new/rig_src /home/user/OpenMontage/projects/th3/remotion
echo "ENV READY"
