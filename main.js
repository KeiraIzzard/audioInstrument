// document.body.style.backgroundColor = "red";
// find my test button
const testButton = document.getElementById("test-button");
// find my key test button
const key = document.getElementById("key-test");
// find our intro modal
const introModal = document.getElementById("intro-modal");
// console.log(introModal);
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");

// is the mouse button held?
let mouseButtonDown = false;

//introdialog.showModal();
//document.body.style.backgroundColor = "red";

////// Modal
// browser loads html > browser loads js > js to open modal > user presses ok on modal > modal closes > audio init
// user can also close modal with esc key
// show modal on page load
introModal.showModal();
// when ok clicked, close modal
introModalCloseButton.addEventListener("click", function closeIntroModal(){
    // close our modal
    introModal.close();
});
// when dialog closes by whatever means, load audio system
introModal.addEventListener("close", toneInit);

// introModalCloseButton.addEventListener("click", () => {
//    introModal.close();
// });


////// Tone

// create instrument
const synth = new Tone.Synth();

function toneInit(){
    // connect synth to audio output
    synth.connect(Tone.Destination);
}

function playNote(e){
    // find the element that the event ran on
    let keyPressed = e.target;
    console.log(keyPressed);
    // find the data-note attribute of that element
    let note = keyPressed.dataset.note;
    console.log(note);
}

testButton.addEventListener("mousedown", playNote);
key.addEventListener("mousedown", playNote);
con
