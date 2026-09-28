/// find intro modal
const introModal = document.getElementById("intro-modal");
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");

/// Modal
introModal.showModal();
introModalCloseButton.addEventListener("click", function closeIntroModal(){
    introModal.close();
});
introModal.addEventListener("close", toneInit);

/// Tone
const synth = new Tone.PolySynth();

function toneInit(){
    synth.connect(Tone.Destination);
}

/// branch drawing
const canvas = document.getElementById('branch-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/// slightly curved line branch - organic looking
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
// end branch drawing

// growth tiles
const notes = ['C4', 'D4', 'E4', 'G4', 'A4'];

// tile colours, taken from the sunset sky panel tiles in my inspo picture from pinterest
const palette = [
  '#3a5ba0', // deep blue
  '#5aa0d8', // sky blue
  '#6b4fa0', // dusk purple
  '#c4506b', // rose
  '#e07a5f', // sunset coral
  '#f2b25c'  // amber
];


function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// random jagged tile outline using extended technique: Math.random())
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

  // Math.random() decides this tile's note, outline, size and colours
  tile.dataset.note = randomFrom(notes);
  tile.style.clipPath = randomShard();

  const size = 50 + Math.random() * 40; // 50 to 90px
  tile.style.width = size + 'px';
  tile.style.height = size + 'px';

  
  tile.style.setProperty('--c1', randomFrom(palette));
  tile.style.setProperty('--c2', randomFrom(palette));
  tile.style.setProperty('--angle', Math.floor(Math.random() * 360) + 'deg'); // gradient direction

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

// base layout one central trunk with tiles branching off sides
function growTiles(count) {
  const trunkX = window.innerWidth / 2; 
  const trunkBottomY = 700;
  const trunkTopY = 350;

  // the trunk itself
  drawBranch(trunkX, trunkBottomY, trunkX, trunkTopY);

  for (let i = 0; i < count; i++) {
    // point on the trunk this branch grows from
    const y = trunkBottomY - (i / count) * (trunkBottomY - trunkTopY);
    // tiles sit left and right of the trunk
    const side = i % 2 === 0 ? -1 : 1;
    const tileX = trunkX + side * (70 + Math.random() * 100);
    const tileY = y - 20 - Math.random() * 40;

    drawBranch(trunkX, y, tileX, tileY);
    createTile(tileX, tileY);
  }
}

growTiles(8);
// end growth tiles 