// Layout prototype 3: multi-point growth.
// Only growTiles() differs from the other Layout branches.

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

// ---- growth tiles ----
const notes = ['C4', 'D4', 'E4', 'G4', 'A4'];

function createTile(x, y) {
  const tile = document.createElement('button');
  tile.className = 'growth-tile';
  // Math.random() picks this tile's note
  tile.dataset.note = notes[Math.floor(Math.random() * notes.length)];
  tile.style.left = x + 'px';
  tile.style.top = y + 'px';

  tile.addEventListener('mouseenter', playTileNote);
  tile.addEventListener('mouseleave', endNote);
  tile.addEventListener('focus', playTileNote); // keyboard equivalent of hover
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

// layout: one root splits into three anchor points,
// and each anchor grows its own cluster of tiles
function growTiles(count) {
  const centreX = window.innerWidth / 2; // centred on any screen width
  const root = { x: centreX, y: 700 };
  const anchors = [
    { x: centreX - 150, y: 450 },
    { x: centreX + 150, y: 550 },
    { x: centreX, y: 350 }
  ];
  const spread = 90;

  // trunk: root branching to each anchor, drawn once
  anchors.forEach(anchor => {
    drawBranch(root.x, root.y, anchor.x, anchor.y);
  });

  // tiles: cycle through the anchors so each one gets a cluster
  for (let i = 0; i < count; i++) {
    const anchor = anchors[i % anchors.length];
    const x = anchor.x + (Math.random() * spread * 2 - spread);
    const y = anchor.y + (Math.random() * spread * 2 - spread);
    drawBranch(anchor.x, anchor.y, x, y);
    createTile(x, y);
  }
}

growTiles(9);
// ---- end growth tiles ----