function uncompress(input){
 const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',raw=[];let buffer=0,bits=0;
 for(let i=0;i<input.length;i++){let n=chars.indexOf(input[i]);if(n<0)continue;buffer=(buffer<<6)|n;bits+=6;if(bits>=8){bits-=8;raw.push((buffer>>bits)&255);buffer&=(1<<bits)-1}}
 let idx=2,pool=0,have=0,out=[];
 function read(n){while(have<n){pool|=raw[idx++]<<have;have+=8}let v=pool&((1<<n)-1);pool>>>=n;have-=n;return v}
 function huff(lengths){let counts=Array(16).fill(0),next=Array(16).fill(0),lookup=Array.from({length:16},()=>new Map());for(let n of lengths)if(n)counts[n]++;let code=0;for(let l=1;l<=15;l++){code=(code+counts[l-1])*2;next[l]=code}for(let i=0;i<lengths.length;i++){let l=lengths[i];if(l)lookup[l].set(next[l]++,i)}return ()=>{let c=0;for(let l=1;l<=15;l++){c=c*2+read(1);if(lookup[l].has(c))return lookup[l].get(c)}throw Error('Bad Huffman code at '+idx)}}
 const LEN=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
 const LEX=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
 const DB=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
 const DE=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
 let last=0;while(!last){last=read(1);let typ=read(2);if(typ===0){let rem=have%8;read(rem);let count=read(16);read(16);while(count--)out.push(read(8));continue}let lit,dist;if(typ===1){lit=huff(Array.from({length:288},(_,i)=>i<=143?8:i<=255?9:i<=279?7:8));dist=huff(Array(32).fill(5))}else if(typ===2){let hlit=read(5)+257,hdist=read(5)+1,hclen=read(4)+4,order=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],cl=Array(19).fill(0);for(let i=0;i<hclen;i++)cl[order[i]]=read(3);let codeLen=huff(cl),lens=[];while(lens.length<hlit+hdist){let sym=codeLen();if(sym<=15)lens.push(sym);else if(sym===16){let count=read(2)+3,v=lens.at(-1);while(count--)lens.push(v)}else if(sym===17){let count=read(3)+3;while(count--)lens.push(0)}else if(sym===18){let count=read(7)+11;while(count--)lens.push(0)}}lit=huff(lens.slice(0,hlit));dist=huff(lens.slice(hlit))}else throw Error('Invalid deflate block');while(true){let sym=lit();if(sym<256){out.push(sym);continue}if(sym===256)break;let code=sym-257;if(code<0||code>=LEN.length)throw Error('bad length');let n=LEN[code]+read(LEX[code]),di=dist(),off=DB[di]+read(DE[di]);for(let i=0;i<n;i++)out.push(out[out.length-off])}}
 return decodeURIComponent(escape(String.fromCharCode(...out)));
}
