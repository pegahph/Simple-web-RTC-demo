const socket = io();
const localVideo = document.getElementById('localVideo');
const localVideoContainer = document.getElementById('localVideoContainer');
const videoGrid = document.querySelector('.video-grid');
const roomIdElement = document.getElementById('roomId');
const toggleVideoBtn = document.getElementById('toggleVideo');
const toggleAudioBtn = document.getElementById('toggleAudio');
const leaveBtn = document.getElementById('leaveBtn');
const copyRoomBtn = document.getElementById('copyRoomBtn');

let localStream;
let peers = {};
let roomId;
let userId;
let isVideoEnabled = true;
let isAudioEnabled = true;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        console.log('Local media initialized');
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Unable to access camera/microphone. Please check permissions.');
    }
}

function createPeerConnection(targetUserId) {
    console.log('Creating peer connection for:', targetUserId);
    const peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
            console.log('Added track to peer connection:', track.kind);
        });
    }
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate to:', targetUserId);
            socket.emit('ice-candidate', {
                caller: userId,
                target: targetUserId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.ontrack = (event) => {
        console.log('Received remote track from:', targetUserId);
        const remoteStream = event.streams[0];
        addRemoteVideo(targetUserId, remoteStream);
    };

    peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${targetUserId}:`, peerConnection.connectionState);
    };

    return peerConnection;
}

function addRemoteVideo(targetUserId, stream) {
    // Check if video already exists
    if (document.getElementById(`video-${targetUserId}`)) {
        console.log('Video already exists for:', targetUserId);
        return;
    }

    const remoteVideo = document.createElement('video');
    remoteVideo.srcObject = stream;
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;
    
    const videoContainer = document.createElement('div');
    videoContainer.className = 'video-container remote';
    videoContainer.id = `video-${targetUserId}`;
    
    const label = document.createElement('div');
    label.className = 'video-label';
    label.innerHTML = `User ${targetUserId.substring(0, 8)}`;
    
    const muteIndicator = document.createElement('div');
    muteIndicator.className = 'video-mute-indicator';
    muteIndicator.innerHTML = '🔇';
    
    videoContainer.appendChild(remoteVideo);
    videoContainer.appendChild(label);
    videoContainer.appendChild(muteIndicator);
    videoGrid.appendChild(videoContainer);
    
    console.log('Added remote video for:', targetUserId);
}

function updateUserAudioStatus(userId, isMuted) {
    const videoContainer = document.getElementById(`video-${userId}`);
    if (videoContainer) {
        if (isMuted) {
            videoContainer.classList.add('muted');
        } else {
            videoContainer.classList.remove('muted');
        }
        console.log(`Updated audio status for ${userId}: ${isMuted ? 'muted' : 'unmuted'}`);
    }
}

async function createOffer(targetUserId) {
    console.log('Creating offer for:', targetUserId);
    const peerConnection = createPeerConnection(targetUserId);
    peers[targetUserId] = peerConnection;

    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        console.log('Sending offer to:', targetUserId);
        socket.emit('offer', {
            caller: userId,
            target: targetUserId,
            offer: offer
        });
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}

async function handleOffer(data) {
    console.log('Handling offer from:', data.caller);
    const peerConnection = createPeerConnection(data.caller);
    peers[data.caller] = peerConnection;

    try {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        console.log('Sending answer to:', data.caller);
        socket.emit('answer', {
            caller: userId,
            target: data.caller,
            answer: answer
        });
    } catch (error) {
        console.error('Error handling offer:', error);
    }
}

async function handleAnswer(data) {
    console.log('Handling answer from:', data.caller);
    const peerConnection = peers[data.caller];
    if (peerConnection) {
        try {
            await peerConnection.setRemoteDescription(data.answer);
            console.log('Answer processed for:', data.caller);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    } else {
        console.error('No peer connection found for:', data.caller);
    }
}

async function handleIceCandidate(data) {
    console.log('Handling ICE candidate from:', data.caller);
    const peerConnection = peers[data.caller];
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(data.candidate);
            console.log('ICE candidate added for:', data.caller);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    } else {
        console.error('No peer connection found for ICE candidate from:', data.caller);
    }
}

function removeUser(targetUserId) {
    console.log('Removing user:', targetUserId);
    if (peers[targetUserId]) {
        peers[targetUserId].close();
        delete peers[targetUserId];
    }
    
    const videoElement = document.getElementById(`video-${targetUserId}`);
    if (videoElement) {
        videoElement.remove();
    }
}

// Initialize room
roomId = getQueryParam('room');
if (!roomId) {
    window.location.href = '/';
}

userId = Math.random().toString(36).substring(2, 15);
roomIdElement.textContent = `Room: ${roomId}`;

// Socket event listeners
socket.on('existing-users', (users) => {
    console.log('Existing users in room:', users);
    users.forEach(existingUserId => {
        if (existingUserId !== userId) {
            createOffer(existingUserId);
        }
    });
});

socket.on('user-connected', (newUserId) => {
    console.log('New user connected:', newUserId);
    // The new user will create offers to existing users, so we wait for their offer
});

socket.on('user-disconnected', (disconnectedUserId) => {
    console.log('User disconnected:', disconnectedUserId);
    removeUser(disconnectedUserId);
});

socket.on('offer', handleOffer);
socket.on('answer', handleAnswer);
socket.on('ice-candidate', handleIceCandidate);
socket.on('user-audio-status', (data) => {
    updateUserAudioStatus(data.userId, data.isMuted);
});

// Control button event listeners
toggleVideoBtn.addEventListener('click', () => {
    isVideoEnabled = !isVideoEnabled;
    if (localStream) {
        localStream.getVideoTracks()[0].enabled = isVideoEnabled;
    }
    
    toggleVideoBtn.classList.toggle('active', isVideoEnabled);
    toggleVideoBtn.innerHTML = isVideoEnabled ? 
        '📹 <span>Video</span>' : 
        '📹 <span>Video Off</span>';
});

toggleAudioBtn.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    if (localStream) {
        localStream.getAudioTracks()[0].enabled = isAudioEnabled;
    }
    
    toggleAudioBtn.classList.toggle('active', isAudioEnabled);
    toggleAudioBtn.innerHTML = isAudioEnabled ? 
        '🎤 <span>Audio</span>' : 
        '🎤 <span>Muted</span>';
    
    // Update local mute indicator
    if (!isAudioEnabled) {
        localVideoContainer.classList.add('muted');
    } else {
        localVideoContainer.classList.remove('muted');
    }
    
    // Notify other participants about audio status change
    socket.emit('audio-status', {
        userId: userId,
        isMuted: !isAudioEnabled
    });
});

copyRoomBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomId).then(() => {
        copyRoomBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyRoomBtn.innerHTML = '📋 Copy';
        }, 2000);
    }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copyRoomBtn.textContent = '✅ Copied!';
        setTimeout(() => {
            copyRoomBtn.innerHTML = '📋 Copy';
        }, 2000);
    });
});

leaveBtn.addEventListener('click', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    // Close all peer connections
    Object.values(peers).forEach(peerConnection => {
        peerConnection.close();
    });
    
    window.location.href = '/';
});

// Initialize everything
initializeMedia().then(() => {
    console.log('Joining room:', roomId, 'as user:', userId);
    socket.emit('join-room', roomId, userId);
});