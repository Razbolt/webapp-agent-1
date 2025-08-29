import { type NextRequest } from 'next/server'
import { workflowChainManager } from '@/service/workflow-chain'
import { APP_ID, API_KEY, SECOND_WORKFLOW_ID, SECOND_WORKFLOW_KEY, THIRD_WORKFLOW_ID, THIRD_WORKFLOW_KEY } from '@/config'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, chainId, userModifications, inputs } = body

        if (action === 'create') {
            // Create a simple single-step chain
            const chain = workflowChainManager.createChain(
                'test-chain-' + Date.now(),
                'Test Company Research',
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

            return Response.json({
                success: true,
                chainId: chain.id,
                chain: chain
            })
        }

        if (action === 'execute') {
            if (!chainId) {
                return Response.json({ error: 'Chain ID required' }, { status: 400 })
            }

            try {
                const result = await workflowChainManager.executeNextStep(chainId, userModifications)
                const updatedChain = workflowChainManager.getChain(chainId)

                return Response.json({
                    success: true,
                    result: result,
                    chain: updatedChain,
                    isCompleted: updatedChain?.status === 'completed'
                })
            } catch (error) {
                console.error('Execution error:', error)
                return Response.json({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }, { status: 500 })
            }
        }

        if (action === 'create-two-step') {
            // Create a two-step chain
            const chain = workflowChainManager.createChain(
                'two-step-chain-' + Date.now(),
                'Two-Step Workflow Chain',
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
                    },
                    {
                        name: 'Second Analysis',
                        workflowId: SECOND_WORKFLOW_ID,
                        apiKey: SECOND_WORKFLOW_KEY,
                        inputs: {
                            competitor_input: 'Will be populated from agent_output',
                            current_de_op_input: 'Will be populated from current_de_op_output'
                        },
                        allowUserEdit: true,
                    }
                ]
            )

            return Response.json({
                success: true,
                chainId: chain.id,
                chain: chain
            })
        }

        if (action === 'create-custom') {
            // Create a two-step chain with custom user inputs
            const customInputs = inputs || {
                company_name: 'Tesla',
                Sector: 'Automotive',
                Geographies: 'USA',
                Peer_list: 'Ford, GM, Rivian'
            }

            const chain = workflowChainManager.createChain(
                'custom-chain-' + Date.now(),
                'Custom Workflow Chain',
                [
                    {
                        name: 'Company Research',
                        workflowId: APP_ID,
                        apiKey: API_KEY,
                        inputs: customInputs,
                        allowUserEdit: true,
                    },
                    {
                        name: 'Detailed Analysis',
                        workflowId: SECOND_WORKFLOW_ID,
                        apiKey: SECOND_WORKFLOW_KEY,
                        inputs: {
                            competitor_input: 'Will be populated from agent_output',
                            current_de_op_input: 'Will be populated from current_de_op_output'
                        },
                        allowUserEdit: true,
                    }
                ]
            )

            return Response.json({
                success: true,
                chainId: chain.id,
                chain: chain
            })
        }

        if (action === 'create-three-step') {
            // 🆕 Create a three-step chain with advanced processing
            const customInputs = inputs || {
                company_name: 'Tesla',
                Sector: 'Automotive',
                Geographies: 'USA',
                Peer_list: 'Ford, GM, Rivian'
            }

            const chain = workflowChainManager.createChain(
                'three-step-chain-' + Date.now(),
                'Three-Step Analysis Chain',
                [
                    {
                        name: 'Company Research',
                        workflowId: APP_ID,
                        apiKey: API_KEY,
                        inputs: customInputs,
                        allowUserEdit: true,
                    },
                    {
                        name: 'Detailed Analysis',
                        workflowId: SECOND_WORKFLOW_ID,
                        apiKey: SECOND_WORKFLOW_KEY,
                        inputs: {
                            competitor_input: 'Will be populated from agent_output',
                            current_de_op_input: 'Will be populated from current_de_op_output'
                        },
                        allowUserEdit: true,
                    },
                    {
                        name: 'Advanced Processing',
                        workflowId: THIRD_WORKFLOW_ID,
                        apiKey: THIRD_WORKFLOW_KEY,
                        inputs: {
                            combined_company_info: 'Will be populated from current_de_op_output',
                            footprints_data: 'Will be populated from all_footprints'
                        },
                        allowUserEdit: true,
                    }
                ]
            )

            return Response.json({
                success: true,
                chainId: chain.id,
                chain: chain
            })
        }

        if (action === 'diagnose') {
            return Response.json({
                success: true,
                message: 'Workflow chain API is running',
                availableActions: ['create', 'execute', 'create-two-step', 'create-custom', 'create-three-step', 'diagnose']
            })
        }

        return Response.json({ error: 'Invalid action' }, { status: 400 })

    } catch (error) {
        console.error('API Error:', error)
        return Response.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
