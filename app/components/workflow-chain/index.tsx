'use client'
import React, { useState, useEffect } from 'react'
import { useBoolean } from 'ahooks'
import { t } from 'i18next'
import cn from 'classnames'
import { PlayIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { WorkflowChain, WorkflowChainStep } from '@/types/app'
import { workflowChainManager } from '@/service/workflow-chain'
import Button from '../base/button'
import Loading from '../base/loading'
import Toast from '../base/toast'

type WorkflowChainProps = {
    chain: WorkflowChain
    onChainCompleted?: (chainId: string, finalOutputs: Record<string, any>) => void
    onChainError?: (chainId: string, error: string) => void
}

type EditableFieldProps = {
    label: string
    value: any
    onChange: (value: any) => void
    type?: 'text' | 'textarea' | 'number'
}

const EditableField: React.FC<EditableFieldProps> = ({
    label,
    value,
    onChange,
    type = 'text'
}) => {
    const [isEditing, setIsEditing] = useState(false)
    const [tempValue, setTempValue] = useState(value)

    const handleSave = () => {
        onChange(tempValue)
        setIsEditing(false)
    }

    const handleCancel = () => {
        setTempValue(value)
        setIsEditing(false)
    }

    return (
        <div className="mb-4 p-3 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-blue-500 hover:text-blue-600"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    {type === 'textarea' ? (
                        <textarea
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md resize-none"
                            rows={4}
                        />
                    ) : (
                        <input
                            type={type}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md"
                        />
                    )}
                    <div className="flex space-x-2">
                        <button
                            onClick={handleSave}
                            className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            <CheckIcon className="w-4 h-4 mr-1" />
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            <XMarkIcon className="w-4 h-4 mr-1" />
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-2 bg-gray-50 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
                    </pre>
                </div>
            )}
        </div>
    )
}

const WorkflowChainComponent: React.FC<WorkflowChainProps> = ({
    chain,
    onChainCompleted,
    onChainError,
}) => {
    const [currentChain, setCurrentChain] = useState<WorkflowChain>(chain)
    const [isExecuting, { setTrue: setExecutingTrue, setFalse: setExecutingFalse }] = useBoolean(false)
    const [stepOutputs, setStepOutputs] = useState<Record<string, Record<string, any>>>({})
    const [editableInputs, setEditableInputs] = useState<Record<string, any>>({})

    useEffect(() => {
        setCurrentChain(chain)
    }, [chain])

    const executeStep = async (userModifications?: Record<string, any>) => {
        setExecutingTrue()
        try {
            const result = await workflowChainManager.executeNextStep(
                currentChain.id,
                userModifications
            )

            // Update local state
            const updatedChain = workflowChainManager.getChain(currentChain.id)
            if (updatedChain) {
                setCurrentChain(updatedChain)
                setStepOutputs(prev => ({
                    ...prev,
                    [result.stepId]: result.outputs
                }))
            }

            // Check if chain is completed
            if (workflowChainManager.isChainCompleted(currentChain.id)) {
                onChainCompleted?.(currentChain.id, result.outputs)
                Toast.notify({
                    type: 'success',
                    message: `Workflow chain "${currentChain.name}" completed successfully!`
                })
            } else {
                Toast.notify({
                    type: 'success',
                    message: `Step "${result.stepId}" completed successfully!`
                })
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            onChainError?.(currentChain.id, errorMessage)
            Toast.notify({
                type: 'error',
                message: `Step execution failed: ${errorMessage}`
            })
        } finally {
            setExecutingFalse()
        }
    }

    const getCurrentStep = () => {
        return workflowChainManager.getCurrentStep(currentChain.id)
    }

    const getStepStatus = (step: WorkflowChainStep) => {
        const statusColors = {
            pending: 'bg-gray-500',
            running: 'bg-blue-500',
            completed: 'bg-green-500',
            failed: 'bg-red-500',
        }
        return statusColors[step.status] || 'bg-gray-500'
    }

    const currentStep = getCurrentStep()
    const hasNextStep = workflowChainManager.hasNextStep(currentChain.id)

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Workflow Chain: {currentChain.name}
                </h2>
                <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                        Step {currentChain.currentStepIndex + 1} of {currentChain.steps.length}
                    </span>
                    <span className={cn(
                        'px-2 py-1 text-xs text-white rounded-full',
                        currentChain.status === 'completed' ? 'bg-green-500' :
                            currentChain.status === 'running' ? 'bg-blue-500' :
                                currentChain.status === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                    )}>
                        {currentChain.status}
                    </span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
                <div className="flex items-center space-x-2">
                    {currentChain.steps.map((step, index) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium',
                                    getStepStatus(step)
                                )}>
                                    {index + 1}
                                </div>
                                <span className="text-xs text-gray-600 mt-1">{step.name}</span>
                            </div>
                            {index < currentChain.steps.length - 1 && (
                                <div className="flex-1 h-0.5 bg-gray-300" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Current Step Details */}
            {currentStep && (
                <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4">
                        Current Step: {currentStep.name}
                    </h3>

                    {currentStep.allowUserEdit && (
                        <div className="mb-4">
                            <h4 className="text-md font-medium text-gray-700 mb-2">
                                Review and Edit Inputs
                            </h4>
                            {Object.entries(currentStep.inputs).map(([key, value]) => (
                                <EditableField
                                    key={key}
                                    label={key}
                                    value={editableInputs[key] !== undefined ? editableInputs[key] : value}
                                    onChange={(newValue) => setEditableInputs(prev => ({ ...prev, [key]: newValue }))}
                                    type={typeof value === 'string' && value.length > 100 ? 'textarea' : 'text'}
                                />
                            ))}
                        </div>
                    )}

                    {/* Previous Step Output */}
                    {currentChain.currentStepIndex > 0 && (
                        <div className="mb-4">
                            <h4 className="text-md font-medium text-gray-700 mb-2">
                                Output from Previous Step
                            </h4>
                            <div className="p-3 bg-gray-100 rounded-md">
                                <pre className="text-sm">
                                    {JSON.stringify(
                                        currentChain.steps[currentChain.currentStepIndex - 1].outputs,
                                        null,
                                        2
                                    )}
                                </pre>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={() => executeStep(editableInputs)}
                        disabled={isExecuting || !hasNextStep}
                        className="flex items-center space-x-2"
                    >
                        {isExecuting ? (
                            <Loading />
                        ) : (
                            <PlayIcon className="w-4 h-4" />
                        )}
                        <span>
                            {isExecuting ? 'Executing...' : 'Execute Step'}
                        </span>
                    </Button>
                </div>
            )}

            {/* Step Results */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">Step Results</h3>
                {currentChain.steps.map((step, index) => (
                    <div key={step.id} className={cn(
                        'p-4 border rounded-lg',
                        step.status === 'completed' ? 'border-green-200 bg-green-50' :
                            step.status === 'failed' ? 'border-red-200 bg-red-50' :
                                step.status === 'running' ? 'border-blue-200 bg-blue-50' :
                                    'border-gray-200 bg-gray-50'
                    )}>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{step.name}</h4>
                            <span className={cn(
                                'px-2 py-1 text-xs text-white rounded-full',
                                getStepStatus(step)
                            )}>
                                {step.status}
                            </span>
                        </div>

                        {step.outputs && (
                            <div className="mt-2">
                                <h5 className="text-sm font-medium text-gray-600 mb-1">Outputs:</h5>
                                <pre className="text-sm bg-white p-2 rounded border">
                                    {JSON.stringify(step.outputs, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default WorkflowChainComponent 