import sharp from 'sharp';
const out = process.argv[2];
function svg(w,h,dirty,label){
  const bars=[0.18,0.38,0.62,0.82].map(x=>`<rect x="${x*w-3}" y="${h*0.08}" width="6" height="${h*0.5}" fill="url(#bar)"/>
   <rect x="${x*w-40}" y="${h*0.08}" width="80" height="${h*0.5}" fill="url(#halo)" opacity=".35"/>`).join('');
  const refl=[0.18,0.38,0.62,0.82].map(x=>`<rect x="${x*w-4}" y="${h*0.72}" width="8" height="${h*0.25}" fill="url(#bar)" opacity=".25"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
   <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070a"/><stop offset=".62" stop-color="#0b1017"/><stop offset=".64" stop-color="#121821"/><stop offset="1" stop-color="#05070a"/></linearGradient>
   <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".5" stop-color="#f2f7ff"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient>
   <linearGradient id="halo" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bcd2ff" stop-opacity="0"/><stop offset=".5" stop-color="#bcd2ff"/><stop offset="1" stop-color="#bcd2ff" stop-opacity="0"/></linearGradient>
   <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${dirty?'#5a4a36':'#1a2230'}"/><stop offset=".45" stop-color="${dirty?'#3b3024':'#06080c'}"/><stop offset="1" stop-color="${dirty?'#2a2219':'#020305'}"/></linearGradient>
   <filter id="mud"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .32  0 0 0 0 .2  0 0 0 1.6 -.55"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>${bars}${refl}
  <path d="M${w*.2} ${h*.66} Q${w*.24} ${h*.46} ${w*.42} ${h*.43} L${w*.7} ${h*.42} Q${w*.82} ${h*.44} ${w*.86} ${h*.6} L${w*.87} ${h*.68} L${w*.19} ${h*.69} Z" fill="url(#body)"/>
  <circle cx="${w*.31}" cy="${h*.68}" r="${h*.07}" fill="#030405" stroke="${dirty?'#4a3c2c':'#2a3340'}" stroke-width="6"/>
  <circle cx="${w*.75}" cy="${h*.68}" r="${h*.07}" fill="#030405" stroke="${dirty?'#4a3c2c':'#2a3340'}" stroke-width="6"/>
  ${dirty?`<rect width="${w}" height="${h}" fill="#000" filter="url(#mud)" opacity=".9"/>`:''}
  <text x="${w*.5}" y="${h*.93}" fill="#ffffff" fill-opacity=".28" font-family="DejaVu Sans" font-size="${Math.round(h*.022)}" text-anchor="middle" letter-spacing="4">PLACEHOLDER · ${label}</text>
  </svg>`;
}
for (const [name,w,h] of [['desktop',2560,1440],['phone',1080,1920]]) {
  for (const dirty of [false,true]) {
    const label = `${dirty?'BRUDNE':'CZYSTE'} ${w}×${h}`;
    await sharp(Buffer.from(svg(w,h,dirty,label))).webp({quality:70}).toFile(`${out}/${dirty?'dirty':'clean'}-${name}.webp`);
  }
}
