import React, { useEffect, useState, useRef } from 'react'
import '../App.css'
import Members from '../components/WorkSpace/Members'
import { toast } from 'react-hot-toast'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import Editor from '../components/WorkSpace/Editor.jsx'
import { initSocket } from '../components/WorkSpace/socket.js'
import ACTIONS from "../utils/Actions.js"
import { runCode } from '../apis/executeApi.js'
import { submitAssignment, downloadSubmissionPDF } from '../apis/submissionApi.js'


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

            //listening for disconnected
            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
                toast.success(`${username} left the room.`)
                setMembers((prev) => {
                    return prev.filter((member) => member.socketId !== socketId)
                });
                setRemoteRunner((prev) => prev === username ? null : prev);
            })
        };


        init();
        // Cleanup function to clear event listeners and prevent memory leaks/duplicate events
        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off("language-change");
                socketRef.current.off("code-running");
                socketRef.current.off("code-idle");
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionResult, setSubmissionResult] = useState(null);
    const [showSubmissionModal, setShowSubmissionModal] = useState(false);

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

    const handleSubmitAssignment = async () => {
        if (!codeRef.current) {
            toast.error("Please type some code first!");
            return;
        }

        if (!assignment?._id) {
            toast.error("Assignment information not loaded!");
            return;
        }

        setIsSubmitting(true);

        try {
            // Get the names of all students currently in the room
            const studentsInRoom = members.map((member) => member.username);

            const result = await submitAssignment(
                assignment._id,
                codeRef.current,
                executionResult?.output || "",
                studentsInRoom
            );

            setSubmissionResult({
                _id: result.submission._id,
                outputMatches: result.submission.outputMatches,
                isValidated: result.submission.isValidated,
                output: executionResult?.output || "",
                expectedOutput: assignment.expectedOutput || "",
            });

            setShowSubmissionModal(true);
            toast.success("Assignment submitted successfully!");
        } catch (err) {
            toast.error(err.message || "Failed to submit assignment");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!submissionResult?._id) {
            toast.error("No submission available for download!");
            return;
        }

        try {
            await downloadSubmissionPDF(submissionResult._id);
            toast.success("PDF downloaded successfully!");
        } catch (err) {
            toast.error(err.message || "Failed to download PDF");
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
                                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
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
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all duration-200 cursor-pointer ${
                                isRunning || !!remoteRunner
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
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                    Run Code
                                </>
                            )}
                        </button>

                        <button 
                            onClick={handleSubmitAssignment}
                            disabled={isSubmitting || !executionResult}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all duration-200 cursor-pointer ${
                                isSubmitting || !executionResult
                                ? "bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed" 
                                : "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95"
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                    </svg>
                                    Submit
                                </>
                            )}
                        </button>
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
                    className={`absolute top-0 right-0 h-full bg-zinc-900/95 backdrop-blur-md border-l border-zinc-800 shadow-2xl transition-all duration-300 ease-out z-50 flex flex-col ${
                        isDrawerOpen ? "w-[450px] opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-full pointer-events-none"
                    }`}
                >
                    {/* Drawer Header */}
                    <div className="h-14 border-b border-zinc-800 px-5 flex items-center justify-between shrink-0 bg-zinc-900">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${
                                isRunning ? "bg-amber-500 animate-pulse" : executionResult?.error || executionResult?.exitCode !== 0 ? "bg-red-500" : "bg-emerald-500"
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
                                <div className={`rounded-xl p-4 border ${
                                    executionResult.exitCode === 0 && !executionResult.error && !executionResult.timedOut
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

                {/* Submission Modal */}
                {showSubmissionModal && submissionResult && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 bg-zinc-900 sticky top-0 z-10">
                                <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                    <span className={`h-3 w-3 rounded-full ${
                                        submissionResult.isValidated 
                                            ? submissionResult.outputMatches 
                                                ? "bg-emerald-500" 
                                                : "bg-red-500"
                                            : "bg-amber-500"
                                    }`}></span>
                                    {submissionResult.isValidated 
                                        ? submissionResult.outputMatches 
                                            ? "✓ Output Valid!"
                                            : "✗ Output Invalid"
                                        : "Submission Complete"}
                                </span>
                                <button 
                                    onClick={() => setShowSubmissionModal(false)}
                                    className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1.5 rounded-lg transition duration-200"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* Validation Status */}
                                {submissionResult.isValidated && (
                                    <div className={`rounded-xl p-5 border ${
                                        submissionResult.outputMatches
                                            ? "bg-emerald-950/30 border-emerald-900/50"
                                            : "bg-red-950/30 border-red-900/50"
                                    }`}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className={`text-2xl font-bold ${
                                                submissionResult.outputMatches ? "text-emerald-400" : "text-red-400"
                                            }`}>
                                                {submissionResult.outputMatches ? "✓" : "✗"}
                                            </span>
                                            <div>
                                                <h3 className={`font-bold text-sm ${
                                                    submissionResult.outputMatches ? "text-emerald-400" : "text-red-400"
                                                }`}>
                                                    {submissionResult.outputMatches 
                                                        ? "Output Matches Expected!" 
                                                        : "Output Does Not Match Expected"}
                                                </h3>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    {submissionResult.outputMatches
                                                        ? "Your code produces the correct output."
                                                        : "Your code output differs from the expected output."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Expected Output */}
                                <div className="space-y-2">
                                    <span className="text-xs uppercase font-bold text-blue-400 tracking-wider block">Expected Output</span>
                                    <pre className="text-xs font-mono bg-zinc-950 text-blue-300 p-4 rounded-xl border border-blue-900/30 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                        {submissionResult.expectedOutput || "No expected output"}
                                    </pre>
                                </div>

                                {/* Your Output */}
                                <div className="space-y-2">
                                    <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider block">Your Output</span>
                                    <pre className="text-xs font-mono bg-zinc-950 text-emerald-300 p-4 rounded-xl border border-emerald-900/30 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                        {submissionResult.output || "No output generated"}
                                    </pre>
                                </div>

                                {/* Modal Actions */}
                                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Download PDF
                                    </button>
                                    <button
                                        onClick={() => setShowSubmissionModal(false)}
                                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition duration-200 font-bold text-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default WorkSpace;