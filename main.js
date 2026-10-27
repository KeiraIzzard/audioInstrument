// Final instrument: central trunk layout (tester-preferred, least cluttered),
// combining weighted randomness with random timing.

const introModal = document.getElementById("intro-modal");
const introModalCloseButton = document.getElementById("intro-modal-close");

introModal.showModal();
introModalCloseButton.addEventListener("click", function closeIntroModal(){
    introModal.close();
});
introModal.addEventListener("close", startSession);

const synth = new Tone.PolySynth();

function startSession(){
    synth.connect(Tone.Destination);
    growTiles(10);
}

const canvas = document.getElementById('branch-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

function drawBranch(fromX, fromY, toX, toY) {
  const midX = (fromX + toX) / 2 + (Math.random() * 40 - 20);
  const midY = (fromY + toY) / 2 + (Math.random() * 40 - 20);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(midX, midY, toX, toY);
  ctx.strokeStyle = 'rgba(240, 246, 240, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// weighted: notes and colours from your two peer-tested Randomness prototypes,
// combined so common/rare hues come from the mood board palette and rare
// tiles glow gold, echoing the lit-up tiles in your reference images
const weightedNotes = [
  { value: 'C4', weight: 40 },
  { value: 'E4', weight: 25 },
  { value: 'G4', weight: 20 },
  { value: 'D4', weight: 10 },
  { value: 'A4', weight: 5 }
];

const weightedColours = [
  { value: '#58355E', weight: 30 }, // violet, common
  { value: '#3a5ba0', weight: 25 }, // deep blue
  { value: '#C4D6B6', weight: 20 }, // tea green
  { value: '#6b4fa0', weight: 15 }, // dusk purple
  { value: '#f2b25c', weight: 10 } // gold, rare — the glow colour
];

function weightedPick(options) {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option.value;
  }
  return options[options.length - 1].value;
}

function randomShard() {
  const points = [];
  const count = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
    const radius = 28 + Math.random() * 22;
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    points.push(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
  }
  return 'polygon(' + points.join(', ') + ')';
}

function createTile(x, y) {
  const tile = document.createElement('button');
  tile.className = 'growth-tile';

  const note = weightedPick(weightedNotes);
  const colour = weightedPick(weightedColours);
  tile.dataset.note = note;
  tile.style.clipPath = randomShard();

  const size = 50 + Math.random() * 40;
  tile.style.width = size + 'px';
  tile.style.height = size + 'px';

  tile.style.background = colour === '#f2b25c'
    ? `radial-gradient(circle, #ffd98a, ${colour})` // glow for the rare gold tile
    : `linear-gradient(135deg, ${colour}, #0d0d10)`;

  tile.style.left = x + 'px';
  tile.style.top = y + 'px';

  tile.addEventListener('mouseenter', playTileNote);
  tile.addEventListener('mouseleave', endNote);
  tile.addEventListener('focus', playTileNote);
  tile.addEventListener('blur', endNote);

  document.body.appendChild(tile);
}

function playTileNote(e){ synth.triggerAttack(e.target.dataset.note); }
function endNote(e){ synth.triggerRelease(e.target.dataset.note); }

// timing: each tile grows in after its own random delay, combined
// with the central trunk layout testers rated clearest
function growTiles(count) {
  const trunkX = window.innerWidth / 2;
  const trunkBottomY = 700;
  const trunkTopY = 350;
  const maxDelay = 15000;

  drawBranch(trunkX, trunkBottomY, trunkX, trunkTopY);

  for (let i = 0; i < count; i++) {
    const y = trunkBottomY - (i / count) * (trunkBottomY - trunkTopY);
    const side = i % 2 === 0 ? -1 : 1;
    const tileX = trunkX + side * (70 + Math.random() * 100);
    const tileY = y - 20 - Math.random() * 40;
    const delay = Math.random() * maxDelay;

    setTimeout(function() {
      drawBranch(trunkX, y, tileX, tileY);
      createTile(tileX, tileY);
    }, delay);
  }
}