import React, { useState } from 'react'
import { toast } from 'react-hot-toast'
import ACTIONS from '../utils/Actions.js'
import { submitAssignment, submitSubmissionAssessment, downloadSubmissionPDF } from '../apis/submissionApi.js'

const Submission = ({
    assignmentId,
    codeRef,
    executionOutput,
    expectedOutput,
    studentsInRoom,
    canSubmit,
    roomId,
    socketRef,
    onSubmissionComplete,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSubmissionModal, setShowSubmissionModal] = useState(false)
    const [submissionResult, setSubmissionResult] = useState(null)
    const [aiEvaluation, setAiEvaluation] = useState(null)
    const [answers, setAnswers] = useState({})
    const [assessmentCompleted, setAssessmentCompleted] = useState(false)
    const [assessmentError, setAssessmentError] = useState("")
    const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false)

    const handleSubmitAssignment = async () => {
        if (!codeRef?.current) {
            toast.error('Please type some code first!')
            return
        }

        if (!assignmentId) {
            toast.error('Assignment information not loaded!')
            return
        }

        setIsSubmitting(true)

        try {
            const result = await submitAssignment(
                assignmentId,
                codeRef.current,
                executionOutput || '',
                studentsInRoom,
            )

            setSubmissionResult({
                _id: result.submission._id,
                outputMatches: result.submission.outputMatches,
                isValidated: result.submission.isValidated,
                output: executionOutput || '',
                expectedOutput: expectedOutput || '',
            })
            setAssessmentCompleted(false)
            setAnswers({})
            setAssessmentError("")

            // Store AI evaluation returned by backend (if any)
            setAiEvaluation(result.submission.aiEvaluation || null)

            setShowSubmissionModal(true)
            toast.success('Assignment submitted successfully!')
        } catch (err) {
            toast.error(err.message || 'Failed to submit assignment')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDownloadPDF = async () => {
        if (!submissionResult?._id) {
            toast.error('No submission available for download!')
            return
        }

        if (!assessmentCompleted) {
            toast.error('Complete the assessment before downloading PDF.')
            return
        }

        try {
            await downloadSubmissionPDF(submissionResult._id)
            toast.success('PDF downloaded successfully!')
            if (onSubmissionComplete) {
                onSubmissionComplete()
            }
        } catch (err) {
            toast.error(err.message || 'Failed to download PDF')
        }
    }

    const handleAnswerSelect = (questionIndex, option) => {
        setAnswers((prev) => ({
            ...prev,
            [questionIndex]: option,
        }))
    }

    const handleSubmitAssessment = async () => {
        if (!aiEvaluation?.mcqs?.length) {
            toast.error('No assessment questions available')
            return
        }

        if (Object.keys(answers).length !== aiEvaluation.mcqs.length) {
            setAssessmentError('Please answer all questions.')
            return
        }

        setAssessmentError('')
        setIsSubmittingAssessment(true)

        try {
            const result = await submitSubmissionAssessment(submissionResult._id, answers)

            setAssessmentCompleted(true)
            setSubmissionResult((prev) => ({
                ...prev,
                assessment: result.submission.assessment,
            }))
            if (socketRef?.current) {
                socketRef.current.emit(ACTIONS.ASSIGNMENT_COMPLETED, {
                    roomId,
                    assignmentId,
                })
            }
            toast.success('Assessment submitted successfully!')
        } catch (err) {
            toast.error(err.message || 'Failed to submit assessment')
        } finally {
            setIsSubmittingAssessment(false)
        }
    }

    return (
        <>
            <button
                onClick={handleSubmitAssignment}
                disabled={isSubmitting || !canSubmit}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-bold text-xs shadow-md transition-all duration-200 cursor-pointer ${isSubmitting || !canSubmit
                    ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95'
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
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                        Submit
                    </>
                )}
            </button>

            {showSubmissionModal && submissionResult && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4">
                    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between shrink-0 bg-zinc-900 sticky top-0 z-10">
                            <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                <span className={`h-3 w-3 rounded-full ${submissionResult.isValidated
                                    ? submissionResult.outputMatches
                                        ? 'bg-emerald-500'
                                        : 'bg-red-500'
                                    : 'bg-amber-500'
                                    }`}></span>
                                {submissionResult.isValidated
                                    ? submissionResult.outputMatches
                                        ? '✓ Output Valid!'
                                        : '✗ Output Invalid'
                                    : 'Submission Complete'}
                            </span>
                            <button
                                onClick={() => {
                                    if (assessmentCompleted && onSubmissionComplete) {
                                        onSubmissionComplete()
                                    } else {
                                        setShowSubmissionModal(false)
                                    }
                                }}
                                className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1.5 rounded-lg transition duration-200"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {submissionResult.isValidated && (
                                <div className={`rounded-xl p-5 border ${submissionResult.outputMatches
                                    ? 'bg-emerald-950/30 border-emerald-900/50'
                                    : 'bg-red-950/30 border-red-900/50'
                                    }`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`text-2xl font-bold ${submissionResult.outputMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {submissionResult.outputMatches ? '✓' : '✗'}
                                        </span>
                                        <div>
                                            <h3 className={`font-bold text-sm ${submissionResult.outputMatches ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {submissionResult.outputMatches
                                                    ? 'Output Matches Expected!'
                                                    : 'Output Does Not Match Expected'}
                                            </h3>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                {submissionResult.outputMatches
                                                    ? 'Your code produces the correct output.'
                                                    : 'Your code output differs from the expected output.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <span className="text-xs uppercase font-bold text-blue-400 tracking-wider block">Expected Output</span>
                                <pre className="text-xs font-mono bg-zinc-950 text-blue-300 p-4 rounded-xl border border-blue-900/30 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                    {submissionResult.expectedOutput || 'No expected output'}
                                </pre>
                            </div>

                            <div className="space-y-2">
                                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider block">Your Output</span>
                                <pre className="text-xs font-mono bg-zinc-950 text-emerald-300 p-4 rounded-xl border border-emerald-900/30 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                    {submissionResult.output || 'No output generated'}
                                </pre>
                            </div>

                            {aiEvaluation && (
                                <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900">
                                    <h4 className="text-sm font-bold text-white mb-2">AI Evaluation</h4>

                                    <div className="text-xs text-zinc-400 space-y-2">
                                        <div>
                                            <span className="font-semibold text-zinc-200">Status: </span>
                                            <span>{aiEvaluation.status || 'pending'}</span>
                                        </div>

                                        <div>
                                            <span className="font-semibold text-zinc-200">Category: </span>
                                            <span>{aiEvaluation.category || 'N/A'}</span>
                                        </div>

                                        <div>
                                            <span className="font-semibold text-zinc-200">Score: </span>
                                            <span>{typeof aiEvaluation.score === 'number' ? `${aiEvaluation.score} / 10` : 'N/A'}</span>
                                        </div>

                                        <div>
                                            <span className="font-semibold text-zinc-200">Feedback:</span>
                                            <p className="mt-1 text-sm text-zinc-300">{aiEvaluation.feedback || 'No feedback'}</p>
                                        </div>

                                        {aiEvaluation.weaknesses && aiEvaluation.weaknesses.length > 0 && (
                                            <div>
                                                <span className="font-semibold text-zinc-200">Weaknesses:</span>
                                                <ul className="list-disc list-inside mt-1 text-sm text-zinc-300">
                                                    {aiEvaluation.weaknesses.map((w, idx) => (
                                                        <li key={idx}>{w}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {aiEvaluation.mcqs && aiEvaluation.mcqs.length > 0 && (
                                            <div>
                                                <span className="font-semibold text-zinc-200">Concept Check:</span>
                                                <div className="mt-2 space-y-3 text-sm text-zinc-300">
                                                    {aiEvaluation.mcqs.map((q, qi) => (
                                                        <div key={qi} className="p-3 bg-zinc-950 rounded-md border border-zinc-800">
                                                            <div className="font-semibold mb-2">{`Q${qi + 1}: ${q.question}`}</div>
                                                            <div className="space-y-2">
                                                                {q.options?.map((opt, oi) => (
                                                                    <label key={oi} className="flex items-center gap-2 text-sm">
                                                                        <input
                                                                            type="radio"
                                                                            name={`mcq-${qi}`}
                                                                            value={opt}
                                                                            checked={answers[String(qi)] === opt}
                                                                            onChange={() => handleAnswerSelect(qi, opt)}
                                                                            disabled={assessmentCompleted}
                                                                            className="h-4 w-4 text-indigo-500 bg-zinc-900 border-zinc-700"
                                                                        />
                                                                        <span>{opt}</span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {assessmentError && (
                                            <div className="text-sm text-amber-400">{assessmentError}</div>
                                        )}

                                        {aiEvaluation.status === 'failed' && (
                                            <div className="mt-2 text-sm text-amber-400">
                                                AI evaluation unavailable. Submission was saved successfully.
                                            </div>
                                        )}

                                        {aiEvaluation.category === 'hardcoded' && (
                                            <div className="mt-2 p-2 rounded-md bg-red-900 text-sm text-red-200">
                                                AI detected a hardcoded or non-generalized solution. Please implement a genuine solution.
                                            </div>
                                        )}

                                        {aiEvaluation.mcqs && aiEvaluation.mcqs.length > 0 && (
                                            <div className="mt-4 flex flex-col gap-3">
                                                <button
                                                    onClick={handleSubmitAssessment}
                                                    disabled={
                                                        assessmentCompleted ||
                                                        isSubmittingAssessment ||
                                                        Object.keys(answers).length !== aiEvaluation.mcqs.length
                                                    }
                                                    className={`w-full py-2 rounded-lg font-bold text-sm transition duration-200 ${isSubmittingAssessment ||
                                                        assessmentCompleted ||
                                                        Object.keys(answers).length !== aiEvaluation.mcqs.length
                                                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                        }`}
                                                >
                                                    {isSubmittingAssessment ? 'Submitting Assessment...' : 'Submit Assessment'}
                                                </button>
                                                <p className="text-xs text-zinc-500">
                                                    {Object.keys(answers).length}/{aiEvaluation.mcqs.length} questions answered.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                {assessmentCompleted ? (
                                    <button
                                        onClick={handleDownloadPDF}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition duration-200 font-bold text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        Download PDF
                                    </button>
                                ) : (
                                    <button
                                        disabled
                                        className="flex-1 bg-zinc-800 text-zinc-500 py-2 rounded-lg transition duration-200 font-bold text-sm cursor-not-allowed"
                                    >
                                        Download PDF
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (assessmentCompleted && onSubmissionComplete) {
                                            onSubmissionComplete()
                                        } else {
                                            setShowSubmissionModal(false)
                                        }
                                    }}
                                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition duration-200 font-bold text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Submission
