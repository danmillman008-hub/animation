#!/usr/bin/env bash
# Add a mocap clip to our SVG-rig projects in one step.
#   add_motion.sh <name> <cmu-id | url | local.bvh> [--dur 8] [--start 0] [--flip]
#   e.g. add_motion.sh swagger 07_02 --dur 6
# Fetches BVH (CMU mirror una-dinosauria/cmu-mocap; free for any use), retargets it with
# bvh_retarget.py, and merges it into projects/{west,kwest}/remotion/mocap_clips.ts.
set -e
NAME=$1; SRC=$2; shift 2
MC=/home/user/animation_new/mocap; mkdir -p $MC
PY=/home/user/OpenMontage/.venv/bin/python
if [ -f "$SRC" ]; then BVH=$SRC
elif [[ $SRC =~ ^[0-9]{2,3}_[0-9]+$ ]]; then S=$(printf %03d $((10#${SRC%_*}))); BVH=$MC/$SRC.bvh
  [ -f $BVH ] || curl -fsSL -o $BVH https://raw.githubusercontent.com/una-dinosauria/cmu-mocap/master/data/$S/$SRC.bvh
else BVH=$MC/$NAME.bvh; curl -fsSL -o $BVH "$SRC"; fi
$PY /home/user/animation_new/bvh_retarget.py $BVH /tmp/$NAME.clip.json --name $NAME "$@"
for P in west kwest; do
  F=/home/user/OpenMontage/projects/$P/remotion/mocap_clips.ts
  $PY - "$F" /tmp/$NAME.clip.json <<'EOF'
import json,sys
f,cf=sys.argv[1:]; t=open(f).read(); head=t[:t.index("= ")+2]; o=json.loads(t[len(head):].rstrip().rstrip(";"))
c=json.load(open(cf)); hs=[fr["hipH"] for fr in c["frames"][2:]]; c["hipStand"]=round(sorted(hs)[int(len(hs)*0.9)],3)
o[c["name"]]=c; open(f,"w").write(head+json.dumps(o)+";\n"); print(f, "->", sorted(o))
EOF
done
# sync to composer staging
cp /home/user/OpenMontage/projects/west/remotion/mocap_clips.ts /home/user/OpenMontage/remotion-composer/projects/west/ 2>/dev/null || true
cp /home/user/OpenMontage/projects/kwest/remotion/mocap_clips.ts /home/user/OpenMontage/remotion-composer/projects/kwest/ 2>/dev/null || true
echo "preview: cd OpenMontage/remotion-composer && TMPDIR=/tmp npx remotion still projects/west/index.tsx MocapStrip /tmp/$NAME.png --props='{\"id\":\"hare\",\"clip\":\"$NAME\"}'"
