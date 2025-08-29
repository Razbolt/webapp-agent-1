# Workflow Chain Debugging Guide

## 🚨 When Things Go Wrong

### 1. Check Browser Console (F12 → Console)
Look for these debug messages:
```
🔍 DEBUG: Previous step outputs: {...}
🔗 DEBUG: Mapping agent_output to second_input: "..."
📊 DEBUG: Final step inputs: {...}
🏁 DEBUG: Workflow finished event: {...}
💾 DEBUG: Captured outputs: {...}
```

### 2. Check Server Terminal
Look for:
```
Workflow step custom-chain-xxx-step-1 started: xxx
Node started in step: {...}
Node finished in step: {...}
```

### 3. Test API Directly
```bash
# Test chain creation
curl -X POST http://localhost:3000/api/workflow-chain-test \
  -H "Content-Type: application/json" \
  -d '{"action": "create-custom", "inputs": {"company_name": "Tesla", "Sector": "Automotive", "Geographies": "USA", "Peer_list": "Ford"}}'

# Test chain execution
curl -X POST http://localhost:3000/api/workflow-chain-test \
  -H "Content-Type: application/json" \
  -d '{"action": "execute", "chainId": "YOUR_CHAIN_ID"}'
```

### 4. Common Issues & Fixes

#### ❌ "Previous step has no outputs"
**Cause**: First workflow didn't produce outputs
**Fix**: Check your Dify workflow has output variables defined

#### ❌ "No agent_output found"
**Cause**: Output field name mismatch
**Fix**: Update the mapping in `service/workflow-chain.ts` line 149:
```typescript
// Change this to match your Dify output field name
if (currentStep.inputs.hasOwnProperty('second_input') && previousStep.outputs.YOUR_OUTPUT_FIELD) {
    stepInputs.second_input = previousStep.outputs.YOUR_OUTPUT_FIELD
}
```

#### ❌ HTTP 500 Internal Server Error
**Cause**: Invalid API keys or workflow IDs
**Fix**: Check `.env.local` file:
```
NEXT_PUBLIC_APP_ID=your-first-workflow-id
NEXT_PUBLIC_APP_KEY=your-first-workflow-key
NEXT_PUBLIC_SECOND_WORKFLOW_ID=your-second-workflow-id
NEXT_PUBLIC_SECOND_WORKFLOW_KEY=your-second-workflow-key
```

#### ❌ JSON parsing errors
**Cause**: Malformed SSE stream from Dify
**Fix**: Check network tab in browser for actual API responses

### 5. Enable Extra Debugging
Add this to `service/workflow-chain.ts` for more detailed logs:
```typescript
// Add after line 183
onWorkflowStarted: ({ workflow_run_id }) => {
    console.log(`🚀 EXTRA DEBUG: Workflow ${currentStep.name} started with ID:`, workflow_run_id)
    console.log(`🚀 EXTRA DEBUG: Using inputs:`, stepInputs)
},
```

### 6. Validate Your Dify Workflows
1. **First Workflow**: Must have output variable (e.g., `agent_output`)
2. **Second Workflow**: Must have input variable `second_input` and output variable (e.g., `Second_output`)
3. **API Keys**: Must be valid and have correct permissions

### 7. Test Individual Workflows
```bash
# Test first workflow directly
curl -X POST http://localhost:3000/api/workflows/run \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"company_name": "Tesla", "Sector": "Automotive", "Geographies": "USA", "Peer_list": "Ford"}, "response_mode": "streaming", "user": "test"}'

# Check the response for output structure
```

## 🎯 Success Indicators
- ✅ First workflow produces outputs with expected field names
- ✅ Output mapping works correctly 
- ✅ Second workflow receives proper input
- ✅ Second workflow produces outputs
- ✅ UI displays both workflows' results 