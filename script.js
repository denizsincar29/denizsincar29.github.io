var bjoined = new Audio("audio/joined.wav");
var bleft = new Audio("audio/left.wav");
var bstart = new Audio("audio/start.wav");
var bstop = new Audio("audio/stop.wav");

var mic = true;
var shiftlock = false;
var now = new Date();

async function main() {
  // CHANGE THIS TO A ROOM WITHIN YOUR DAILY ACCOUNT
  const ROOM_URL = "https://denizsincar29.daily.co/deniz";

  window.call = DailyIframe.createCallObject({
    url: ROOM_URL,
    audioSource: true,
    videoSource: false,
    dailyConfig: {},
  });

  call.on("connected!", () => {
    bjoined.play();
    speak("JOINED MEETING");
    turnoff();
  });
  call.on("error", (e) => console.error(e));

  call.on("track-started", playTrack);
  call.on("track-stopped", destroyTrack);
  call.on("participant-joined", part_joined);
  call.on("participant-left", part_left);
  let name = decodeURI(location.search.slice(1));
  if (name == "" || name == null || name == undefined) {
    name = prompt("введите ваше имя");
  }
  joinRoom(name);

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key == "Control") {
        turnon();
      }
    },
    false
  );
  document.addEventListener(
    "keyup",
    (event) => {
      if (event.key == "Control") {
        turnoff();
      }
    },
    false
  );
}

function turnon() {
  if (mic) {
    return;
  }
  call.setLocalAudio(true);
  mic = true;
  document.getElementById("ptt").classList.add("on");
  bstart.play();
  now = new Date();
}

function turnoff() {
  if (!mic || new Date() - now < 500) {
    return;
  }
  call.setLocalAudio(false);
  mic = false;
  document.getElementById("ptt").classList.remove("on");
  bstop.play();
}

async function joinRoom(uname) {
  await call.join({ userName: uname });
  updateParticipants();
}

async function leaveRoom() {
  await call.leave();
}

function playTrack(evt) {
  console.log("[TRACK STARTED]", evt.participant && evt.participant.session_id);
  bstart.play();
  // sanity check to make sure this is an audio track
  if (!(evt.track && evt.track.kind === "audio")) {
    console.error("!!! playTrack called without an audio track !!!", evt);
    return;
  }

  // don't play the local audio track (echo!)
  if (evt.participant.local) {
    return;
  }
  let audioEl = document.createElement("audio");
  document.body.appendChild(audioEl);
  audioEl.srcObject = new MediaStream([evt.track]);
  audioEl.play();
}

function destroyTrack(evt) {
  console.log(
    "[TRACK STOPPED]",
    (evt.participant && evt.participant.session_id) || "[left meeting]"
  );
  bstop.play();
  let els = Array.from(document.getElementsByTagName("video")).concat(
    Array.from(document.getElementsByTagName("audio"))
  );
  for (let el of els) {
    if (el.srcObject && el.srcObject.getTracks()[0] === evt.track) {
      el.remove();
    }
  }
}

function part_joined(evt) {
  bjoined.play();
  speak(evt["participant"]["user_name"] + " joined!");
  updateParticipants(evt);
}

function part_left(evt) {
  bleft.play();
  speak(evt["participant"]["user_name"] + " left!");
  updateParticipants(evt);
}

function updateParticipants(evt = "nd") {
  let el = document.getElementById("participants");
  el.innerHTML = "";
  let count = Object.entries(call.participants()).length;
  let part = Object.values(call.participants());
  for (item of part) {
    var li = document.createElement("li");
    li.innerText = item["user_name"];
    el.appendChild(li);
  }
}
