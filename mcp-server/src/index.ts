#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ConsolePrivateAccessValidator } from './validator.js';
import { CloudFormationTemplate } from './types.js';

const server = new Server(
  {
    name: 'aws-console-private-access-validator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
  {
    name: 'validate-cloudformation',
    description:
      'Validates a CloudFormation template for AWS Console Private Access requirements',
    inputSchema: {
      type: 'object' as const,
      properties: {
        template: {
          type: 'string',
          description: 'CloudFormation template as JSON string',
        },
        region: {
          type: 'string',
          description: 'AWS region (default: us-east-1)',
          default: 'us-east-1',
        },
      },
      required: ['template'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'validate-cloudformation') {
    const { template, region = 'us-east-1' } = request.params.arguments as {
      template: string;
      region?: string;
    };

    try {
      const parsedTemplate: CloudFormationTemplate = JSON.parse(template);
      const validator = new ConsolePrivateAccessValidator(parsedTemplate, region);
      const result = validator.validate();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                valid: false,
                checks: [],
                summary: `Error parsing template: ${errorMessage}`,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown tool: ${request.params.name}`,
      },
    ],
    isError: true,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.exit(1);
});
