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

function calculateTotalComparisons(n) {
    if (n < 2) return 0;
    if (n <= 4) return Math.ceil(n * (n - 1) / 2);
    const totalPossiblePairs = n * (n - 1) / 2;
    const coverageRatio = Math.max(0.6, Math.min(0.8, 1 - (n - 5) * 0.05));
    const targetComparisons = Math.ceil(totalPossiblePairs * coverageRatio);
    const minRounds = Math.ceil(Math.log2(n)) + 2;
    const minComparisons = n * minRounds / 2;
    return Math.max(targetComparisons, minComparisons);
}

// Drag & drop and file input listeners
const dragZone = document.getElementById('drag-zone');
const fileInput = document.getElementById('file-input');

const flameConfig = {
  particles: {
    number: { value: 30, density: { enable: false } },
    color: { value: ["#ff4500", "#ffae00", "#ffd600"] },
    shape: { type: "circle" },
    opacity: {
      value: 1,
      animation: {
        enable: true,
        speed: 3,
        minimumValue: 0,
        startValue: "max",
        destroy: "min"
      }
    },
    size: {
      value: { min: 2, max: 5 },
      animation: {
        enable: true,
        speed: 5,
        minimumValue: 0.5,
        startValue: "max",
        destroy: "min"
      }
    },
    move: {
      enable: true,
      direction: "top",
      speed: { min: 2, max: 4 },
      outModes: { default: "destroy" }
    }
  },
  detectRetina: true
}

dragZone.addEventListener('dragover', e => {
    e.preventDefault();
    dragZone.classList.add('drag-over');
});

dragZone.addEventListener('dragleave', e => {
    e.preventDefault();
    dragZone.classList.remove('drag-over');
});

dragZone.addEventListener('drop', e => {
    e.preventDefault();
    dragZone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
    if (files.length) processFiles(files);
});

fileInput.addEventListener('change', e => {
    processFiles([...e.target.files]);
});

function processFiles(files) {
    images = files.map(f => URL.createObjectURL(f));
    imageNames = {};
    files.forEach((f,i) => {
        imageNames[images[i]] = f.name.replace(/\.[^/.]+$/, '');
    });

    rankings = images.map((img,i) => ({
        id: i, image: img, wins: 0, losses: 0, opponents: new Set()
    }));
    comparisons.clear();
    totalNeeded = calculateTotalComparisons(images.length);
    completedComparisons = 0;
    isComplete = false;
    isTiebreaker = false;

    document.getElementById('upload-section').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');

    createFloatingImages();
    updateDisplay();
    showNextPair();
}

// Floating images physics
function createFloatingImages() {
    document.querySelectorAll('.floating-image').forEach(el => el.remove());
    floatingObjects = images.map(img => {
        const el = document.createElement('img');
        el.src = img;
        el.className = 'floating-image';
        document.body.appendChild(el);
        const obj = {
            element: el,
            x: Math.random() * (window.innerWidth - 150),
            y: Math.random() * (window.innerHeight - 150),
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            width: 150,
            height: 150,
            radius: 75
        };
        el.style.left = obj.x + 'px';
        el.style.top = obj.y + 'px';
        const temp = new Image();
        temp.onload = function() {
            const ar = this.width / this.height;
            let w,h;
            if (ar > 1) {
                w = Math.min(150, this.width);
                h = w / ar;
            } else {
                h = Math.min(150, this.height);
                w = h * ar;
            }
            el.style.width = w + 'px';
            el.style.height = h + 'px';
            obj.width = w; obj.height = h; obj.radius = Math.max(w,h) / 2;
        };
        temp.src = img;
        return obj;
    });
    requestAnimationFrame(animateFloatingImages);
}

function animateFloatingImages() {
    floatingObjects.forEach(o => {
        o.x += o.vx; o.y += o.vy;
        if (o.x <= 0 || o.x >= window.innerWidth - o.width) {
            o.vx *= -0.8; o.x = Math.max(0, Math.min(window.innerWidth - o.width, o.x));
        }
        if (o.y <= 0 || o.y >= window.innerHeight - o.height) {
            o.vy *= -0.8; o.y = Math.max(0, Math.min(window.innerHeight - o.height, o.y));
        }
        o.element.style.left = o.x + 'px';
        o.element.style.top = o.y + 'px';
    });

    // simple circle collision
    for (let i = 0; i < floatingObjects.length; i++) {
        for (let j = i+1; j < floatingObjects.length; j++) {
            const a = floatingObjects[i], b = floatingObjects[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const dist = Math.hypot(dx, dy);
            if (dist < a.radius + b.radius) {
                const angle = Math.atan2(dy, dx);
                const sa = Math.hypot(a.vx, a.vy);
                const sb = Math.hypot(b.vx, b.vy);
                a.vx = Math.cos(angle) * sb * 0.7;
                a.vy = Math.sin(angle) * sb * 0.7;
                b.vx = -Math.cos(angle) * sa * 0.7;
                b.vy = -Math.sin(angle) * sa * 0.7;
                const overlap = a.radius + b.radius - dist;
                a.x += Math.cos(angle) * overlap * 0.5;
                a.y += Math.sin(angle) * overlap * 0.5;
                b.x -= Math.cos(angle) * overlap * 0.5;
                b.y -= Math.sin(angle) * overlap * 0.5;
            }
        }
    }

    requestAnimationFrame(animateFloatingImages);
}

function updateFloatingImages() {
    floatingObjects.forEach((o,i) => {
        o.element.classList.toggle('comparison-image', i === pair[0] || i === pair[1]);
    });
}

function checkForTiebreaker(p1, p2) {
    const s1 = p1.wins - p1.losses, s2 = p2.wins - p2.losses;
    const g1 = p1.wins + p1.losses, g2 = p2.wins + p2.losses;
    return s1 === s2 && g1 >= 2 && g2 >= 2 && s1 > 0;
}

function createFlameEffect(card) {
    const flames = document.createElement('div');
    flames.className = 'tiebreaker-flames';
    for (let i = 0; i < 12; i++) {
        const f = document.createElement('div');
        f.className = 'flame';
        f.style.left = Math.random()*100 + '%';
        f.style.bottom = Math.random()*20 + 'px';
        f.style.animationDelay = Math.random()*0.5 + 's';
        f.style.animationDuration = (0.6 + Math.random()*0.4) + 's';
        flames.appendChild(f);
    }
    card.appendChild(flames);
}

function choose(idx) {
    const [i,j] = pair;
    const win = idx === 0 ? rankings[i] : rankings[j];
    const lose = idx === 0 ? rankings[j] : rankings[i];
    win.wins++; lose.losses++;
    win.opponents.add(lose.id);
    lose.opponents.add(win.id);
    comparisons.add([i,j].sort().join('|'));
    completedComparisons++;
    if (completedComparisons >= totalNeeded) {
        isComplete = true;
        document.getElementById('comparison-section').classList.add('hidden');
        document.getElementById('completion-message').classList.remove('hidden');
    } else pickPair();
    updateDisplay();
}

function pickPair() {
    const arr = [...rankings].sort((a,b) => (b.wins-b.losses) - (a.wins-a.losses));
    let best = null, bestScore = -Infinity;
    for (let i=0; i<arr.length; i++) {
        for (let j=i+1; j<arr.length; j++) {
            const a = arr[i], b = arr[j];
            if (a.opponents.has(b.id)) continue;
            const ds = Math.abs((a.wins-a.losses) - (b.wins-b.losses));
            const score = 10 - ds - Math.abs(i-j)*0.1;
            if (score > bestScore) {
                bestScore = score; best = [a.id, b.id];
            }
        }
    }
    if (best) {
        pair = best;
        isTiebreaker = checkForTiebreaker(rankings[pair[0]], rankings[pair[1]]);
        ();
    } else {
        isComplete = true;
        document.getElementById('comparison-section').classList.add('hidden');
        document.getElementById('completion-message').classList.remove('hidden');
        updateDisplay();
    }
}

function showNextPair() {Add commentMore actions
    const grid = document.getElementById('comparison-grid');
    const alert = document.getElementById('tiebreaker-alert');
    alert.classList.toggle('hidden', !isTiebreaker);
    grid.classList.toggle('tiebreaker-mode', isTiebreaker);
    grid.innerHTML = '';
    [0,1].forEach(pos => {
        const card = document.createElement('div');
        card.className = 'choice-card';
        card.onclick = () => choose(pos);
        card.innerHTML = `
            <img src="${images[pair[pos]]}" alt="${imageNames[images[pair[pos]]]}" class="choice-image">
            <p class="choice-name">${imageNames[images[pair[pos]]] || ''}</p>
        `;
        createFlameEffect(card);
        grid.appendChild(card);
    });
    updateFloatingImages();
}

function updateDisplay() {
    const pct = totalNeeded ? Math.round(completedComparisons/totalNeeded*100) : 0;
    document.getElementById('progress-text').textContent = `Progress: ${completedComparisons} / ${totalNeeded} comparisons`;
    document.getElementById('progress-percent').textContent = `${pct}%`;
    document.getElementById('progress-bar').style.width = `${pct}%`;

    const rg = document.getElementById('rankings-grid');
    rg.innerHTML = '';
    [...rankings]
        .sort((a,b) => {
            const da = a.wins-a.losses, db = b.wins-b.losses;
            if (da !== db) return db - da;
            return (b.wins+b.losses) - (a.wins+a.losses);
        })
        .forEach((r,i) => {
            const item = document.createElement('div');
            item.className = 'ranking-item';
            item.innerHTML = `
                <div class="rank-number">${i+1}</div>
                <img src="${r.image}" alt="${imageNames[r.image]}" class="ranking-image">
                <div class="ranking-info">
                    <p class="ranking-name">${imageNames[r.image]}</p>
                    <p class="ranking-score">Score: ${r.wins - r.losses} (${r.wins}W-${r.losses}L)</p>
                </div>
            `;
            rg.appendChild(item);
        });
}

function exportResults() {
    const data = [...rankings]
        .sort((a,b) => {
            const da = a.wins-a.losses, db = b.wins-b.losses;
            if (da !== db) return db - da;
            return (b.wins+b.losses) - (a.wins+a.losses);
        })
        .map((r,i) => ({
            rank: i+1,
            name: imageNames[r.image],
            score: r.wins - r.losses,
            wins: r.wins,
            losses: r.losses,
            gamesPlayed: r.wins + r.losses
        }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rankings.json'; a.click();
    URL.revokeObjectURL(url);
}

function reset() {
    images = []; imageNames = {}; pair = [0,1]; rankings = [];
    comparisons.clear(); totalNeeded = 0; completedComparisons = 0;
    isComplete = false; isTiebreaker = false;
    document.querySelectorAll('.floating-image').forEach(el => el.remove());
    document.getElementById('upload-section').classList.remove('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('completion-message').classList.add('hidden');
    document.getElementById('comparison-section').classList.remove('hidden');
    document.getElementById('tiebreaker-alert').classList.add('hidden');
    fileInput.value = '';
}
