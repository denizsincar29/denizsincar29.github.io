var bjoined = new Audio("audio/joined.wav");
var bleft = new Audio("audio/left.wav");
var bstart = new Audio("audio/start.wav");
var bstop = new Audio("audio/stop.wav");

var mic = false;
var now = new Date();
now.setTime(now.getTime()-1000);

async function main() {
  // CHANGE THIS TO A ROOM WITHIN YOUR DAILY ACCOUNT
  const ROOM_URL = "https://denizsincar29.daily.co/wc0";

  window.call = DailyIframe.createCallObject({
    url: ROOM_URL,
    audioSource: true,
    videoSource: false,
    dailyConfig: {},
  });

  call.on("connected!", () => {
    bjoined.play();
    console.log("yep!");
    speak("Connected!");
    setTimeout(turnon, 500); setTimeout(turnoff, 800); // check microphone.
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
  ptt=document.getElementById("ptt");
  if(mobileAndTabletCheck()){
    ptt.addEventListener("touchstart", turnon);
    ptt.addEventListener("touchend", turnoff);
  } else {
    ptt.addEventListener("mousedown", turnon);
    ptt.addEventListener("mouseup", turnoff);
  }
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

window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};