import json,io,sys
import cairosvg, numpy as np
from PIL import Image
p="/home/user/OpenMontage/projects/th3/remotion/characters.ts"
s=open(p).read(); d=json.loads(s[s.index("= ")+2:].rstrip().rstrip(";"))
WRITE = "--write" in sys.argv
def render(defs, markup, vb, res):
    x,y,w,h=vb
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="{x} {y} {w} {h}"><defs>{defs}</defs>{markup}</svg>'
    return np.array(Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode(),output_width=res))).convert("RGBA"))
def dil(m,r):
    out=m.copy()
    for dx in range(-r,r+1):
        for dy in range(-r,r+1): out|=np.roll(np.roll(m,dx,1),dy,0)
    return out
def solve(char, vb, res, limbs, caps):
    C=d[char]; rig=C["rig"]["parts"]; x0,y0,w,h=vb; k=w/res
    masks={n:render(C["defs"],C["parts"][n],vb,res) for n in rig if n in C["parts"]}
    for child,parent in limbs.items():
        if child not in masks or parent not in masks: continue
        a=masks[child][:,:,3]>10; b=masks[parent][:,:,3]>10
        ov=a&b; r=1
        while ov.sum()<20 and r<12: ov=dil(a,r)&dil(b,r); r+=2
        ys,xs=np.where(ov)
        if len(xs)==0: print(char,child,"NO CONTACT"); continue
        cx=x0+xs.mean()*k; cy=y0+ys.mean()*k
        # joint width: measure child's thickness at the joint row/col (min extent)
        ext=min(xs.max()-xs.min(), ys.max()-ys.min())*k
        ext2=max(xs.max()-xs.min(), ys.max()-ys.min())*k
        cyi,cxi=int((cy-y0)/k),int((cx-x0)/k); rr=max(4,int(ext2/k*0.6))
        win=masks[child][max(0,cyi-rr):cyi+rr, max(0,cxi-rr):cxi+rr]; px=win[win[:,:,3]>200][:,:3]
        col="#%02x%02x%02x"%tuple(np.median(px,axis=0).astype(int)) if len(px) else None
        old=rig[child]["pivot"]; new=[round(float(cx),1),round(float(cy),1)]
        dist=((old[0]-new[0])**2+(old[1]-new[1])**2)**.5
        print(f"{char:5}{child:8} old={old} new={new} shift={dist:.1f} width={ext2:.1f} col={col}")
        if WRITE:
            if child.split("_")[0] in ("larm","shin","shoe","hand"): rig[child]["pivot"]=new
            if child in caps and col: rig[child]["cap"]={"r":round(ext2*0.5*caps[child],1),"fill":col}
hare_limbs={"uarm_f":"torso","uarm_b":"torso","larm_f":"uarm_f","larm_b":"uarm_b","thigh_f":"hips","thigh_b":"hips","shin_f":"thigh_f","shin_b":"thigh_b","shoe_f":"shin_f","shoe_b":"shin_b"}
tort_limbs=dict(hare_limbs, hand_f="larm_f", hand_b="larm_b")
caps_h={"larm_f":1,"larm_b":1,"shin_f":1,"shin_b":1,"uarm_f":0.95,"uarm_b":0.95}
caps_t={"larm_f":1,"larm_b":1,"shin_f":1,"shin_b":1,"uarm_f":0.9,"uarm_b":0.9,"hand_f":0.9,"hand_b":0.9}
solve("hare",(120,140,130,360),1300,hare_limbs,caps_h)
solve("tort",(850,1100,700,1750),1400,tort_limbs,caps_t)
if WRITE: open(p,"w").write("// AUTO-GENERATED\nexport const CHARS: any = "+json.dumps(d)+";\n"); print("written")
