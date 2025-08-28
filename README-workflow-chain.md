# Workflow Chaining Feature

This feature allows you to chain multiple Dify workflows together, where the output of one workflow becomes the input for the next, with user review and editing capabilities between steps.

## Features

- **Sequential Workflow Execution**: Chain multiple workflows together
- **User Review & Edit**: Review outputs and modify them before passing to the next workflow
- **Visual Progress Tracking**: See the status of each step in the chain
- **Error Handling**: Proper error handling with rollback capabilities
- **Flexible Configuration**: Configure which steps allow user editing

## How It Works

1. **Create a Chain**: Define multiple workflow steps with their configurations
2. **Execute Step-by-Step**: Each workflow runs in sequence
3. **User Review**: After each step, you can review and modify the outputs
4. **Pass Data Forward**: Modified outputs become inputs for the next workflow
5. **Complete Chain**: Continue until all workflows in the chain are completed

## Usage Example

### Basic Setup

```typescript
import { workflowChainManager } from '@/service/workflow-chain'

// Create a two-step workflow chain
const chain = workflowChainManager.createChain(
  'my-analysis-chain',
  'Company Analysis Chain',
  [
    {
      name: 'Initial Research',
      workflowId: 'workflow-1',
             apiKey: process.env.NEXT_PUBLIC_APP_KEY,
      inputs: {
        company_name: 'Apple Inc.',
        sector: 'Technology',
        geographies: 'Global'
      },
      allowUserEdit: true
    },
    {
      name: 'Detailed Analysis',
      workflowId: 'workflow-2', 
             apiKey: process.env.NEXT_PUBLIC_SECOND_WORKFLOW_KEY,
      inputs: {
        analysis_depth: 'comprehensive'
      },
      allowUserEdit: true
    }
  ]
)
```

### Execute the Chain

```typescript
// Execute the first step
try {
  const result = await workflowChainManager.executeNextStep(chain.id)
  console.log('Step 1 completed:', result.outputs)
  
  // User can review and modify outputs here
  const userModifications = {
    additional_context: 'Focus on financial performance'
  }
  
  // Execute the second step with modifications
  const result2 = await workflowChainManager.executeNextStep(
    chain.id, 
    userModifications
  )
  console.log('Step 2 completed:', result2.outputs)
} catch (error) {
  console.error('Chain execution failed:', error)
}
```

## Setup Requirements

### 1. Multiple Dify Workflows
You need to create separate workflows in Dify for each step:
- Each workflow should have its own unique ID and API key
- Configure inputs/outputs appropriately for data passing

### 2. Environment Configuration
Make sure your environment variables are set:
```bash
NEXT_PUBLIC_APP_TYPE_WORKFLOW=true
NEXT_PUBLIC_API_URL=https://api.dify.ai/v1
```

### 3. Workflow Configuration
Each step in the chain needs:
- `workflowId`: The Dify workflow ID
- `apiKey`: The Dify API key for that workflow
- `inputs`: Initial inputs for the workflow
- `allowUserEdit`: Whether to allow user editing of inputs/outputs

## UI Components

### WorkflowChainComponent
Use the provided React component for a complete UI:

```tsx
import WorkflowChainComponent from '@/app/components/workflow-chain'

<WorkflowChainComponent
  chain={chain}
  onChainCompleted={(chainId, outputs) => {
    console.log('Chain completed!', outputs)
  }}
  onChainError={(chainId, error) => {
    console.error('Chain failed:', error)
  }}
/>
```

## Demo Page

Visit `/workflow-chain-demo` to see a working example and test the functionality.

## Data Flow

```
Workflow 1 Input → Workflow 1 → Output 1 
                                    ↓
                              User Review & Edit
                                    ↓
            Workflow 2 Input ← Modified Output 1
                   ↓
            Workflow 2 → Final Output
```

## API Reference

### workflowChainManager

#### `createChain(id, name, steps)`
Creates a new workflow chain.

#### `executeNextStep(chainId, userModifications?)`
Executes the next step in the chain with optional user modifications.

#### `getCurrentStep(chainId)`
Gets the current step that needs to be executed.

#### `isChainCompleted(chainId)`
Checks if the entire chain has been completed.

#### `hasNextStep(chainId)`
Checks if there are more steps to execute.

## Common Use Cases

1. **Research → Analysis → Report**: Multi-stage content generation
2. **Data Collection → Processing → Visualization**: Data pipeline workflows  
3. **Draft → Review → Finalize**: Content approval workflows
4. **Input → Transform → Output**: Data transformation pipelines

## Tips

- Keep workflows modular and focused on single tasks
- Use descriptive names for each step
- Test individual workflows before chaining them
- Consider the data format compatibility between workflows
- Use the `allowUserEdit` flag strategically for quality control points 