import React, { useEffect, useState, useRef, useCallback } from 'react'
import '../App.css'
import Members from '../components/WorkSpace/Members'
import { toast } from 'react-hot-toast'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Editor from '../components/WorkSpace/Editor.jsx'
import { initSocket } from '../components/WorkSpace/socket.js'
import ACTIONS from "../utils/Actions.js"
import { runCode } from '../apis/executeApi.js'
import Submission from './Submission.jsx'


const WorkSpace = () => {
    const { roomId } = useParams();
    const socketRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const codeRef = useRef(null);

    const [members, setMembers] = useState([]);

    const assignment = location.state?.assignment;
    const initialLanguage = assignment?.language || "Any";
    const [selectedLanguage, setSelectedLanguage] = useState(
        initialLanguage === "Any" ? "java" : initialLanguage
    );
    const isCustomizable = initialLanguage === "Any";

    const languageRef = useRef(selectedLanguage);
    useEffect(() => {
        languageRef.current = selectedLanguage;
    }, [selectedLanguage]);

    const [sidebarWidth, setSidebarWidth] = useState(380);
    const isResizingRef = useRef(false);

    const startResizing = (e) => {
        isResizingRef.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", stopResizing);
        document.body.style.userSelect = "none";
    };

    const handleMouseMove = (e) => {
        if (!isResizingRef.current) return;
        const newWidth = Math.max(280, Math.min(700, e.clientX));
        setSidebarWidth(newWidth);
    };

    const stopResizing = () => {
        isResizingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", stopResizing);
        document.body.style.userSelect = "";
    };

    // WEBRTC REFS & STATE
    const peerConnectionsRef = useRef(new Map()); // socketId -> RTCPeerConnection
    const localStreamRef = useRef(null);
    const remoteStreamsRef = useRef(new Map()); // socketId -> RemoteStream
    const [isMicEnabled, setIsMicEnabled] = useState(false);
    const [isMicLoading, setIsMicLoading] = useState(false);

    // Initialize local microphone stream
    const initializeLocalStream = async () => {
        try {
            setIsMicLoading(true);
            // Create offers to all existing room members

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            const tracks = stream.getAudioTracks();
            console.log("Local microphone acquired", {
                tracks: tracks.map(track => track.label),
                enabled: tracks.map(track => track.enabled),
            });
            setIsMicEnabled(true);
            toast.success("Microphone enabled!");
            members.forEach((member) => {

                // Prevent duplicate connections
                if (peerConnectionsRef.current.has(member.socketId)) {
                    return;
                }

                // ONLY smaller socketId creates offer
                if (socketRef.current.id < member.socketId) {

                    console.log(
                        "Creating deterministic offer for",
                        member.socketId
                    );

                    sendOffer(member.socketId);
                }
            });
        } catch (err) {
            console.error("Microphone access denied:", err);
            toast.error("Unable to access microphone");
            setIsMicEnabled(false);
        } finally {
            setIsMicLoading(false);
        }
    };

    // Disable microphone
    const disableLocalStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        setIsMicEnabled(false);

        // Close all peer connections
        peerConnectionsRef.current.forEach(pc => pc.close());
        peerConnectionsRef.current.clear();
        remoteStreamsRef.current.clear();
    };

    // Create RTCPeerConnection with a specific peer
    const createPeerConnection = (remoteSocketId) => {
        if (peerConnectionsRef.current.has(remoteSocketId)) {
            console.log("Duplicate peer connection prevented for", remoteSocketId);
            return peerConnectionsRef.current.get(remoteSocketId);
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        console.log("Creating RTCPeerConnection for", remoteSocketId);

        pc.onconnectionstatechange = () => {
            console.log("Connection state for", remoteSocketId, "=", pc.connectionState);
            if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                console.warn("Peer connection state disconnected/failed for", remoteSocketId);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE connection state for", remoteSocketId, "=", pc.iceConnectionState);
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log("Remote track received from", remoteSocketId, event);
            if (event.streams && event.streams.length > 0) {
                const remoteStream = event.streams[0];
                remoteStreamsRef.current.set(remoteSocketId, remoteStream);

                let audioEl = document.getElementById(`audio-${remoteSocketId}`);
                if (!audioEl) {
                    audioEl = document.createElement("audio");
                    audioEl.id = `audio-${remoteSocketId}`;
                    audioEl.autoplay = true;
                    audioEl.playsInline = true;
                    audioEl.style.display = "none";
                    document.body.appendChild(audioEl);
                }
                audioEl.srcObject = remoteStream;
                audioEl.play()
                    .then(() => console.log("Audio playback started for", remoteSocketId))
                    .catch((playErr) => console.error("Audio playback failed for", remoteSocketId, playErr));
            }
        };

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                console.log("Adding local track to peer", remoteSocketId, track.kind, track.enabled);
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log("ICE candidate generated for", remoteSocketId, event.candidate);
                if (socketRef.current) {
                    socketRef.current.emit("ice-candidate", {
                        candidate: event.candidate,
                        targetSocketId: remoteSocketId,
                    });
                    console.log("ICE candidate emitted to", remoteSocketId);
                }
            }
        };

        peerConnectionsRef.current.set(remoteSocketId, pc);
        return pc;
    };

    // Create and send offer
    const sendOffer = async (remoteSocketId) => {
        try {
            if (peerConnectionsRef.current.has(remoteSocketId)) {
                console.log("sendOffer skipped because peer already exists for", remoteSocketId);
                return;
            }

            const pc = createPeerConnection(remoteSocketId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log("Offer created for", remoteSocketId, offer);

            socketRef.current.emit("webrtc-offer", {
                roomId,
                offer,
                targetSocketId: remoteSocketId,
            });
        } catch (err) {
            console.error("Error creating offer:", err);
        }
    };

    // Handle received offer
    const handleWebRTCOffer = async ({ offer, fromSocketId }) => {
        try {
            console.log("Offer received from", fromSocketId, offer);
            if (!localStreamRef.current) {
                console.log("Acquiring microphone before answering offer");

                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                });

                localStreamRef.current = stream;

                setIsMicEnabled(true);

                console.log("Microphone acquired for answering offer");
            }
            let pc = peerConnectionsRef.current.get(fromSocketId);
            if (!pc) {
                pc = createPeerConnection(fromSocketId);
            } else {
                console.log("Using existing peer connection for incoming offer from", fromSocketId);
            }

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log("Remote description set for offer from", fromSocketId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log("Answer created for", fromSocketId, answer);

            socketRef.current.emit("webrtc-answer", {
                answer,
                targetSocketId: fromSocketId,
            });
        } catch (err) {
            console.error("Error handling offer:", err);
        }
    };

    // Handle received answer
    const handleWebRTCAnswer = async ({ answer, fromSocketId }) => {
        try {
            console.log("Answer received from", fromSocketId, answer);
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                console.log("Remote description set for answer from", fromSocketId);
            } else {
                console.warn("No peer connection found for answer from", fromSocketId);
            }
        } catch (err) {
            console.error("Error handling answer:", err);
        }
    };

    // Handle ICE candidate
    const handleICECandidate = async ({ candidate, fromSocketId }) => {
        try {
            console.log("ICE candidate received from", fromSocketId, candidate);
            const pc = peerConnectionsRef.current.get(fromSocketId);
            if (pc && candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.log("ICE candidate added for", fromSocketId);
            } else if (!pc) {
                console.warn("No peer connection available to add ICE candidate for", fromSocketId);
            }
        } catch (err) {
            console.error("Error adding ICE candidate:", err);
        }
    };

    // Cleanup WebRTC on disconnect
    const cleanupWebRTC = () => {
        disableLocalStream();
        remoteStreamsRef.current.forEach((stream) => {
            stream.getTracks().forEach(track => track.stop());
        });
        remoteStreamsRef.current.clear();

        // Remove audio elements
        document.querySelectorAll('[id^="audio-"]').forEach(el => el.remove());
    };

    useEffect(() => {
        const init = async () => {
            const handleError = (e) => {
                console.log("Socket Error : ", e);
                toast.error("Socket connection failed!");
                navigate("/idGenerator");
            }

            socketRef.current = await initSocket();
            socketRef.current.on("connect_error", (err) => handleError(err));
            socketRef.current.on("connect_failed", (err) => handleError(err));
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            })

            //listening for joined event
            socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
                if (username !== location.state?.username) {
                    toast.success(`${username} joined the room.`);
                    console.log(`${username} joined`)
                }
                setMembers(clients);
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId
                });

                // Sync the selected language to the new joiner
                socketRef.current.emit("sync-language", {
                    language: languageRef.current,
                    socketId
                });

            })

            // WEBRTC SIGNALING LISTENERS
            socketRef.current.on("webrtc-offer", ({ offer, fromSocketId, fromUsername }) => {
                console.log(`Received offer from ${fromUsername}`);
                handleWebRTCOffer({ offer, fromSocketId });
            });

            socketRef.current.on("webrtc-answer", ({ answer, fromSocketId }) => {
                console.log(`Received answer from ${fromSocketId}`);
                handleWebRTCAnswer({ answer, fromSocketId });
            });

            socketRef.current.on("ice-candidate", ({ candidate, fromSocketId }) => {
                handleICECandidate({ candidate, fromSocketId });
            });

            // listening for language-change
            socketRef.current.on("language-change", ({ language }) => {
                setSelectedLanguage(language);
                toast.success(`Editor language changed to ${language.toUpperCase()}`);
            });

            // listening for remote runner updates
            socketRef.current.on("code-running", ({ username }) => {
                setRemoteRunner(username);
            });

            socketRef.current.on("code-idle", () => {
                setRemoteRunner(null);
            });

            socketRef.current.on(ACTIONS.ASSIGNMENT_COMPLETED, ({ roomId: completedRoomId, assignmentId }) => {
                if (completedRoomId === roomId) {
                    toast.success('Assignment completed by a team member. Returning to assignments.');
                    handleSubmissionComplete();
                }
            });

            //listening for disconnected
            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left the room.`)
                setMembers((prev) => {
                    return prev.filter((member) => member.socketId !== socketId)
                });
                setRemoteRunner((prev) => prev === username ? null : prev);

                // Clean up WebRTC peer connection
                const pc = peerConnectionsRef.current.get(socketId);
                if (pc) {
                    pc.close();
                    peerConnectionsRef.current.delete(socketId);
                }

                // Remove remote audio element
                const audioEl = document.getElementById(`audio-${socketId}`);
                if (audioEl) audioEl.remove();

                // Clear remote stream
                remoteStreamsRef.current.delete(socketId);
            })
        };


        init();
        // Cleanup function to clear event listeners and prevent memory leaks/duplicate events
        return () => {
            cleanupWebRTC(); // Clean up WebRTC connections
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off("language-change");
                socketRef.current.off("code-running");
                socketRef.current.off("code-idle");
                socketRef.current.off(ACTIONS.ASSIGNMENT_COMPLETED);
                socketRef.current.off("webrtc-offer");
                socketRef.current.off("webrtc-answer");
                socketRef.current.off("ice-candidate");
                socketRef.current.disconnect(); // Disconnect cleanly on component unmount
            }
        };
    }, [])


    const copyRoomIdBtn = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success("Room ID is copied!")
        } catch (error) {
            toast.error("Unable to copy room ID!")
        }
    }

    const leaveRoomBtn = () => {
        navigate("/idGenerator")
    }

    const [isRunning, setIsRunning] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [executionResult, setExecutionResult] = useState(null);
    const [remoteRunner, setRemoteRunner] = useState(null);

    const handleSubmissionComplete = useCallback(() => {
        const classId = typeof assignment?.classId === 'object'
            ? assignment.classId._id || assignment.classId
            : assignment?.classId;
        const targetRoute = classId ? `/class/${classId}/assignments` : '/enrolled';

        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LEAVE, { roomId });
        }

        cleanupWebRTC();
        setMembers([]);
        setRemoteRunner(null);
        setIsRunning(false);
        setExecutionResult(null);
        setIsDrawerOpen(false);
        codeRef.current = "";

        navigate(targetRoute, { replace: true });
    }, [assignment, navigate, roomId]);

    const handleRunCode = async () => {
        if (!codeRef.current) {
            toast.error("Please type some code first!");
            return;
        }
        setIsRunning(true);
        setIsDrawerOpen(true);
        setExecutionResult(null);

        // Emit starting event to other users
        if (socketRef.current) {
            socketRef.current.emit("code-running", { roomId, username: location.state?.username || "Collaborator" });
        }

        try {
            const data = await runCode(codeRef.current, selectedLanguage, assignment?.sampleInput || "");
            setExecutionResult({
                output: data.output,
                error: data.error,
                timedOut: data.timedOut,
                exitCode: data.exitCode,
            });
            if (data.error || data.exitCode !== 0) {
                toast.error("Execution encountered errors.");
            } else {
                toast.success("Execution completed successfully!");
            }
        } catch (err) {
            toast.error(err.message || "Code execution request failed");
            setExecutionResult({
                error: err.message || "Failed to contact execution server",
                exitCode: -1
            });
        } finally {
            setIsRunning(false);
            // Emit ending event to other users
            if (socketRef.current) {
                socketRef.current.emit("code-idle", { roomId });
            }
        }
    };

    return (
        <div className='flex h-screen w-full overflow-hidden bg-zinc-955 text-zinc-100 font-sans relative'>
            {/* left side container for operations and member list */}
            <div
                style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px` }}
                className='flex flex-col h-full bg-zinc-900 border-r border-zinc-800 overflow-hidden'
            >
                {/* Header */}
                <div className='h-14 border-b border-zinc-800 flex items-center px-6 shrink-0 bg-zinc-900'>
                    <h1 className='text-lg font-bold tracking-tight text-white flex items-center gap-2'>
                        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        coLAB Workspace
                    </h1>
                </div>

                {/* Main Scrollable Content */}
                <div className='flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent'>
                    {/* Assignment Details */}
                    {assignment ? (
                        <div className="space-y-3">
                            <h2 className="text-lg font-bold text-white leading-tight">
                                {assignment.title}
                            </h2>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                                    Assignment
                                </span>
                                {assignment.dueDate && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/40 text-red-450 border border-red-900/30">
                                        Due {new Date(assignment.dueDate).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-zinc-350 leading-relaxed whitespace-pre-line bg-zinc-850/30 rounded-xl p-3 border border-zinc-800/40">
                                {assignment.description}
                            </div>

                            {/* Sample Input */}
                            {assignment.sampleInput && (
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Sample Input</span>
                                    <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 p-3 rounded-xl border border-zinc-800 overflow-x-auto whitespace-pre-wrap select-all">
                                        {assignment.sampleInput}
                                    </pre>
                                </div>
                            )}

                            {/* Sample Output */}
                            {assignment.sampleOutput && (
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-wider">Sample Output</span>
                                    <pre className="text-[11px] font-mono bg-zinc-950 text-fuchsia-400 p-3 rounded-xl border border-fuchsia-900/40 overflow-x-auto whitespace-pre-wrap select-all">
                                        {assignment.sampleOutput}
                                    </pre>
                                </div>
                            )}

                            {/* Expected Output */}
                            {assignment.expectedOutput && (
                                <div className="space-y-1.5 pt-2">
                                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Expected Output</span>
                                    <pre className="text-[11px] font-mono bg-zinc-950 text-blue-400 p-3 rounded-xl border border-blue-900/40 overflow-x-auto whitespace-pre-wrap select-all">
                                        {assignment.expectedOutput}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-xs text-zinc-500 italic py-4 bg-zinc-850/20 rounded-xl border border-zinc-800/40 text-center">
                            No assignment details loaded
                        </div>
                    )}

                    {/* Members List */}
                    <div className='pt-4 border-t border-zinc-800/50 space-y-3'>
                        <h3 className='text-[10px] uppercase font-bold tracking-wider text-zinc-400'>
                            Active Members ({members.length})
                        </h3>
                        <div className='flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1'>
                            {members.map((m) => (
                                <Members key={m.socketId} username={m.username} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Anchored Footer (Controls & Language panels) */}
                <div className='shrink-0 p-4 border-t border-zinc-800 bg-zinc-900/90 space-y-3'>
                    {/* Language Configuration */}
                    {isCustomizable ? (
                        <div className="w-full">
                            <div className="rounded-xl bg-zinc-800/60 p-3 border border-zinc-700/50">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-400 block font-bold mb-1.5">Editor Language</span>
                                <div className="relative">
                                    <select
                                        className="bg-zinc-900 text-white w-full px-3 py-2 rounded-lg border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer appearance-none transition-all duration-200 hover:border-zinc-500 text-xs font-semibold"
                                        value={selectedLanguage}
                                        onChange={(e) => {
                                            const nextLang = e.target.value;
                                            setSelectedLanguage(nextLang);
                                            if (socketRef.current) {
                                                socketRef.current.emit("language-change", { roomId, language: nextLang });
                                            }
                                        }}
                                    >
                                        <option value="java">☕ Java</option>
                                        <option value="python">🐍 Python</option>
                                        <option value="C">🅲 C</option>
                                        <option value="C++">🅲++ C++</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
                                        <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full">
                            <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-indigo-600/90 to-purple-600/90 p-3 border border-indigo-500/30">
                                <div className="absolute -right-4 -bottom-4 opacity-10 text-white font-extrabold text-5xl select-none uppercase">
                                    {selectedLanguage}
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-indigo-200 block font-bold">Assigned Language</span>
                                <span className="text-md font-black text-white select-none">{selectedLanguage.toUpperCase()}</span>
                            </div>
                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="flex gap-2 w-full pt-1">
                        <button onClick={copyRoomIdBtn} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition duration-200 cursor-pointer font-bold text-[11px] shadow-md">
                            COPY ROOM ID
                        </button>
                        <button
                            onClick={isMicEnabled ? disableLocalStream : initializeLocalStream}
                            disabled={isMicLoading}
                            className={`flex-1 py-2 rounded-lg transition duration-200 cursor-pointer font-bold text-[11px] shadow-md ${isMicEnabled
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                                } ${isMicLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isMicLoading ? '...' : (isMicEnabled ? '🎤 ON' : '🎤 OFF')}
                        </button>
                        <button onClick={leaveRoomBtn} className="flex-1 bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-red-650 hover:text-white hover:border-red-600 py-2 rounded-lg transition duration-200 cursor-pointer font-bold text-[11px] shadow-sm">
                            LEAVE ROOM
                        </button>
                    </div>
                </div>
            </div>

            {/* Draggable Resizer divider */}
            <div
                onMouseDown={startResizing}
                className='w-1.5 hover:w-2 bg-zinc-850 hover:bg-indigo-500 cursor-col-resize transition-all duration-150 h-full select-none z-50 flex items-center justify-center'
            >
                <div className="h-8 w-0.5 rounded bg-zinc-700/60" />
            </div>

            {/* right side container for workspace */}
            <div className='flex-1 h-full overflow-hidden bg-zinc-950 flex flex-col relative'>
                {/* Editor Header Control Bar */}
                <div className='h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-zinc-900'>
                    <span className="text-[11px] text-zinc-400 font-semibold uppercase tracking-wider">
                        Active Room: <strong className="text-zinc-200">{roomId}</strong>
                    </span>
                    <div className="flex gap-3 items-center">
                        <button
                            onClick={handleRunCode}
                            disabled={isRunning || !!remoteRunner}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all duration-200 cursor-pointer ${isRunning || !!remoteRunner
                                ? "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95"
                                }`}
                        >
                            {isRunning ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5 text-zinc-500 animate-duration-1000" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Running...
                                </>
                            ) : remoteRunner ? (
                                <>
                                    <svg className="animate-pulse h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"></circle>
                                        <path d="M12 8v4l3 3" strokeWidth="2"></path>
                                    </svg>
                                    {remoteRunner} Running...
                                </>
                            ) : (
                                <>
                                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    Run Code
                                </>
                            )}
                        </button>

                        <Submission
                            assignmentId={assignment?._id}
                            codeRef={codeRef}
                            executionOutput={executionResult?.output || ""}
                            expectedOutput={assignment?.expectedOutput || ""}
                            studentsInRoom={members.map((member) => member.username)}
                            canSubmit={!!executionResult}
                            roomId={roomId}
                            socketRef={socketRef}
                            onSubmissionComplete={handleSubmissionComplete}
                        />
                    </div>
                </div>

                {/* Editor container */}
                <div className='flex-1 relative overflow-hidden'>
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                        language={selectedLanguage}
                    />
                </div>

                {/* Sliding Execution Drawer (comes from right) */}
                <div
                    className={`absolute top-0 right-0 h-full bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl transition-all duration-300 ease-out z-50 flex flex-col ${isDrawerOpen ? "w-112.5 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full pointer-events-none"
                        }`}
                >
                    {/* Drawer Header */}
                    <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between shrink-0 bg-zinc-900">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? "bg-amber-500 animate-pulse" : executionResult?.error || executionResult?.exitCode !== 0 ? "bg-red-500" : "bg-emerald-500"
                                }`}></span>
                            Execution Result
                        </span>
                        <button
                            onClick={() => setIsDrawerOpen(false)}
                            className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1.5 rounded-lg transition duration-200 cursor-pointer"
                        >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                        {isRunning ? (
                            <div className="rounded-xl bg-zinc-850 p-6 border border-zinc-800 flex flex-col items-center justify-center text-center space-y-4 my-8">
                                <div className="w-10 h-10 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                <div>
                                    <h4 className="text-sm font-bold text-white">Running code...</h4>
                                    <p className="text-xs text-zinc-400 mt-1.5">Executing sandboxed runtime container</p>
                                </div>
                            </div>
                        ) : executionResult ? (
                            <div className="space-y-5">
                                {/* Status Card */}
                                <div className={`rounded-xl p-4 border ${executionResult.exitCode === 0 && !executionResult.error && !executionResult.timedOut
                                    ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                                    : executionResult.timedOut
                                        ? "bg-amber-950/20 border-amber-900/30 text-amber-400"
                                        : "bg-red-950/20 border-red-900/30 text-red-400"
                                    }`}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] uppercase font-bold tracking-wider">Status</span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800">
                                            {executionResult.timedOut
                                                ? "Time Limit Exceeded"
                                                : executionResult.exitCode === 0 && !executionResult.error
                                                    ? "Success"
                                                    : "Runtime Error"}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs flex gap-4 text-zinc-400">
                                        {executionResult.exitCode !== undefined && (
                                            <span>Exit Code: <strong className="text-zinc-200">{executionResult.exitCode}</strong></span>
                                        )}
                                    </div>
                                </div>

                                {/* Standard Output */}
                                {executionResult.output && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Standard Output</span>
                                        <pre className="text-xs font-mono bg-zinc-950 text-zinc-200 p-4 rounded-xl border border-zinc-800 overflow-x-auto whitespace-pre-wrap select-all max-h-64 scrollbar-thin">
                                            {executionResult.output}
                                        </pre>
                                    </div>
                                )}

                                {/* Standard Error */}
                                {executionResult.error && (
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider">Standard Error (stderr)</span>
                                        <pre className="text-xs font-mono bg-red-950/10 text-red-400 p-4 rounded-xl border border-red-900/20 overflow-x-auto whitespace-pre-wrap select-all max-h-64 scrollbar-thin">
                                            {executionResult.error}
                                        </pre>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!executionResult.output && !executionResult.error && (
                                    <div className="rounded-xl bg-zinc-850 p-4 border border-zinc-800 text-center text-xs text-zinc-400">
                                        Code executed successfully but returned empty output.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-zinc-500 italic text-xs">
                                No code execution logs yet. Click "Run Code" above.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default WorkSpace;