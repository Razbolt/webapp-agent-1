import type { WorkflowChain, WorkflowChainStep, ChainStepResult } from '@/types/app'
import { sendWorkflowMessage } from './index'
import { ssePost } from './base'

// Custom workflow execution function for different workflows
async function executeCustomWorkflow(
    workflowId: string,
    apiKey: string,
    inputs: Record<string, any>,
    callbacks: {
        onWorkflowStarted: (data: any) => void
        onNodeStarted: (data: any) => void
        onNodeFinished: (data: any) => void
        onWorkflowFinished: (data: any) => void
    }
): Promise<void> {
    // Create a custom API endpoint URL for this specific workflow
    const apiUrl = `https://api.dify.ai/v1/workflows/run`

    // Make direct fetch call with custom headers
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            inputs,
            response_mode: 'streaming',
            user: 'workflow-chain-user',
        }),
    })

    if (!response.ok) {
        throw new Error(`Workflow API error: ${response.status} ${response.statusText}`)
    }

    if (!response.body) {
        throw new Error('No response body received from workflow API')
    }

    // Process the streaming response
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')

            // Process complete lines, keep incomplete line in buffer
            buffer = lines.pop() || ''

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue

                try {
                    const jsonString = line.substring(6).trim()
                    if (!jsonString) continue

                    const data = JSON.parse(jsonString)

                    // Handle different event types
                    switch (data.event) {
                        case 'workflow_started':
                            callbacks.onWorkflowStarted({ workflow_run_id: data.workflow_run_id })
                            break
                        case 'node_started':
                            callbacks.onNodeStarted(data)
                            break
                        case 'node_finished':
                            callbacks.onNodeFinished(data)
                            break
                        case 'workflow_finished':
                            callbacks.onWorkflowFinished(data)
                            return // Exit the function when workflow is finished
                        case 'error':
                            throw new Error(data.message || 'Workflow execution failed')
                    }
                } catch (parseError) {
                    console.warn('Failed to parse SSE data:', line, parseError)
                }
            }
        }
    } finally {
        reader.releaseLock()
    }
}

export class WorkflowChainManager {
    private chains: Map<string, WorkflowChain> = new Map()

    createChain(
        id: string,
        name: string,
        steps: Omit<WorkflowChainStep, 'id' | 'status'>[]
    ): WorkflowChain {
        const chain: WorkflowChain = {
            id,
            name,
            steps: steps.map((step, index) => ({
                ...step,
                id: `${id}-step-${index}`,
                status: 'pending' as const,
            })),
            currentStepIndex: 0,
            status: 'pending',
        }

        this.chains.set(id, chain)
        return chain
    }

    getChain(id: string): WorkflowChain | undefined {
        return this.chains.get(id)
    }

    async executeNextStep(
        chainId: string,
        userModifications?: Record<string, any>
    ): Promise<ChainStepResult> {
        const chain = this.chains.get(chainId)
        if (!chain) {
            throw new Error(`Chain ${chainId} not found`)
        }

        const currentStep = chain.steps[chain.currentStepIndex]
        if (!currentStep) {
            throw new Error(`No more steps in chain ${chainId}`)
        }

        // Apply user modifications if provided
        if (userModifications) {
            currentStep.userModifications = userModifications
        }

        // Prepare inputs for this step
        let stepInputs = { ...currentStep.inputs }

        // If this is not the first step, use outputs from previous step
        if (chain.currentStepIndex > 0) {
            const previousStep = chain.steps[chain.currentStepIndex - 1]
            if (previousStep.outputs) {
                // For the second workflow, map the agent_output to second_input
                if (currentStep.inputs.hasOwnProperty('second_input') && previousStep.outputs.agent_output) {
                    stepInputs = {
                        ...stepInputs,
                        second_input: previousStep.outputs.agent_output,
                        ...(currentStep.userModifications || {}),
                    }
                } else {
                    // Default behavior: merge all outputs with current inputs
                    stepInputs = {
                        ...stepInputs,
                        ...previousStep.outputs,
                        ...(currentStep.userModifications || {}),
                    }
                }
            }
        } else if (currentStep.userModifications) {
            // For first step, just apply user modifications
            stepInputs = {
                ...stepInputs,
                ...currentStep.userModifications,
            }
        }

        return new Promise(async (resolve, reject) => {
            currentStep.status = 'running'
            chain.status = 'running'

            let outputs: Record<string, any> = {}

            try {
                await executeCustomWorkflow(
                    currentStep.workflowId,
                    currentStep.apiKey,
                    stepInputs,
                    {
                        onWorkflowStarted: ({ workflow_run_id }) => {
                            console.log(`Workflow step ${currentStep.id} started:`, workflow_run_id)
                        },
                        onNodeStarted: (eventData) => {
                            console.log(`Node started in step ${currentStep.id}:`, eventData.data)
                        },
                        onNodeFinished: (eventData) => {
                            console.log(`Node finished in step ${currentStep.id}:`, eventData.data)
                        },
                        onWorkflowFinished: (eventData) => {
                            if (eventData.data.error) {
                                currentStep.status = 'failed'
                                chain.status = 'failed'
                                reject(new Error(eventData.data.error))
                                return
                            }

                            // Store the outputs
                            outputs = eventData.data.outputs || {}
                            currentStep.outputs = outputs
                            currentStep.status = 'completed'

                            // Move to next step or complete chain
                            chain.currentStepIndex++
                            if (chain.currentStepIndex >= chain.steps.length) {
                                chain.status = 'completed'
                            } else {
                                chain.status = 'pending' // Ready for next step
                            }

                            resolve({
                                stepId: currentStep.id,
                                outputs,
                                success: true,
                            })
                        },
                    }
                )
            } catch (error) {
                currentStep.status = 'failed'
                chain.status = 'failed'
                reject(error)
            }
        })
    }

    getCurrentStep(chainId: string): WorkflowChainStep | undefined {
        const chain = this.chains.get(chainId)
        if (!chain) return undefined
        return chain.steps[chain.currentStepIndex]
    }

    isChainCompleted(chainId: string): boolean {
        const chain = this.chains.get(chainId)
        return chain?.status === 'completed' || false
    }

    hasNextStep(chainId: string): boolean {
        const chain = this.chains.get(chainId)
        if (!chain) return false
        return chain.currentStepIndex < chain.steps.length
    }

    resetChain(chainId: string): void {
        const chain = this.chains.get(chainId)
        if (chain) {
            chain.currentStepIndex = 0
            chain.status = 'pending'
            chain.steps.forEach(step => {
                step.status = 'pending'
                step.outputs = undefined
                step.userModifications = undefined
            })
        }
    }

    deleteChain(chainId: string): void {
        this.chains.delete(chainId)
    }
}

// Export singleton instance
export const workflowChainManager = new WorkflowChainManager() 