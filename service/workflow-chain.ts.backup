import type { WorkflowChain, WorkflowChainStep, ChainStepResult } from '@/types/app'
import { sendWorkflowMessage } from './index'
import { ssePost } from './base'

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🔧 PART A: executeCustomWorkflow() - The Foundation Function
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 
// This function is the BRIDGE between our Next.js app and Dify API
// It handles the complex streaming data and converts it into simple callbacks
//
// KEY CONCEPTS EXPLAINED:
// - async: This function does slow network operations, so it can "pause" and wait
// - await: "Wait for this operation to finish before continuing"
// - Promise<void>: "I'll tell you when I'm done, but won't return any data"
// - Record<string, any>: An object where keys are text and values can be anything
// - callbacks: Functions to call when specific events happen
// ═══════════════════════════════════════════════════════════════════════════════════════════════

async function executeCustomWorkflow(
    workflowId: string,               // ← TEXT: Your Dify workflow ID like "abc123-def456"
    apiKey: string,                   // ← TEXT: Your Dify API key like "app-xyz789"  
    inputs: Record<string, any>,      // ← OBJECT: Data to send like {company_name: "Tesla", sector: "Auto"}
    callbacks: {                      // ← OBJECT: Contains 4 functions to call when events happen
        onWorkflowStarted: (data: any) => void,    // ← Function called when workflow starts
        onNodeStarted: (data: any) => void,        // ← Function called when each node starts
        onNodeFinished: (data: any) => void,       // ← Function called when each node finishes (CAPTURES agent_output!)
        onWorkflowFinished: (data: any) => void,   // ← Function called when whole workflow finishes (CAPTURES current_de_op_output!)
    }
): Promise<void> {  // ← RETURN TYPE: Promise that completes with no data when done

    // 🌐 STEP 1: PREPARE THE API CALL
    // const = "this value never changes" (unlike let which can change)
    const apiUrl = `https://api.dify.ai/v1/workflows/run`  // ← Dify's API endpoint

    // 🚀 STEP 2: MAKE THE NETWORK CALL TO DIFY
    // await = "pause this function until the network call finishes"
    // fetch = JavaScript's built-in function for making HTTP requests
    const response = await fetch(apiUrl, {
        method: 'POST',                     // ← We're sending data TO the API (not getting)
        headers: {                          // ← Headers are like envelope labels
            'Authorization': `Bearer ${apiKey}`,      // ← "Here's my permission to use this API"
            'Content-Type': 'application/json',      // ← "I'm sending JSON data"
        },
        body: JSON.stringify({              // ← Convert JavaScript object to JSON text
            inputs,                         // ← Your workflow inputs (company_name, etc.)
            response_mode: 'streaming',     // ← "Send me data piece by piece, not all at once"
            user: 'workflow-chain-user',    // ← User identifier for Dify logging
        }),
    })

    // 🚨 STEP 3: CHECK FOR ERRORS
    if (!response.ok) {                     // ← If the API call failed (status 400, 500, etc.)
        throw new Error(`Workflow API error: ${response.status} ${response.statusText}`)
    }
    if (!response.body) {                   // ← If we didn't get any data back
        throw new Error('No response body received from workflow API')
    }

    // 📡 STEP 4: SETUP FOR READING STREAMING DATA
    // Dify sends data in chunks over time (Server-Sent Events)
    // We need to read it piece by piece, not all at once
    const reader = response.body.getReader() // ← Gets a "reader" to read data chunk by chunk
    const decoder = new TextDecoder()        // ← Converts binary data to readable text
    let buffer = ''                          // ← Temporary storage for incomplete data lines

    // 🔄 STEP 5: READ DATA CONTINUOUSLY UNTIL DONE
    try {
        while (true) {                        // ← Keep reading forever until done
            // Read the next chunk of data
            const { done, value } = await reader.read()  // ← Get next piece of data
            if (done) break                   // ← If no more data, exit the loop

            // 📝 PROCESS EACH CHUNK OF DATA
            buffer += decoder.decode(value, { stream: true })  // ← Convert binary to text, add to our buffer
            const lines = buffer.split('\n')  // ← Split text into individual lines
            buffer = lines.pop() || ''        // ← Keep the last (possibly incomplete) line for next time

            // 🎯 PROCESS EACH COMPLETE LINE
            for (const line of lines) {
                // Skip empty lines or lines that don't start with "data: "
                if (!line.trim() || !line.startsWith('data: ')) continue

                try {
                    // 📊 PARSE THE JSON DATA
                    const jsonString = line.substring(6).trim()  // ← Remove "data: " prefix
                    if (!jsonString) continue                     // ← Skip if empty
                    const data = JSON.parse(jsonString)          // ← Convert JSON text to JavaScript object

                    // 🎭 HANDLE DIFFERENT EVENT TYPES FROM DIFY
                    // Dify sends different types of events as the workflow progresses
                    switch (data.event) {
                        case 'workflow_started':
                            // Called once when the workflow begins
                            callbacks.onWorkflowStarted({ workflow_run_id: data.workflow_run_id })
                            break

                        case 'node_started':
                            // Called every time a node (step) in the workflow starts
                            callbacks.onNodeStarted(data)
                            break

                        case 'node_finished':
                            // 🔥 CRITICAL: This is where agent_output comes from!
                            // Called every time a node (step) in the workflow finishes
                            callbacks.onNodeFinished(data)
                            break

                        case 'workflow_finished':
                            // 🔥 CRITICAL: This is where current_de_op_output comes from!
                            // Called once when the entire workflow is complete
                            callbacks.onWorkflowFinished(data)
                            return  // ← Exit the function completely - we're done!

                        case 'error':
                            // If Dify reports an error, crash with the error message
                            throw new Error(data.message || 'Workflow execution failed')
                    }
                } catch (parseError) {
                    // If we can't parse a line as JSON, log it but don't crash
                    console.warn('Failed to parse SSE data:', line, parseError)
                }
            }
        }
    } finally {
        // Clean up the reader when we're done (whether success or error)
        reader.releaseLock()
    }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 🏗️ PART B: WorkflowChainManager Class - The Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// This class manages multiple workflow chains in memory
// Think of it like a smart filing cabinet that can run workflows in sequence
//
// KEY CONCEPTS EXPLAINED:
// - class: A blueprint for creating objects with methods and properties
// - export: Other files can import and use this class
// - private: Only this class can access these variables (like a private diary)
// - Map: Like a dictionary - fast lookup by key (chainId → chain object)
// - this: Refers to the current instance of the class
// ═══════════════════════════════════════════════════════════════════════════════════════════════

export class WorkflowChainManager {
    // 💾 MEMORY STORAGE: Store all active chains
    // Map<string, WorkflowChain> = Dictionary where:
    //   - Key (string): Chain ID like "custom-chain-1234"  
    //   - Value (WorkflowChain): The actual chain object with steps and status
    private chains: Map<string, WorkflowChain> = new Map()

    // 🏗️ CREATE A NEW WORKFLOW CHAIN
    // This method sets up a sequence of workflows to run one after another
    createChain(
        id: string,                                    // ← Chain ID like "custom-chain-1234"
        name: string,                                  // ← Human-readable name like "Tesla Analysis Chain"  
        steps: Omit<WorkflowChainStep, 'id' | 'status'>[]  // ← Array of step definitions (TypeScript removes 'id' and 'status' fields)
    ): WorkflowChain {                                 // ← Returns the complete chain object

        // 🔨 BUILD THE CHAIN OBJECT
        const chain: WorkflowChain = {
            id,                                        // ← Same as writing "id: id" (ES6 shorthand)
            name,                                      // ← Same as writing "name: name"
            steps: steps.map((step, index) => ({      // ← Transform each step definition into a complete step
                ...step,                               // ← Copy all properties from original step (spread operator)
                id: `${id}-step-${index}`,            // ← Add unique ID: "custom-chain-1234-step-0"
                status: 'pending' as const,           // ← Set initial status (as const = TypeScript type hint)
            })),
            currentStepIndex: 0,                       // ← Start at first step (0 = first, 1 = second, etc.)
            status: 'pending',                         // ← Chain starts as pending
        }

        // 💾 STORE IN MEMORY AND RETURN
        this.chains.set(id, chain)                    // ← Save to our Map: "custom-chain-1234" → chain object
        return chain                                   // ← Give back the created chain
    }

    // 🔍 GET A CHAIN BY ID
    // undefined = might not exist (TypeScript safety)
    getChain(id: string): WorkflowChain | undefined {
        return this.chains.get(id)                     // ← Look up chain by ID in our Map
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // 🧠 PART C: executeNextStep() - The Brain (Main Orchestration Logic)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    //
    // This is the INTELLIGENCE of the system - it decides how to chain workflows together
    // It handles input mapping, executes workflows, and collects outputs
    //
    // PROCESS OVERVIEW:
    // 1. Find the chain and current step
    // 2. Prepare inputs (map previous outputs to current inputs)
    // 3. Execute the workflow
    // 4. Collect outputs from both node events and workflow completion
    // 5. Update chain state and move to next step
    // ═══════════════════════════════════════════════════════════════════════════════════════════════

    async executeNextStep(
        chainId: string,                           // ← Which chain to work on: "custom-chain-1234"
        userModifications?: Record<string, any>    // ← Optional: user can edit inputs (? = optional parameter)
    ): Promise<ChainStepResult> {                  // ← Returns info about what happened

        // 🔍 STEP 1: FIND THE CHAIN IN MEMORY
        const chain = this.chains.get(chainId)    // ← Look up the chain in our Map storage
        if (!chain) {                             // ← If not found, crash with helpful error
            throw new Error(`Chain ${chainId} not found`)
        }

        // 🎯 STEP 2: GET THE CURRENT STEP TO EXECUTE
        const currentStep = chain.steps[chain.currentStepIndex]  // ← Get step 0, then 1, then 2, etc.
        if (!currentStep) {                       // ← If no more steps, crash with helpful error
            throw new Error(`No more steps in chain ${chainId}`)
        }

        // ✏️ STEP 3: APPLY USER EDITS (if any)
        if (userModifications) {                  // ← If user edited something in the UI
            currentStep.userModifications = userModifications  // ← Save their changes
        }

        // 🔧 STEP 4: PREPARE INPUTS FOR THIS STEP
        // Start with the default inputs defined for this step
        let stepInputs = { ...currentStep.inputs }  // ← Spread operator: copy all properties from currentStep.inputs

        // 🧠 STEP 5: SMART INPUT MAPPING (The Magic!)
        // If this is NOT the first step, we need to map outputs from the previous step
        if (chain.currentStepIndex > 0) {
            const previousStep = chain.steps[chain.currentStepIndex - 1]  // ← Get the step that just finished
            console.log(`🔍 DEBUG: Previous step outputs:`, previousStep.outputs)

            if (previousStep.outputs) {               // ← If previous step produced outputs
                // 🎯 DECLARE VARIABLES FOR SMART MAPPING
                let selectedOutput = ""               // ← Which output data to use for chaining
                let outputSource = ''                 // ← Which field name we selected

                // 🔍 CHECK IF CURRENT STEP EXPECTS THE NEW INPUT STRUCTURE
                if (currentStep.inputs.hasOwnProperty('competitor_input') || currentStep.inputs.hasOwnProperty('current_de_op_input')) {

                    // 🎯 SMART MAPPING: Map specific outputs to specific inputs
                    let mappingApplied = false

                    // 🥇 MAP agent_output → competitor_input
                    if (currentStep.inputs.hasOwnProperty('competitor_input') && previousStep.outputs.agent_output) {
                        stepInputs.competitor_input = previousStep.outputs.agent_output
                        console.log(`🔗 DEBUG: Mapping agent_output to competitor_input:`, previousStep.outputs.agent_output.substring(0, 100) + '...')
                        mappingApplied = true
                    }

                    // 🥈 MAP current_de_op_output → current_de_op_input  
                    if (currentStep.inputs.hasOwnProperty('current_de_op_input') && previousStep.outputs.current_de_op_output) {
                        stepInputs.current_de_op_input = previousStep.outputs.current_de_op_output
                        console.log(`🔗 DEBUG: Mapping current_de_op_output to current_de_op_input:`, previousStep.outputs.current_de_op_output.substring(0, 100) + '...')
                        mappingApplied = true
                    }

                    // 🔧 APPLY USER MODIFICATIONS (highest priority)
                    if (currentStep.userModifications) {
                        stepInputs = { ...stepInputs, ...currentStep.userModifications }
                        console.log(`✏️ DEBUG: Applied user modifications:`, currentStep.userModifications)
                    }

                    if (mappingApplied) {
                        console.log(`✅ DEBUG: Successfully mapped specific outputs to inputs`)
                    } else {
                        console.log(`⚠️ DEBUG: No suitable outputs found for mapping. Available outputs:`, Object.keys(previousStep.outputs))
                        console.log(`⚠️ DEBUG: Expected inputs: competitor_input=${!!currentStep.inputs.competitor_input}, current_de_op_input=${!!currentStep.inputs.current_de_op_input}`)
                    }

                    // 🔄 FALLBACK: Handle legacy second_input format (for backward compatibility)
                } else if (currentStep.inputs.hasOwnProperty('second_input')) {

                    // 🥇 FIRST PRIORITY: agent_output (preferred for workflow chaining)
                    if (previousStep.outputs.agent_output) {
                        selectedOutput = previousStep.outputs.agent_output  // ← Use this data for chaining
                        outputSource = 'agent_output'                       // ← Remember which field we picked
                        console.log(`🔗 DEBUG: Mapping agent_output to second_input:`, selectedOutput)

                        // 🔧 BUILD NEW INPUTS WITH PRIORITY ORDER
                        stepInputs = {
                            ...stepInputs,                          // ← Keep original default inputs (lowest priority) 
                            second_input: selectedOutput,           // ← ADD/OVERRIDE: second_input = agent_output data (medium priority)
                            ...(currentStep.userModifications || {}), // ← ADD: any user edits (highest priority)
                        }

                        // 🥈 SECOND PRIORITY: current_de_op_output (fallback for chaining)
                    } else if (previousStep.outputs.current_de_op_output) {
                        selectedOutput = previousStep.outputs.current_de_op_output
                        outputSource = 'current_de_op_output'
                        console.log(`🔄 DEBUG: FALLBACK - Using current_de_op_output for chaining (agent_output not found):`, selectedOutput.substring(0, 100) + '...')

                        stepInputs = {
                            ...stepInputs,
                            second_input: selectedOutput,
                            ...(currentStep.userModifications || {}),
                        }

                        // 🚨 NO SUITABLE OUTPUT FOUND FOR CHAINING
                    } else {
                        console.log(`⚠️ DEBUG: No agent_output or current_de_op_output found for workflow chaining. Available outputs:`, Object.keys(previousStep.outputs))
                        console.log(`📋 DEBUG: Workflow chaining will fail without suitable output`)

                        // If no suitable output, only add user modifications
                        stepInputs = {
                            ...stepInputs,
                            ...(currentStep.userModifications || {}),
                        }
                    }
                } else {
                    // Current step doesn't expect second_input, so just merge all outputs
                    console.log(`⚠️ DEBUG: Current step doesn't expect second_input. Available outputs:`, Object.keys(previousStep.outputs))
                    stepInputs = {
                        ...stepInputs,
                        ...previousStep.outputs,                    // ← Add all previous outputs
                        ...(currentStep.userModifications || {}),
                    }
                }
            } else {
                console.log(`❌ DEBUG: Previous step has no outputs!`)
            }
        } else if (currentStep.userModifications) {
            // For first step, just apply user modifications (no previous step to chain from)
            stepInputs = {
                ...stepInputs,
                ...currentStep.userModifications,
            }
        }

        console.log(`📊 DEBUG: Final step inputs for ${currentStep.name}:`, stepInputs)

        // ═══════════════════════════════════════════════════════════════════════════════════════════════
        // 🔄 PART D: Output Collection - The Innovation (Dual Collection Strategy)
        // ═══════════════════════════════════════════════════════════════════════════════════════════════
        //
        // THE BREAKTHROUGH: We collect outputs from BOTH individual nodes AND workflow completion
        // This solved the original problem where agent_output was missing
        //
        // WHY TWO SOURCES?
        // - agent_output comes from individual node completion events  
        // - current_de_op_output comes from workflow completion events
        // - By collecting from BOTH, we capture everything!
        // ═══════════════════════════════════════════════════════════════════════════════════════════════

        // 🔄 STEP 6: EXECUTE THE WORKFLOW AND COLLECT OUTPUTS
        // Promise = "I'll tell you when I'm done, but it might take a while"
        // resolve = function to call when SUCCESS, reject = function to call when ERROR
        return new Promise(async (resolve, reject) => {
            // 📊 UPDATE STATUS
            currentStep.status = 'running'            // ← Mark current step as running
            chain.status = 'running'                  // ← Mark whole chain as running

            // 💾 SETUP DUAL OUTPUT COLLECTION
            let outputs: Record<string, any> = {}     // ← Final combined outputs
            let nodeOutputs: Record<string, any> = {} // ← Outputs collected from individual nodes (agent_output source)

            try {
                // 🚀 EXECUTE THE WORKFLOW WITH CALLBACK HANDLERS
                await executeCustomWorkflow(
                    currentStep.workflowId,           // ← Which Dify workflow to run
                    currentStep.apiKey,               // ← API key for that workflow  
                    stepInputs,                       // ← The inputs we prepared above
                    {
                        // 🎬 CALLBACK 1: Workflow Started (Just Logging)
                        onWorkflowStarted: ({ workflow_run_id }) => {
                            console.log(`Workflow step ${currentStep.id} started:`, workflow_run_id)
                        },

                        // 🎬 CALLBACK 2: Node Started (Just Logging)
                        onNodeStarted: (eventData) => {
                            console.log(`Node started in step ${currentStep.id}:`, eventData.data)
                        },

                        // 🎬 CALLBACK 3: Node Finished (CRITICAL - Captures agent_output!)
                        onNodeFinished: (eventData) => {
                            console.log(`Node finished in step ${currentStep.id}:`, eventData.data)

                            // 🔥 THE FIRST PART OF THE BREAKTHROUGH: Collect from individual nodes
                            if (eventData.data && eventData.data.outputs) {
                                console.log(`📦 DEBUG: Collecting node outputs:`, eventData.data.outputs)
                                // Merge new outputs with existing ones (spread operator)
                                nodeOutputs = { ...nodeOutputs, ...eventData.data.outputs }
                                // ↑ This is where agent_output gets captured!
                            }
                        },

                        // 🎬 CALLBACK 4: Workflow Finished (CRITICAL - Captures current_de_op_output and merges everything!)
                        onWorkflowFinished: (eventData) => {
                            console.log(`🏁 DEBUG: Workflow finished event for ${currentStep.name}:`, JSON.stringify(eventData, null, 2))

                            // 📊 DEBUG: Show what data structure we received
                            console.log(`🏁 DEBUG: Event data structure:`, {
                                hasData: !!eventData.data,                    // ← !! converts to true/false
                                hasOutputs: !!(eventData.data && eventData.data.outputs),
                                dataKeys: eventData.data ? Object.keys(eventData.data) : 'no data',
                                outputsKeys: (eventData.data && eventData.data.outputs) ? Object.keys(eventData.data.outputs) : 'no outputs'
                            })

                            // 🚨 CHECK FOR ERRORS
                            if (eventData.data && eventData.data.error) {
                                currentStep.status = 'failed'
                                chain.status = 'failed'
                                reject(new Error(eventData.data.error))      // ← Call reject = Promise failed
                                return                                       // ← Exit early
                            }

                            // 🔥 THE SECOND PART OF THE BREAKTHROUGH: Merge outputs from both sources
                            const workflowOutputs = (eventData.data && eventData.data.outputs) ? eventData.data.outputs : {}
                            outputs = { ...nodeOutputs, ...workflowOutputs }
                            // ↑ This magical line combines:
                            // ↑ nodeOutputs = { agent_output: "competitor data" }
                            // ↑ workflowOutputs = { current_de_op_output: "operations data", combined_peer_list_: [...], sys_fields: [...] }
                            // ↑ Result = { agent_output: "competitor data", current_de_op_output: "operations data", combined_peer_list_: [...], sys_fields: [...] }

                            // 📊 DEBUG: Show what we collected from each source
                            console.log(`📦 DEBUG: Node outputs collected:`, nodeOutputs)
                            console.log(`🏁 DEBUG: Workflow outputs:`, workflowOutputs)
                            console.log(`💾 DEBUG: Final merged outputs for ${currentStep.name}:`, outputs)

                            // 💾 SAVE OUTPUTS AND UPDATE STATUS
                            currentStep.outputs = outputs                    // ← Save all outputs to the step
                            currentStep.status = 'completed'                 // ← Mark step as successfully completed

                            // ➡️ MOVE CHAIN FORWARD TO NEXT STEP
                            chain.currentStepIndex++                         // ← Move pointer to next step (0→1, 1→2, etc.)
                            if (chain.currentStepIndex >= chain.steps.length) {
                                chain.status = 'completed'                   // ← No more steps = entire chain completed
                                console.log(`✅ DEBUG: Chain completed!`)
                            } else {
                                chain.status = 'pending'                     // ← More steps remaining = ready for next executeNextStep call
                                console.log(`➡️ DEBUG: Ready for next step (${chain.currentStepIndex + 1}/${chain.steps.length})`)
                            }

                            // ✅ SUCCESS! Return results to caller
                            resolve({                                        // ← Call resolve = Promise succeeded
                                stepId: currentStep.id,                      // ← Which step just finished
                                outputs,                                     // ← All the outputs we collected and merged
                                success: true,                               // ← Everything worked perfectly
                            })
                        },
                    }
                )
            } catch (error) {
                // 🚨 ERROR HANDLING: If anything goes wrong during workflow execution
                currentStep.status = 'failed'
                chain.status = 'failed'
                reject(error)                                    // ← Call reject = Promise failed with this error
            }
        })
    }

    // 🔍 HELPER METHODS FOR CHECKING CHAIN STATE

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

    deleteChain(chainId: string): boolean {
        return this.chains.delete(chainId)
    }

    getAllChains(): WorkflowChain[] {
        return Array.from(this.chains.values())
    }
}

// 🏭 CREATE SINGLETON INSTANCE
// This creates one global instance that the whole app can use
export const workflowChainManager = new WorkflowChainManager() 