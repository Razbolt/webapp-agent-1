# 🔗 Dify Workflow Chaining App

A powerful Next.js application that enables chaining multiple Dify workflows together with human-in-the-loop review and editing capabilities.

## ✨ Features

- **🔄 Workflow Chaining**: Connect multiple Dify workflows in sequence
- **👁️ Human-in-the-Loop**: Review and modify outputs between workflow steps
- **🎯 Interactive UI**: User-friendly interface with progress tracking
- **📊 Real-time Monitoring**: Live execution logs and timeline visualization
- **📱 Responsive Design**: Works on desktop and mobile devices
- **💾 Export Results**: Download workflow results as JSON
- **🔧 Flexible Configuration**: Support for any number of workflow steps

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Dify account with API access
- At least one Dify workflow configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd webapp-agent-1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your Dify credentials:
   ```bash
   NEXT_PUBLIC_APP_ID='your-workflow-id'
   NEXT_PUBLIC_APP_KEY='app-your-api-key'
   NEXT_PUBLIC_API_URL='https://api.dify.ai/v1'
   NEXT_PUBLIC_APP_TYPE_WORKFLOW=true
   
   # For workflow chaining (optional)
   NEXT_PUBLIC_SECOND_WORKFLOW_ID='your-second-workflow-id'
   NEXT_PUBLIC_SECOND_WORKFLOW_KEY='app-your-second-api-key'
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### Single Workflow
- Access the main app at `http://localhost:3000`
- Fill in your inputs and execute a single workflow

### Interactive Workflow Chaining
- Visit `http://localhost:3000/workflow-chain-interactive.html`
- **Step 1**: Configure your inputs (company, sector, etc.)
- **Step 2**: First workflow executes automatically
- **Step 3**: Review outputs and modify input for second workflow
- **Step 4**: Second workflow runs with your modifications
- **Step 5**: View final results and export if needed

### Demo Pages
- **Interactive Demo**: `/workflow-chain-interactive.html` - Full human-in-the-loop experience
- **Basic Demo**: `/workflow-chain-demo.html` - Auto-execution demo
- **Test Page**: `/test-workflow-chain.html` - Technical testing interface

## 🏗️ Architecture

### Core Components

- **Workflow Chain Manager** (`service/workflow-chain.ts`): Manages workflow execution and state
- **API Routes** (`app/api/`): Handle workflow execution and data flow
- **React Components** (`app/components/`): UI components for workflow interaction
- **Demo Pages** (`public/`): Standalone HTML demos

### Data Flow

```
User Input → First Workflow → User Review → Second Workflow → Final Results
     ↓              ↓              ↓              ↓              ↓
   Form UI    →   Execute   →   Edit UI    →   Execute   →   Results UI
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_APP_ID` | Primary Dify workflow ID | ✅ |
| `NEXT_PUBLIC_APP_KEY` | Primary Dify API key | ✅ |
| `NEXT_PUBLIC_API_URL` | Dify API base URL | ✅ |
| `NEXT_PUBLIC_APP_TYPE_WORKFLOW` | Set to `true` for workflow apps | ✅ |
| `NEXT_PUBLIC_SECOND_WORKFLOW_ID` | Secondary workflow ID (for chaining) | ⚠️ |
| `NEXT_PUBLIC_SECOND_WORKFLOW_KEY` | Secondary workflow API key | ⚠️ |

### Workflow Setup in Dify

1. **Create Workflows**: Set up your workflows in Dify console
2. **Configure Inputs**: Ensure input variables match your form fields
3. **Set Output Variables**: Configure output variables for data passing
4. **Get API Keys**: Generate API keys for each workflow
5. **Test Individually**: Verify each workflow works before chaining

## 📁 Project Structure

```
├── app/
│   ├── api/                     # API routes
│   │   ├── workflows/run/       # Single workflow execution
│   │   ├── workflow-chain-test/ # Workflow chaining API
│   │   └── completion-messages/ # Alternative API endpoint
│   ├── components/              # React components
│   │   ├── workflow-chain/      # Workflow chaining UI components
│   │   ├── result/              # Result display components
│   │   └── base/                # Base UI components
│   └── layout.tsx               # App layout
├── service/
│   ├── workflow-chain.ts        # Workflow chaining logic
│   ├── base.ts                  # Base API service
│   └── index.ts                 # Service exports
├── public/
│   ├── workflow-chain-interactive.html  # Interactive demo
│   ├── workflow-chain-demo.html         # Basic demo
│   └── test-workflow-chain.html         # Test interface
├── types/
│   └── app.ts                   # TypeScript type definitions
└── config/
    └── index.ts                 # Configuration management
```

## 🔌 API Endpoints

### Single Workflow
- `POST /api/workflows/run` - Execute a single workflow

### Workflow Chaining
- `POST /api/workflow-chain-test`
  - `action: "create"` - Create single-step chain
  - `action: "create-two-step"` - Create two-step chain
  - `action: "create-custom"` - Create chain with custom inputs
  - `action: "execute"` - Execute next step in chain

## 🛠️ Development

### Adding New Workflows

1. **Update Types** (`types/app.ts`):
   ```typescript
   export type WorkflowChainStep = {
     name: string;
     workflowId: string;
     apiKey: string;
     inputs: Record<string, any>;
     allowUserEdit: boolean;
   }
   ```

2. **Create API Route** or extend existing ones

3. **Add UI Components** for new workflow inputs/outputs

### Customizing the UI

- **Styles**: CSS-in-JS with Tailwind classes
- **Components**: React components in `app/components/`
- **Demos**: HTML files in `public/` for standalone interfaces

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link your GitHub repo to Vercel
2. **Configure Environment**: Add environment variables in Vercel dashboard
3. **Deploy**: Automatic deployment on git push

### Manual Deployment

```bash
npm run build
npm start
```

## 📝 Troubleshooting

### Common Issues

1. **400 Bad Request**: Check API keys and workflow IDs
2. **Empty Outputs**: Ensure output variables are configured in Dify
3. **Locale Errors**: Check browser language settings
4. **CORS Issues**: Verify API endpoint accessibility

### Debug Mode

Enable debug logs by checking browser console and network requests.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Use GitHub Issues for bug reports
- **Documentation**: Check `/README-workflow-chain.md` for detailed API docs
- **Dify Docs**: [Official Dify Documentation](https://docs.dify.ai/)

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Dify AI](https://dify.ai/)
- UI inspired by modern design principles
