"""character-animation-qa: verify every hinged part stays attached to its parent across gait phases.
Renders parent and child separately (RigQA comp), dilates by `tol` px, requires overlap."""
import subprocess, json, sys, os, numpy as np
from PIL import Image
RC="/home/user/OpenMontage/remotion-composer"; W="/home/user/OpenMontage/projects/th3/work/qa"; os.makedirs(W,exist_ok=True)
env=dict(os.environ,TMPDIR="/home/user/tmp")
def still(props,out):
    subprocess.run(["npx","remotion","still","projects/th3/index.tsx","RigQA",out,"--props="+json.dumps(props),"--scale=0.5","--log=error"],cwd=RC,env=env,check=True,capture_output=True)
    a=np.array(Image.open(out).convert("RGB")); return (np.abs(a.astype(int)-255).sum(2)>30)
def dil(m,r):
    o=m.copy()
    for dx in range(-r,r+1,2):
        for dy in range(-r,r+1,2): o|=np.roll(np.roll(m,dx,1),dy,0)
    return o
pairs={"uarm_f":"torso","larm_f":"uarm_f","uarm_b":"torso","larm_b":"uarm_b","thigh_f":"torso","shin_f":"thigh_f","shoe_f":"shin_f","thigh_b":"torso","shin_b":"thigh_b","shoe_b":"shin_b"}
fails=0
for cid,scale in (("hare",1.5),("tort",0.34)):
  for kind in ("sprint",):
    for phase in (0.25,0.75):
      cache={}
      def m(part):
        if part not in cache: cache[part]=still({"id":cid,"only":[part],"kind":kind,"phase":phase,"scale":scale},f"{W}/{cid}_{part}.png")
        return cache[part]
      for c,p in pairs.items():
        ok=(dil(m(c),2)&dil(m(p),2)).sum()>0
        if not ok: fails+=1; print(f"FAIL {cid} {kind} ph={phase} {c} detached from {p}")
print("PASS" if fails==0 else f"{fails} failures")
sys.exit(1 if fails else 0)
