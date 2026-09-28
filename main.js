// find our intro modal
const introModal = document.getElementById("intro-modal");
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");

////// Modal
introModal.showModal();
introModalCloseButton.addEventListener("click", function closeIntroModal(){
    introModal.close();
});
introModal.addEventListener("close", toneInit);

////// Tone
const synth = new Tone.PolySynth();

function toneInit(){
    synth.connect(Tone.Destination);
}

// ---- branch drawing ----
const canvas = document.getElementById('branch-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// draws a slightly curved line so branches don't look like ruler lines
function drawBranch(fromX, fromY, toX, toY) {
  const midX = (fromX + toX) / 2 + (Math.random() * 40 - 20);
  const midY = (fromY + toY) / 2 + (Math.random() * 40 - 20);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(midX, midY, toX, toY);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();
}
// ---- end branch drawing ----

// ---- weighted randomness (extended technique: Math.random()) ----
// each option has a weight: a higher weight means it is picked more often
const weightedNotes = [
  { value: 'C4', weight: 40 }, // common, the "home" note
  { value: 'E4', weight: 25 },
  { value: 'G4', weight: 20 },
  { value: 'D4', weight: 10 },
  { value: 'A4', weight: 5 }   // rare
];

const weightedColours = [
  { value: '#3a5ba0', weight: 40 }, // deep blue, common
  { value: '#5aa0d8', weight: 25 }, // sky blue
  { value: '#6b4fa0', weight: 15 }, // dusk purple
  { value: '#c4506b', weight: 10 }, // rose
  { value: '#e07a5f', weight: 6 },  // sunset coral
  { value: '#f2b25c', weight: 4 }   // amber, rare
];

// rolls a random number up to the total weight, then walks the list
// until the roll runs out, so heavier options catch more of the range
function weightedPick(options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let roll = Math.random() * total;

  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) {
      return option.value;
    }
  }
  return options[options.length - 1].value; // safety fallback
}
// ---- end weighted randomness ----

// ---- growth tiles ----
// builds a random jagged outline, like a shard of glass
// shape stays uniformly random here so weighting is the only variable being tested
function randomShard() {
  const points = [];
  const count = 5 + Math.floor(Math.random() * 3); // 5 to 7 corners

  for (let i = 0; i < count; i++) {
    // corners spaced around the tile, each nudged off-angle and pushed in or out
    const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.6 - 0.3);
    const radius = 28 + Math.random() * 22; // percent of tile size
    const x = 50 + Math.cos(angle) * radius;
    const y = 50 + Math.sin(angle) * radius;
    points.push(x.toFixed(1) + '% ' + y.toFixed(1) + '%');
  }
  return 'polygon(' + points.join(', ') + ')';
}

function createTile(x, y) {
  const tile = document.createElement('button');
  tile.className = 'growth-tile';

  // weighted picks decide this tile's note and both gradient colours
  tile.dataset.note = weightedPick(weightedNotes);
  tile.style.setProperty('--c1', weightedPick(weightedColours));
  tile.style.setProperty('--c2', weightedPick(weightedColours));
  tile.style.setProperty('--angle', Math.floor(Math.random() * 360) + 'deg');

  tile.style.clipPath = randomShard();

  const size = 50 + Math.random() * 40; // 50 to 90px
  tile.style.width = size + 'px';
  tile.style.height = size + 'px';

  tile.style.left = x + 'px';
  tile.style.top = y + 'px';

  tile.addEventListener('mouseenter', playTileNote);
  tile.addEventListener('mouseleave', endNote);
  tile.addEventListener('focus', playTileNote);
  tile.addEventListener('blur', endNote);

  document.body.appendChild(tile);
}

function playTileNote(e){
  const note = e.target.dataset.note;
  synth.triggerAttack(note);
}

function endNote(e){
  const note = e.target.dataset.note;
  synth.triggerRelease(note);
}

// baseline layout: one central trunk with tiles branching off alternate sides
function growTiles(count) {
  const trunkX = window.innerWidth / 2; // centred on any screen width
  const trunkBottomY = 700;
  const trunkTopY = 350;

  // the trunk itself
  drawBranch(trunkX, trunkBottomY, trunkX, trunkTopY);

  for (let i = 0; i < count; i++) {
    // point on the trunk this branch grows from
    const y = trunkBottomY - (i / count) * (trunkBottomY - trunkTopY);
    // alternate left and right of the trunk
    const side = i % 2 === 0 ? -1 : 1;
    const tileX = trunkX + side * (70 + Math.random() * 100);
    const tileY = y - 20 - Math.random() * 40;

    drawBranch(trunkX, y, tileX, tileY);
    createTile(tileX, tileY);
  }
}

// a few more tiles than prototype 1 so the weighting is easier to notice
growTiles(10);
// ---- end growth tiles ----