'use client'
import React, { useState } from 'react'
import { workflowChainManager } from '@/service/workflow-chain'
import WorkflowChainComponent from '@/app/components/workflow-chain'
import type { WorkflowChain } from '@/types/app'
import Button from '@/app/components/base/button'
import { APP_ID, API_KEY, SECOND_WORKFLOW_ID, SECOND_WORKFLOW_KEY } from '@/config'

const WorkflowChainDemo = () => {
    const [chain, setChain] = useState<WorkflowChain | null>(null)

    const createExampleChain = () => {
        // Example: Chain two workflows together
        const exampleChain = workflowChainManager.createChain(
            'demo-chain-' + Date.now(),
            'Company Research & Analysis Chain',
            [
                {
                    name: 'Initial Research',
                    workflowId: APP_ID, // Your first workflow
                    apiKey: API_KEY, // Your first workflow API key
                    inputs: {
                        company_name: 'Apple Inc.',
                        Sector: 'Technology',
                        Geographies: 'Global',
                        Peer_list: 'Microsoft, Google, Amazon'
                    },
                    allowUserEdit: true, // Allow user to edit before execution
                },
                {
                    name: 'Second Workflow Analysis',
                    workflowId: SECOND_WORKFLOW_ID, // Your second workflow
                    apiKey: SECOND_WORKFLOW_KEY, // Second workflow API key
                    inputs: {
                        // This workflow takes a single input placeholder
                        // Will be populated from the first workflow's output
                        input_text: 'Will be populated from previous step'
                    },
                    allowUserEdit: true, // Allow user to review and modify before second execution
                }
            ]
        )

        setChain(exampleChain)
    }

    const createSimpleExample = () => {
        // Simple example with just one workflow that can be reviewed and re-run
        const simpleChain = workflowChainManager.createChain(
            'simple-chain-' + Date.now(),
            'Single Workflow with Review',
            [
                {
                    name: 'Company Research',
                    workflowId: APP_ID,
                    apiKey: API_KEY,
                    inputs: {
                        company_name: 'Tesla',
                        Sector: 'Automotive',
                        Geographies: 'USA',
                        Peer_list: 'Ford, GM, Rivian'
                    },
                    allowUserEdit: true,
                }
            ]
        )

        setChain(simpleChain)
    }

    const handleChainCompleted = (chainId: string, finalOutputs: Record<string, any>) => {
        console.log('Chain completed:', chainId, finalOutputs)
        alert('Workflow chain completed successfully! Check console for outputs.')
    }

    const handleChainError = (chainId: string, error: string) => {
        console.error('Chain error:', chainId, error)
        alert(`Workflow chain failed: ${error}`)
    }

    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">
                        Workflow Chain Demo
                    </h1>
                    <p className="text-gray-600 mb-6">
                        This demo shows how to chain multiple workflows together with user review and editing capabilities.
                    </p>

                    {!chain && (
                        <div className="space-x-4">
                            <Button onClick={createExampleChain}>
                                Create Two-Step Chain
                            </Button>
                            <Button onClick={createSimpleExample}>
                                Create Simple Example
                            </Button>
                        </div>
                    )}

                    {chain && (
                        <Button
                            onClick={() => setChain(null)}
                        >
                            Reset Demo
                        </Button>
                    )}
                </div>

                {chain && (
                    <WorkflowChainComponent
                        chain={chain}
                        onChainCompleted={handleChainCompleted}
                        onChainError={handleChainError}
                    />
                )}

                {!chain && (
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h2 className="text-xl font-semibold mb-4">How Workflow Chaining Works</h2>
                        <div className="space-y-4 text-gray-700">
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">1</div>
                                <div>
                                    <strong>First Workflow Runs:</strong> The initial workflow executes with your inputs and produces outputs.
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">2</div>
                                <div>
                                    <strong>User Review:</strong> You can review the outputs and modify them before they're passed to the next workflow.
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">3</div>
                                <div>
                                    <strong>Next Workflow:</strong> The modified outputs become inputs for the next workflow in the chain.
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">4</div>
                                <div>
                                    <strong>Repeat:</strong> Continue this process for as many workflows as you want to chain together.
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-blue-800 mb-2">Setup Requirements:</h3>
                            <ul className="text-blue-700 space-y-1">
                                <li>• Each workflow step needs its own Dify workflow ID and API key</li>
                                <li>• Configure which steps allow user editing</li>
                                <li>• Map how outputs from one step become inputs for the next</li>
                                <li>• <strong>Note:</strong> Second workflow API key needs to be configured correctly</li>
                            </ul>
                        </div>

                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                            <h3 className="font-semibold text-yellow-800 mb-2">Current Configuration:</h3>
                            <ul className="text-yellow-700 space-y-1">
                                <li>• First Workflow ID: {APP_ID}</li>
                                <li>• First Workflow API Key: {API_KEY}</li>
                                <li>• Second Workflow ID: {SECOND_WORKFLOW_ID}</li>
                                <li>• Second Workflow API Key: {SECOND_WORKFLOW_KEY}</li>
                                <li className="text-red-600">• ⚠️ Please verify the second workflow API key format</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default WorkflowChainDemo 