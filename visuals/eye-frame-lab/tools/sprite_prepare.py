#!/usr/bin/env python3
from PIL import Image, ImageDraw
import argparse, json, os
import numpy as np

def contiguous_runs(v):
    idx=np.flatnonzero(v)
    if len(idx)==0:return []
    runs=[]; s=p=int(idx[0])
    for q in idx[1:]:
        q=int(q)
        if q!=p+1:
            runs.append((s,p)); s=q
        p=q
    runs.append((s,p))
    return runs

def make_mask(arr, alpha_threshold=10, bg_threshold=22):
    a=arr[:,:,3]
    if a.min() < 250:
        return a > alpha_threshold, 'alpha'
    rgb=arr[:,:,:3].astype(np.int16)
    samples=np.array([rgb[0,0],rgb[0,-1],rgb[-1,0],rgb[-1,-1]])
    bg=np.median(samples,axis=0)
    dist=np.sqrt(((rgb-bg)**2).sum(axis=2))
    return dist > bg_threshold, 'corner_background_distance'

def bbox(mask):
    ys,xs=np.where(mask)
    if len(xs)==0:return None
    return (int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))

def anchor_for(crop_arr, crop_mask, mode):
    bb=bbox(crop_mask)
    if bb is None:return None
    x0,y0,x1,y1=bb
    if mode=='bbox_center':
        return ((x0+x1)/2,(y0+y1)/2,'bbox_center')
    ys,xs=np.where(crop_mask)
    if mode=='centroid':
        return (float(xs.mean()),float(ys.mean()),'centroid')
    if mode=='lower_liner':
        lum=crop_arr[:,:,:3].mean(axis=2)
        yy=np.indices(crop_mask.shape)[0]
        h=crop_mask.shape[0]
        bright=crop_mask & (lum>165) & (yy>h*.44)
        by,bx=np.where(bright)
        if len(bx)>=20:
            return (float(np.median(bx)),float(np.median(by)),'lower_liner_median')
        return ((x0+x1)/2,(y0+y1)/2,'bbox_center_fallback')
    raise ValueError(mode)

def detect_components(mask, rows, cols):
    H,W=mask.shape
    row_runs=contiguous_runs(mask.sum(axis=1)>0)
    if len(row_runs)==rows:
        out=[]; good=True
        for ya,yb in row_runs:
            x_runs=contiguous_runs(mask[ya:yb+1,:].sum(axis=0)>0)
            if len(x_runs)!=cols:
                good=False; break
            for xa,xb in x_runs:
                sub=mask[ya:yb+1,xa:xb+1]
                bb=bbox(sub)
                out.append((xa+bb[0],ya+bb[1],xa+bb[2],ya+bb[3]))
        if good:return out,'transparent_gutter_segmentation'
    out=[]
    for r in range(rows):
        y0=round(r*H/rows); y1=round((r+1)*H/rows)
        for c in range(cols):
            x0=round(c*W/cols); x1=round((c+1)*W/cols)
            sub=mask[y0:y1,x0:x1]
            bb=bbox(sub)
            out.append((x0,y0,x1,y1) if bb is None else (x0+bb[0],y0+bb[1],x0+bb[2],y0+bb[3]))
    return out,'equal_grid_fallback'

def main():
    ap=argparse.ArgumentParser(description='Split, measure, align, QA and export sprite grids before animation.')
    ap.add_argument('input'); ap.add_argument('output')
    ap.add_argument('--rows',type=int,required=True)
    ap.add_argument('--cols',type=int,required=True)
    ap.add_argument('--anchor',choices=['bbox_center','centroid','lower_liner'],default='bbox_center')
    ap.add_argument('--canvas',type=int,default=512)
    ap.add_argument('--target-x',type=float,default=.5)
    ap.add_argument('--target-y',type=float,default=.5)
    ap.add_argument('--jitter-limit',type=float,default=3.0)
    args=ap.parse_args()

    os.makedirs(args.output,exist_ok=True)
    rawdir=os.path.join(args.output,'frames_raw')
    aldir=os.path.join(args.output,'frames_aligned')
    os.makedirs(rawdir,exist_ok=True); os.makedirs(aldir,exist_ok=True)

    im=Image.open(args.input).convert('RGBA'); arr=np.asarray(im)
    mask,mask_method=make_mask(arr)
    boxes,split_method=detect_components(mask,args.rows,args.cols)
    if len(boxes)!=args.rows*args.cols:
        raise SystemExit(f'frame count mismatch: {len(boxes)}')

    target=(args.canvas*args.target_x,args.canvas*args.target_y)
    aligned=[]; rows_out=[]
    for i,box0 in enumerate(boxes):
        x0,y0,x1,y1=box0
        crop=im.crop((x0,y0,x1,y1)); ca=np.asarray(crop)
        cm,_=make_mask(ca)
        an=anchor_for(ca,cm,args.anchor)
        if an is None:raise SystemExit(f'empty frame {i}')
        ax,ay,method=an
        px=int(round(target[0]-ax)); py=int(round(target[1]-ay))
        out=Image.new('RGBA',(args.canvas,args.canvas),(0,0,0,0))
        out.alpha_composite(crop,(px,py))
        crop.save(os.path.join(rawdir,f'frame_{i:02d}.png'))
        out.save(os.path.join(aldir,f'frame_{i:02d}.png'))
        aligned.append(out)
        rows_out.append({'index':i,'bbox_global':list(map(int,box0)),'raw_size':list(crop.size),'anchor':[ax,ay],'anchor_method':method,'paste':[px,py]})

    for i,out in enumerate(aligned):
        aa=np.asarray(out); am,_=make_mask(aa); an=anchor_for(aa,am,args.anchor)
        rx=int(round(target[0]-an[0])); ry=int(round(target[1]-an[1]))
        if rx or ry:
            fixed=Image.new('RGBA',(args.canvas,args.canvas),(0,0,0,0))
            fixed.alpha_composite(out,(rx,ry))
            out=fixed; aligned[i]=out
            out.save(os.path.join(aldir,f'frame_{i:02d}.png'))
        rows_out[i]['residual_correction']=[rx,ry]

    anchors=[]
    for i,out in enumerate(aligned):
        aa=np.asarray(out); am,_=make_mask(aa); an=anchor_for(aa,am,args.anchor)
        anchors.append([an[0],an[1]])
        rows_out[i]['aligned_anchor']=[an[0],an[1]]
    xs=[a[0] for a in anchors]; ys=[a[1] for a in anchors]
    jitter=max(max(xs)-min(xs),max(ys)-min(ys))

    preview=280
    qa=Image.new('RGB',(preview*args.cols,preview*args.rows),(88,88,88))
    d=ImageDraw.Draw(qa)
    for i,out in enumerate(aligned):
        pv=out.resize((preview,preview),Image.Resampling.LANCZOS)
        bg=Image.new('RGBA',(preview,preview),(88,88,88,255)); bg.alpha_composite(pv)
        x=(i%args.cols)*preview; y=(i//args.cols)*preview
        qa.paste(bg.convert('RGB'),(x,y)); d.text((x+7,y+7),str(i),fill='white')
    qa.save(os.path.join(args.output,'qa_aligned_grid_gray.png'))

    onion=Image.new('RGBA',(args.canvas,args.canvas),(88,88,88,255))
    for out in aligned:
        f=out.copy(); f.putalpha(f.getchannel('A').point(lambda p:int(p*.13))); onion.alpha_composite(f)
    onion.convert('RGB').save(os.path.join(args.output,'qa_onion_skin.jpg'),quality=95)

    grid=Image.new('RGBA',(args.canvas*args.cols,args.canvas*args.rows),(0,0,0,0))
    for i,out in enumerate(aligned):
        grid.alpha_composite(out,((i%args.cols)*args.canvas,(i//args.cols)*args.canvas))
    grid.save(os.path.join(args.output,'aligned_grid.png'))

    manifest={
        'input':args.input,'source_size':list(im.size),'rows':args.rows,'cols':args.cols,
        'frame_count':len(aligned),'mask_method':mask_method,'split_method':split_method,
        'anchor_mode':args.anchor,'canvas':[args.canvas,args.canvas],'target_anchor':list(target),
        'anchor_jitter_px':jitter,'jitter_limit_px':args.jitter_limit,
        'qa_pass':jitter<=args.jitter_limit,'frames':rows_out
    }
    with open(os.path.join(args.output,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)
    print(json.dumps(manifest,indent=2))

if __name__=='__main__':
    main()
