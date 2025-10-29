import './style.css'

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {

  apiKey: "AIzaSyBqEMR0oZl26r2XIxfjV9XdJhZonS01PTs",

  authDomain: "webrtc-project-57061.firebaseapp.com",

  projectId: "webrtc-project-57061",

  storageBucket: "webrtc-project-57061.firebasestorage.app",

  messagingSenderId: "1002178517903",

  appId: "1:1002178517903:web:cafe17b831b1757bdc09fa",

  measurementId: "G-E642N7T3F7"

};


const app = initializeApp(firebaseConfig)
const firestore = getFirestore(app)

const servers = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    },
  ],
}

// Global State
let pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;


const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');


// 1. setup media sources
webcamButton.onclick = async () => {
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getAudioTracks().forEach((track) => {
    pc.addTrack(TextTrackList, localStream);
  });


  // Pull tracks from remote stream, add to video stream
  pc.ontrack = event => {
    event.stream[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

};


// 2. create an offer
callButton.onclick = async () => {
  // reference firestore collection
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = event => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);

    }
  });


  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot(snapshot => {
    snapshot.dotChange().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    })
  })
};


// 3. Answer the call with the unique ID 
answerButton.onClick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');

  pc.onicecandidate = event => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };


  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));


  asdfghjkl
}