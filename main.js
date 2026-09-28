// Layout prototype 2: off-centre diagonal growth.
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

// layout: a diagonal trunk from lower left to upper right, centred on the page,
// with tiles branching off alternate sides of it
function growTiles(count) {
  const centreX = window.innerWidth / 2; // middle of the page on any screen width
  const halfSpan = 220;                  // how far the trunk reaches either side of centre
  const startX = centreX - halfSpan;
  const startY = 660;
  const endX = centreX + halfSpan;
  const endY = 400;

  // the trunk itself
  drawBranch(startX, startY, endX, endY);

  // direction along the trunk, and the direction at right angles to it
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.hypot(dx, dy);
  const perpX = -dy / length;
  const perpY = dx / length;

  for (let i = 0; i < count; i++) {
    // point on the trunk this branch grows from
    const t = (i + 0.5) / count;
    const trunkPointX = startX + t * dx;
    const trunkPointY = startY + t * dy;

    // alternate sides, pushed out at right angles to the trunk
    const side = i % 2 === 0 ? -1 : 1;
    const reach = 80 + Math.random() * 90;
    const tileX = trunkPointX + side * perpX * reach;
    const tileY = trunkPointY + side * perpY * reach;

    drawBranch(trunkPointX, trunkPointY, tileX, tileY);
    createTile(tileX, tileY);
  }
}

growTiles(8);
// ---- end growth tiles ----
