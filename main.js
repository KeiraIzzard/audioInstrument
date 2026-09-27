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

// ---- growth tiles ----
const notes = ['C4', 'D4', 'E4', 'G4', 'A4'];

function createTile(x, y) {
  const tile = document.createElement('button');
  tile.className = 'growth-tile';
  tile.dataset.note = notes[Math.floor(Math.random() * notes.length)];
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

function growTiles(count) {
  const centreX = 300;
  const trunkTopY = 100;
  const trunkBottomY = 400;

  for (let i = 0; i < count; i++) {
    const y = trunkTopY + (i / count) * (trunkBottomY - trunkTopY);
    const x = centreX + (Math.random() * 100 - 50);
    createTile(x, y);
  }
}

growTiles(6);
// ---- end growth tiles ----