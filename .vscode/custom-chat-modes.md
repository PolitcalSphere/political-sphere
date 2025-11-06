# Custom Chat Modes for Political Sphere

## Quick Mode Usage (No Extension Needed)

### 1. Safe Mode (Constitutional Compliance)
```
@workspace Act in Safe mode unless explicitly instructed otherwise; obey change budgets; never add deps without ADR; redact secrets.

[Your request here]
```

### 2. Political Neutrality Mode
```
@workspace If content touches politics/policy UX, run neutrality checklist + bias note; otherwise block & escalate.

[Your request about political content]
```

### 3. Structured Output Mode
```
@workspace Return: plan → minimal diff → tests → risks → rollback. Include AI-EXECUTION header, list deferred gates.

[Your code change request]
```

## Creating a Custom Chat Participant Extension

If you want a persistent `@political-sphere` participant, you can create a VS Code extension.

### Steps to Create Extension:

1. **Install Yeoman and VS Code Extension Generator**:
   ```bash
   npm install -g yo generator-code
   ```

2. **Generate Extension**:
   ```bash
   yo code
   # Choose "New Extension (TypeScript)"
   # Name it "political-sphere-chat"
   ```

3. **Add Chat Participant** (see example below)

4. **Install in VS Code**:
   - Press F5 to debug
   - Or package with `vsce package` and install `.vsix`

### Example Extension Code

Create `src/extension.ts`:

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // Create chat participant
    const participant = vscode.chat.createChatParticipant(
        'political-sphere.governance',
        async (
            request: vscode.ChatRequest,
            context: vscode.ChatContext,
            stream: vscode.ChatResponseStream,
            token: vscode.CancellationToken
        ) => {
            // Safety prefix
            const safetyPrompt = "Act in Safe mode unless explicitly instructed otherwise; obey change budgets; never add deps without ADR; redact secrets.";
            
            // Neutrality check
            const neutralityCheck = request.prompt.toLowerCase().includes('politic') || 
                                   request.prompt.toLowerCase().includes('policy');
            
            if (neutralityCheck) {
                stream.markdown('⚠️ **Political Content Detected** - Running neutrality checklist...\n\n');
            }
            
            // Build enhanced prompt
            const enhancedPrompt = `${safetyPrompt}\n\n${request.prompt}\n\nReturn: plan → minimal diff → tests → risks → rollback.`;
            
            // Use the model
            const messages = [
                vscode.LanguageModelChatMessage.User(enhancedPrompt)
            ];
            
            const model = await vscode.lm.selectChatModels({ family: 'gpt-4' })[0];
            if (!model) {
                stream.markdown('⚠️ No language model available');
                return;
            }
            
            const chatResponse = await model.sendRequest(messages, {}, token);
            
            for await (const fragment of chatResponse.text) {
                stream.markdown(fragment);
            }
            
            if (neutralityCheck) {
                stream.markdown('\n\n---\n**Neutrality Review**: Please verify political content meets governance standards.');
            }
        }
    );
    
    // Set icon and metadata
    participant.iconPath = new vscode.ThemeIcon('shield');
    
    context.subscriptions.push(participant);
}
```

### Update `package.json`:

```json
{
  "contributes": {
    "chatParticipants": [
      {
        "id": "political-sphere.governance",
        "name": "governance",
        "description": "Political Sphere governance-aware assistant",
        "isSticky": true
      }
    ]
  },
  "activationEvents": [
    "onChatParticipant:political-sphere.governance"
  ]
}
```

## Usage After Installation

Once installed, you can use:
```
@governance Create a new voting endpoint

@governance Check this code for political neutrality
```

## Recommended Approach for Your Project

**Start with Option 1** (Quick Custom Prompts) because:
1. ✅ No extension development needed
2. ✅ Works immediately in VS Code chat
3. ✅ You already have the snippets set up
4. ✅ Can use `agent:safety`, `agent:contract`, `agent:neutrality` snippets

**Consider Option 2** (Extension) if you want:
- Persistent `@political-sphere` or `@governance` participant
- Automatic enforcement of governance rules
- Custom UI/icons in chat
- Shareable with team via `.vsix` file

## Quick Start (Option 1)

1. Open VS Code chat (Cmd+I or Ctrl+I)
2. Type: `@workspace ` 
3. Insert snippet: Type `agent:safety` + Tab
4. Add your request
5. Press Enter

Example:
```
@workspace agent:safety

Add authentication to the API endpoint in apps/api/src/routes/votes.ts
```

This automatically applies your governance rules without needing an extension!
