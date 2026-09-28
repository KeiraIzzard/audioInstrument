// Layout prototype 1: central trunk.
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

// layout: one central trunk with tiles branching off alternate sides
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

growTiles(8);
// ---- end growth tiles ----