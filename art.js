// איורים מקוריים ב-SVG: פרצופים, קומיקס, שלבי התפתחות, הבלשים
const CH = {
  surprise: { skin: '#f6c9a0', hair: '#6b3e1f', style: 'curls', bg: '#ffe08a' },
  anger:    { skin: '#c98a5e', hair: '#222', style: 'tophat', bg: '#ffb3a7' },
  joy:      { skin: '#ffd9b8', hair: '#e8a33d', style: 'bun', bg: '#bfefb0' },
  disgust:  { skin: '#8d5a3b', hair: '#1c1c1c', style: 'cap', bg: '#c9f2e6' },
  sadness:  { skin: '#f2d2b6', hair: '#b4542c', style: 'bow', bg: '#c4d8ff' },
  fear:     { skin: '#e8b48c', hair: '#8a8a8a', style: 'bald', bg: '#e3cdfa' }
};

function hair(c) {
  const h = c.hair;
  switch (c.style) {
    case 'curls': return [46,64,84,104,124,144,154].map((x,i)=>`<circle cx="${x}" cy="${62 + (i%2)*6 - (i>1&&i<5?14:0)}" r="16" fill="${h}"/>`).join('');
    case 'tophat': return `<rect x="56" y="10" width="88" height="44" rx="5" fill="#2a2a35"/><rect x="56" y="42" width="88" height="8" fill="#c0392b"/><ellipse cx="100" cy="54" rx="64" ry="9" fill="#2a2a35"/>`;
    case 'bun': return `<circle cx="100" cy="36" r="20" fill="${h}"/><path d="M40 100 Q38 44 100 42 Q162 44 160 100 Q150 66 100 64 Q50 66 40 100Z" fill="${h}"/>`;
    case 'cap': return `<path d="M42 82 Q44 40 100 38 Q156 40 158 82Z" fill="#5a6b3a"/><path d="M40 80 Q100 70 172 84 Q150 92 100 88 Q60 88 40 80Z" fill="#46542c"/><circle cx="100" cy="40" r="5" fill="#46542c"/>`;
    case 'bow': return `<path d="M38 120 Q30 40 100 40 Q170 40 162 120 Q160 80 140 68 Q100 82 60 68 Q40 80 38 120Z" fill="${h}"/><path d="M128 44 L150 30 L152 58Z M128 44 L110 28 L106 56Z" fill="#ff5c8a"/><circle cx="129" cy="44" r="6" fill="#e6396b"/>`;
    case 'bald': return `<path d="M40 104 Q36 80 50 74 L52 100Z M160 104 Q164 80 150 74 L148 100Z" fill="${h}"/><path d="M72 132 Q86 124 100 130 Q114 124 128 132 Q114 136 100 134 Q86 136 72 132Z" fill="${h}"/>`;
  }
  return '';
}

const EMO = {
  joy: `<path d="M64 82 Q78 74 92 82 M108 82 Q122 74 136 82" stroke="#5a3a22" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M67 104 Q78 92 89 104 M111 104 Q122 92 133 104" stroke="#2b1d14" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="64" cy="124" r="11" fill="#ff7b8a" opacity=".45"/><circle cx="136" cy="124" r="11" fill="#ff7b8a" opacity=".45"/>
    <path d="M68 134 Q100 182 132 134 Q100 146 68 134Z" fill="#7a1f2b"/><path d="M73 137 Q100 147 127 137 L124 143 Q100 152 76 143Z" fill="#fff"/><path d="M86 158 Q100 152 114 158 Q100 168 86 158Z" fill="#ff6f7d"/>`,
  sadness: `<path d="M64 90 L92 78 M108 78 L136 90" stroke="#5a3a22" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="78" cy="104" rx="8" ry="9" fill="#fff"/><ellipse cx="122" cy="104" rx="8" ry="9" fill="#fff"/><circle cx="78" cy="108" r="5" fill="#2b1d14"/><circle cx="122" cy="108" r="5" fill="#2b1d14"/>
    <path d="M68 98 Q78 94 88 100 M112 100 Q122 94 132 98" stroke="#2b1d14" stroke-width="3" fill="none"/>
    <path d="M78 156 Q100 136 122 156" stroke="#7a1f2b" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M70 116 Q64 130 70 134 Q78 134 74 120Z" fill="#4aa3ff"/>`,
  anger: `<path d="M60 76 L94 92 M106 92 L140 76" stroke="#2b1d14" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M68 102 L90 104 Q80 112 70 106Z M110 104 L132 102 Q130 106 120 112Z" fill="#2b1d14"/>
    <rect x="76" y="138" width="48" height="16" rx="4" fill="#fff" stroke="#7a1f2b" stroke-width="4"/><path d="M76 146 H124 M88 138 V154 M100 138 V154 M112 138 V154" stroke="#7a1f2b" stroke-width="2"/>
    <circle cx="100" cy="110" r="64" fill="#ff2a2a" opacity=".16"/><path d="M150 52 l8 -8 M156 60 l10 -2 M146 46 l2 -10" stroke="#e53935" stroke-width="4" stroke-linecap="round"/>`,
  fear: `<path d="M62 80 L92 66 M108 66 L138 80" stroke="#5a3a22" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="78" cy="102" r="13" fill="#fff" stroke="#2b1d14" stroke-width="2"/><circle cx="122" cy="102" r="13" fill="#fff" stroke="#2b1d14" stroke-width="2"/><circle cx="78" cy="102" r="3.5" fill="#2b1d14"/><circle cx="122" cy="102" r="3.5" fill="#2b1d14"/>
    <path d="M74 142 Q100 134 126 142 L122 158 Q100 164 78 158Z" fill="#5a1a24"/><path d="M78 142 Q100 137 122 142 L121 147 Q100 142 79 147Z" fill="#fff"/>
    <path d="M150 74 Q144 88 150 92 Q158 90 150 74Z" fill="#7fd3ff"/><circle cx="100" cy="110" r="64" fill="#7b8cff" opacity=".14"/>`,
  disgust: `<path d="M64 86 L92 92 M108 94 L136 80" stroke="#2b1d14" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M68 104 Q78 98 88 104 Q78 108 68 104Z M112 104 Q122 98 132 104 Q122 108 112 104Z" fill="#2b1d14"/>
    <path d="M90 116 l6 4 M110 116 l-6 4 M92 124 l5 2 M108 124 l-5 2" stroke="#5a3a22" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M74 146 Q84 134 96 142 Q108 132 126 140 Q112 152 100 150 Q86 154 74 146Z" fill="#7a1f2b"/><path d="M92 148 Q100 172 110 150Z" fill="#ff8fa3"/>
    <circle cx="100" cy="110" r="64" fill="#5fd35f" opacity=".16"/><path d="M152 120 q6 -6 0 -12 q-6 -6 0 -12 M164 124 q6 -6 0 -12 q-6 -6 0 -12" stroke="#58b858" stroke-width="3" fill="none"/>`,
  surprise: `<path d="M60 74 Q78 54 96 70 M104 70 Q122 54 140 74" stroke="#5a3a22" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="78" cy="100" r="11" fill="#fff" stroke="#2b1d14" stroke-width="2"/><circle cx="122" cy="100" r="11" fill="#fff" stroke="#2b1d14" stroke-width="2"/><circle cx="78" cy="101" r="5" fill="#2b1d14"/><circle cx="122" cy="101" r="5" fill="#2b1d14"/>
    <ellipse cx="100" cy="150" rx="12" ry="17" fill="#5a1a24"/><path d="M40 40 l8 8 M160 40 l-8 8 M100 18 v10" stroke="#ffb300" stroke-width="4" stroke-linecap="round"/>`
};

export function faceSVG(kind) {
  const c = CH[kind];
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="100" cy="100" r="98" fill="${c.bg}"/>
    <ellipse cx="38" cy="112" rx="10" ry="14" fill="${c.skin}"/><ellipse cx="162" cy="112" rx="10" ry="14" fill="${c.skin}"/>
    <ellipse cx="100" cy="110" rx="62" ry="66" fill="${c.skin}"/>
    ${c.style === 'bald' ? '' : ''}
    <path d="M97 112 Q100 124 106 124" stroke="#00000055" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${EMO[kind]}
    ${hair(c)}
  </svg>`;
}

/* ---------- קומיקס ---------- */
function guy(x, y, s, o = {}) {
  const coat = o.coat || '#3d5a80', skin = o.skin || '#f1c7a1', hat = o.hat;
  const walk = o.walk ? `<path d="M-4 -34 L-14 0 M4 -34 L12 0" stroke="#333" stroke-width="7" stroke-linecap="round"/>` : `<path d="M-5 -34 V0 M5 -34 V0" stroke="#333" stroke-width="7" stroke-linecap="round"/>`;
  const hats = { top: `<rect x="-10" y="-124" width="20" height="20" fill="#222"/><rect x="-15" y="-106" width="30" height="4" fill="#222"/>`,
    bonnet: `<path d="M-15 -96 Q-14 -118 0 -118 Q14 -118 15 -96 Q0 -104 -15 -96Z" fill="${o.hatc || '#e94f8a'}"/>`,
    cap: `<path d="M-12 -102 Q0 -114 12 -102 L16 -100 L-12 -100Z" fill="#6b4f2b"/>` };
  const head = `<circle cx="0" cy="-92" r="12" fill="${skin}"/><circle cx="-4" cy="-93" r="1.6" fill="#222"/><circle cx="4" cy="-93" r="1.6" fill="#222"/>`;
  const dress = o.dress ? `<path d="M-14 -78 Q0 -84 14 -78 L20 -30 L-20 -30Z" fill="${coat}"/>` : `<rect x="-14" y="-80" width="28" height="48" rx="10" fill="${coat}"/>`;
  const arms = o.arms || `<path d="M-13 -72 L-20 -44 M13 -72 L20 -44" stroke="${coat}" stroke-width="6" stroke-linecap="round"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${walk}${dress}${arms}${head}${hat ? hats[hat] : ''}${o.extra || ''}</g>`;
}
function think(x, y, w, txt, fs = 10) {
  return `<g><ellipse cx="${x}" cy="${y}" rx="${w}" ry="15" fill="#fff" stroke="#333" stroke-width="1.5"/><circle cx="${x + w * 0.3}" cy="${y + 20}" r="3.5" fill="#fff" stroke="#333" stroke-width="1.2"/><circle cx="${x + w * 0.38}" cy="${y + 28}" r="2.2" fill="#fff" stroke="#333" stroke-width="1"/><text x="${x}" y="${y + 4}" font-size="${fs}" text-anchor="middle" font-family="Rubik" fill="#222">${txt}</text></g>`;
}
function say(x, y, w, txt, fs = 11, tail = 1) {
  return `<g><rect x="${x - w}" y="${y - 14}" width="${w * 2}" height="26" rx="12" fill="#fff" stroke="#333" stroke-width="1.5"/><path d="M${x + tail * 6} ${y + 11} l${tail * 8} 12 l${tail * 4} -12" fill="#fff" stroke="#333" stroke-width="1.5"/><rect x="${x - w + 2}" y="${y + 8}" width="${w * 2 - 4}" height="4" fill="#fff"/><text x="${x}" y="${y + 4}" font-size="${fs}" text-anchor="middle" font-family="Rubik" font-weight="600" fill="#222">${txt}</text></g>`;
}
function scene(cap, inner, sky = '#bfe3ff') {
  return `<svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" class="panel">
    <rect width="320" height="240" fill="${sky}"/>
    <rect x="0" y="70" width="70" height="120" fill="#c98b6b"/><rect x="74" y="50" width="80" height="140" fill="#e2b07a"/><rect x="160" y="80" width="70" height="110" fill="#a7a1c9"/><rect x="236" y="60" width="84" height="130" fill="#d98f8f"/>
    ${[10,40,88,120,172,200,250,286].map((x,i)=>`<rect x="${x}" y="${96 + (i%2)*28}" width="16" height="20" fill="#fff6c9" opacity=".85"/>`).join('')}
    <rect x="0" y="186" width="320" height="54" fill="#8e9aa6"/><rect x="0" y="182" width="320" height="6" fill="#6d7884"/>
    ${inner}
    <rect x="6" y="6" width="308" height="28" rx="6" fill="#fffbe8" stroke="#333" stroke-width="1.5"/>
    <text x="160" y="25" font-size="13" text-anchor="middle" font-family="Rubik" font-weight="700" fill="#222">${cap}</text>
  </svg>`;
}
const apples = (x, y) => [[0,0],[14,4],[26,-2],[40,6],[-12,6]].map(([a,b])=>`<circle cx="${x+a}" cy="${y+b}" r="5" fill="#e53935"/>`).join('');
const fallen = (x, y) => `<g transform="translate(${x} ${y}) rotate(-78)">${guy(0, 0, 0.75, { coat: '#7b4fa0', hat: 'cap' })}</g>`;

const M5 = 'img/';
const CPANELS = [
  { img: 'cp1-r7k', cap: '1. צהריים ברחוב הראשי. המון אנשים.', alt: 'רחוב סואן בלונדון. איש במעיל סגול מועד והתפוחים עפים מהשקית',
    b: [{ t: 'say', x: 44, y: 7, w: 26, txt: 'אוּפּס!', tail: 'r' }] },
  { img: 'cp2-m3q', cap: '2. הוא נפל. כולם רואים…', alt: 'האיש שוכב על המדרכה בין התפוחים ומושיט יד. העוברים ושבים מסתכלים וממשיכים ללכת',
    b: [{ t: 'think', x: 37, y: 3, w: 36, txt: 'מישהו אחר כבר יעזור', tail: 'l' }, { t: 'think', x: 80, y: 4, w: 26, txt: 'אני ממהר…', tail: 'l' }, { t: 'say', x: 50, y: 44, w: 34, txt: 'הצילו… מישהו?', tail: 'r' }] },
  { img: 'cp3-x9d', cap: '3. עשרות אנשים עברו. אף אחד לא עצר.', alt: 'המון אנשים עוברים משני הצדדים. האיש יושב לבד על הארץ, ואף אחד לא עוצר',
    b: [{ t: 'think', x: 50, y: 3, w: 62, txt: 'אם אף אחד לא עוזר – כנראה שהכול בסדר', tail: 'c' }] },
  { img: 'cp4-b2w', cap: '4. באותו ערב, ברחוב ריק:', alt: 'ערב ברחוב ריק. אישה במעיל כתום כורעת ליד האיש ועוזרת לו לקום', night: 1,
    b: [{ t: 'say', x: 72, y: 5, w: 44, txt: 'אתה בסדר? בוא, אעזור לך!', tail: 'l' }] }
];
export function comicSVG() {
  const panel = (p, i) => `<figure class="cpanel${p.night ? ' night' : ''}"><div class="cpimg"><img src="${M5}${p.img}.webp?v=9" alt="${p.alt}" loading="eager" decoding="async" width="960" height="720">${p.b.map(b => `<span class="cb ${b.t} t-${b.tail}" style="left:${b.x}%;top:${b.y}%;width:${b.w}%">${b.txt}</span>`).join('')}</div><figcaption class="ccap">${p.cap}</figcaption></figure>`;
  return `<div class="comic">${CPANELS.map(panel).join('')}</div>`;
}

/* ---------- שלבי התפתחות ---------- */
function kid(s, o) { return guy(80, 148, s, o); }
export const STAGE_SVG = {
  baby: `<img class="dimg" src="${M5}st-h4a.webp?v=9" alt="" width="512" height="512" draggable="false">`,
  toddler: `<img class="dimg" src="${M5}st-p8e.webp?v=9" alt="" width="512" height="512" draggable="false">`,
  child: `<img class="dimg" src="${M5}st-k2n.webp?v=9" alt="" width="512" height="512" draggable="false">`,
  teen: `<img class="dimg" src="${M5}st-w6c.webp?v=9" alt="" width="512" height="512" draggable="false">`,
  adult: `<img class="dimg" src="${M5}st-d1r.webp?v=9" alt="" width="512" height="512" draggable="false">`
};

export const AVATAR = {
  psycho: `<img class="avimg" src="img/ava-psycho.webp?v=9" alt="מר פסיכו">`,
  logia: `<img class="avimg" src="img/ava-logia.webp?v=9" alt="גברת לוגיה">`
};

/* ---------- משחק הזיכרון: 6 אשליות ראייה מקוריות (SVG) ---------- */
const BGI = c => `<rect width="100" height="100" fill="${c}"/>`;
export const ILLUSIONS = [
  { id: 'muller', name: 'מילר-לייר', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#fff6df')}<g stroke="#1d3557" stroke-width="4" stroke-linecap="round" fill="none"><path d="M28 34H72M28 34l9-9M28 34l9 9M72 34l-9-9M72 34l-9 9"/><path d="M28 68H72M28 68l-9-9M28 68l-9 9M72 68l9-9M72 68l9 9"/></g></svg>` },
  { id: 'ponzo', name: 'פונזו (פסי הרכבת)', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#e9f4ff')}<g stroke="#6b4f2a" stroke-width="3"><path d="M44 8L16 96M56 8L84 96"/>${[20, 34, 50, 68, 88].map((y, i) => `<path d="M${50 - 6 - y * .32} ${y}H${50 + 6 + y * .32}" stroke-width="${1.5 + i * .5}"/>`).join('')}</g><rect x="38" y="24" width="24" height="6" fill="#e63946"/><rect x="38" y="74" width="24" height="6" fill="#e63946"/></svg>` },
  { id: 'kanizsa', name: 'משולש קניזה', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#fdf0f6')}<g fill="#8a1c5c"><circle cx="50" cy="20" r="13"/><circle cx="20" cy="74" r="13"/><circle cx="80" cy="74" r="13"/></g><path d="M50 20L20 74H80Z" fill="#fdf0f6"/></svg>` },
  { id: 'rubin', name: 'האגרטל של רובין', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#14213d')}<path fill="#ffd166" d="M72 6C71.5 8.0 70.0 14.2 69 18C68.0 21.8 68.0 25.7 66 29C64.0 32.3 57.5 35.5 57 38C56.5 40.5 62.5 42.2 63 44C63.5 45.8 60.0 47.5 60 49C60.0 50.5 63.0 51.7 63 53C63.0 54.3 59.8 55.3 60 57C60.2 58.7 64.0 60.8 64 63C64.0 65.2 59.8 66.8 60 70C60.2 73.2 63.2 78.0 65 82C66.8 86.0 70.0 92.0 71 94L29 94C30.0 92.0 33.2 86.0 35 82C36.8 78.0 39.8 73.2 40 70C40.2 66.8 36.0 65.2 36 63C36.0 60.8 39.8 58.7 40 57C40.2 55.3 37.0 54.3 37 53C37.0 51.7 40.0 50.5 40 49C40.0 47.5 36.5 45.8 37 44C37.5 42.2 43.5 40.5 43 38C42.5 35.5 36.0 32.3 34 29C32.0 25.7 32.0 21.8 31 18C30.0 14.2 28.5 8.0 28 6Z"/></svg>` },
  { id: 'necker', name: 'קוביית נקר', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#eafaf1')}<g fill="none" stroke="#17643f" stroke-width="3" stroke-linejoin="round"><rect x="20" y="34" width="44" height="44"/><rect x="36" y="18" width="44" height="44"/><path d="M20 34L36 18M64 34L80 18M20 78L36 62M64 78L80 62"/></g></svg>` },
  { id: 'hermann', name: 'רשת הרמן', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${BGI('#ffffff')}<g fill="#111">${[0, 1, 2, 3].flatMap(r => [0, 1, 2, 3].map(c => `<rect x="${6 + c * 23}" y="${6 + r * 23}" width="19" height="19"/>`)).join('')}</g></svg>` }
];
