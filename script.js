let images = [];
let imageNames = {};
let pair = [0, 1];
let rankings = [];
let comparisons = new Set();
let totalNeeded = 0;
let completedComparisons = 0;
let isComplete = false;
let floatingObjects = [];
let isTiebreaker = false;
let tournamentMode = 'conservative';

function calculateTotalComparisons(n) {
  if (n < 2) return 0;
  if (n <= 4) return Math.ceil(n * (n - 1) / 2);
  const totalPairs = n * (n - 1) / 2;
  if (tournamentMode === 'swiss') {
    const rounds = Math.max(3, Math.ceil(Math.log2(n)) + 1);
    return Math.min(n * rounds / 2, totalPairs * 0.4);
  } else {
    const ratio = Math.max(0.6, Math.min(0.8, 1 - (n - 5) * 0.05));
    const target = Math.ceil(totalPairs * ratio);
    const minRounds = Math.ceil(Math.log2(n)) + 2;
    const minComp = n * minRounds / 2;
    return Math.max(target, minComp);
  }
}

function calculateTotalComparisonsForMode(n, mode) {
  const prev = tournamentMode;
  tournamentMode = mode;
  const val = calculateTotalComparisons(n);
  tournamentMode = prev;
  return val;
}

function updateModeStats() {
  const sample = 14;
  document.getElementById('conservative-stats').textContent = `~${calculateTotalComparisonsForMode(sample, 'conservative')} comparisons for ${sample} images`;
  document.getElementById('swiss-stats').textContent = `~${calculateTotalComparisonsForMode(sample, 'swiss')} comparisons for ${sample} images`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="tournament-mode"]').forEach(input => {
    input.addEventListener('change', () => {
      tournamentMode = input.value;
      document.querySelectorAll('.mode-option').forEach(label => label.classList.remove('selected'));
      input.closest('.mode-option').classList.add('selected');
      updateModeStats();
    });
  });
  updateModeStats();
});

const dragZone = document.getElementById('drag-zone');
const fileInput = document.getElementById('file-input');

dragZone.addEventListener('dragover', e => { e.preventDefault(); dragZone.classList.add('drag-over'); });
dragZone.addEventListener('dragleave', e => { e.preventDefault(); dragZone.classList.remove('drag-over'); });
dragZone.addEventListener('drop', e => {
  e.preventDefault(); dragZone.classList.remove('drag-over');
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
  if (files.length) processFiles(files);
});

fileInput.addEventListener('change', e => processFiles([...e.target.files]));

function processFiles(files) {
  images = files.map(f => URL.createObjectURL(f));
  imageNames = {};
  files.forEach((f,i) => imageNames[images[i]] = f.name.replace(/\.[^/.]+$/, ''));
  rankings = images.map((img,i) => ({ id: i, image: img, wins: 0, losses: 0, opponents: new Set() }));
  comparisons.clear();
  totalNeeded = calculateTotalComparisons(images.length);
  completedComparisons = 0;
  isComplete = false;
  isTiebreaker = false;
  document.getElementById('upload-section').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  createFloatingImages(); updateDisplay(); showNextPair();
}

function createFloatingImages() {
  document.querySelectorAll('.floating-image').forEach(el => el.remove());
  floatingObjects = images.map(img => {
    const el = document.createElement('img'); el.src = img; el.className = 'floating-image'; document.body.appendChild(el);
    const obj = { element: el, x: Math.random()* (window.innerWidth-150), y: Math.random()* (window.innerHeight-150), vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, width: 150, height: 150, radius: 75 };
    el.style.left = obj.x + 'px'; el.style.top = obj.y + 'px';
    const temp = new Image(); temp.onload = function() {
      const ar = this.width/this.height;
      let w,h;
      if(ar>1) { w = Math.min(150,this.width); h = w/ar; } else { h = Math.min(150,this.height); w = h*ar; }
      el.style.width = w+'px'; el.style.height = h+'px'; obj.width=w;obj.height=h;obj.radius=Math.max(w,h)/2;
    };
    temp.src = img;
    return obj;
  });
  requestAnimationFrame(animateFloatingImages);
}

function animateFloatingImages() {
  floatingObjects.forEach(o => {
    o.x+=o.vx; o.y+=o.vy;
    if(o.x<=0||o.x>=window.innerWidth-o.width){o.vx*=-0.8; o.x=Math.max(0,Math.min(window.innerWidth-o.width,o.x));}
    if(o.y<=0||o.y>=window.innerHeight-o.height){o.vy*=-0.8; o.y=Math.max(0,Math.min(window.innerHeight-o.height,o.y));}
    o.element.style.left=o.x+'px'; o.element.style.top=o.y+'px';
  });
  for(let i=0;i<floatingObjects.length;i++){
    for(let j=i+1;j<floatingObjects.length;j++){
      const a=floatingObjects[i], b=floatingObjects[j];
      const dx=a.x-b.x, dy=a.y-b.y, dist=Math.hypot(dx,dy);
      if(dist<a.radius+b.radius){
        const ang=Math.atan2(dy,dx), sa=Math.hypot(a.vx,a.vy), sb=Math.hypot(b.vx,b.vy);
        a.vx=Math.cos(ang)*sb*0.7; a.vy=Math.sin(ang)*sb*0.7;
        b.vx=-Math.cos(ang)*sa*0.7; b.vy=-Math.sin(ang)*sa*0.7;
        const overlap=a.radius+b.radius-dist;
        a.x+=Math.cos(ang)*overlap*0.5; a.y+=Math.sin(ang)*overlap*0.5;
        b.x-=Math.cos(ang)*overlap*0.5; b.y-=Math.sin(ang)*overlap*0.5;
      }
    }
  }
  requestAnimationFrame(animateFloatingImages);
}

function updateFloatingImages() {
  floatingObjects.forEach((o,i) => o.element.classList.toggle('comparison-image', i===pair[0]||i===pair[1]));
}

function checkForTiebreaker(p1,p2) {
  const s1=p1.wins-p1.losses, s2=p2.wins-p2.losses;
  const g1=p1.wins+p1.losses, g2=p2.wins+p2.losses;
  return s1===s2&&g1>=2&&g2>=2&&s1>0;
}

function createFlameEffect(card) {
  const flames=document.createElement('div'); flames.className='tiebreaker-flames';
  for(let i=0;i<12;i++){ const f=document.createElement('div'); f.className='flame'; f.style.left=Math.random()*100+'%'; f.style.bottom=Math.random()*20+'px'; f.style.animationDelay=Math.random()*0.5+'s'; f.style.animationDuration=(0.6+Math.random()*0.4)+'s'; flames.appendChild(f);} card.appendChild(flames);
}

function choose(idx) {
  const [i,j]=pair; const win=idx===0?rankings[i]:rankings[j]; const lose=idx===0?rankings[j]:rankings[i]; win.wins++; lose.losses++; win.opponents.add(lose.id); lose.opponents.add(win.id); comparisons.add([i,j].sort().join('|')); completedComparations### truncated###
