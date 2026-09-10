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
// update our variable based on the mouse being held down
window.addEventListener("mousedown", function(){
    mouseButtonDown = true;
});
window.addEventListener("mouseup", function(){
    mouseButtonDown = false;
});

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
// change to polysynth
const synth = new Tone.PolySynth();

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
    //console.log(note);
    // play the note for the right amount of time
    // if mouse button is held previously play note
    if(mouseButtonDown === true){
        synth.triggerAttack(note);
    }
    //console.log("shuffled");
}

function playImageNote(e){
    // find the element that the event ran on
    let keyPressed = e.target;
    //console.log(keyPressed);
    // find the data-note attribute of that element
    let note = keyPressed.dataset.note;
    //console.log(note);
    // play the note for the right amount of time
    // if mouse button is held previously play note
    synth.triggerAttack(note);
}

function endNote(e){
    // find the element that the event ran on
    let keyPressed = e.target;
    //console.log(keyPressed);
    // find the data-note attribute of that element
    let note = keyPressed.dataset.note;
    //console.log(note);
    // play the note for the right amount of time
    synth.triggerRelease(note);
}

testButton.addEventListener("mousedown", playNote);
testButton.addEventListener("mouseenter", playNote);
testButton.addEventListener("mouseup", endNote);
testButton.addEventListener("mouseleave", endNote);
key.addEventListener("mousedown", playNote);
key.addEventListener("mouseenter", playNote);
key.addEventListener("mouseup", endNote);
key.addEventListener("mouseleave", endNote);

// audio file playback
const playbackButton = document.getElementById("playback-button");
const audioTrack = document.getElementById("audio-track");

function playPauseAudio(){
    if(audioTrack.paused === true){
        audioTrack.play();
    } else {
        audioTrack.pause();
    }
}

playbackButton.addEventListener("click", playPauseAudio);

// randomly scrub to location
const randomButton = document.getElementById("random-location");

// move playback to random position in audio file
function randomLocation(){
    // find duration
    let trackLength = audioTrack.duration;
    audioTrack.currentTime = trackLength * Math.random();
}

randomButton.addEventListener("click", randomLocation);


// spatial control of synth based on image
const flowerPainting = document.getElementById("flower-painting");

function pitchBend(e){
    //console.log(e.layerX);
    synth.set({
        detune: e.layerX
    });
}

flowerPainting.addEventListener("mouseenter", playImageNote);
flowerPainting.addEventListener("mouseleave", endNote);
flowerPainting.addEventListener("mousemove", pitchBend);

// change the playback rate of my audio based on minutes of the hour
// find our timezone
let timeZone = Temporal.Now.timeZoneId();
console.log(timeZone);
// find the current instant
let currentInstant = Temporal.Now.instant();
// turn this into date/time
let currentDateTime = currentInstant.toZonedDateTimeISO(timeZone);
console.log(currentDateTime);
// then turn into plain time
let plainTime = Temporal.PlainTime.from(currentDateTime);
console.log(plainTime);

if(plainTime.minute > 39){
    audioTrack.playbackRate = 0.5;
} else {
    audioTrack.playbackRate = 2.0;
}
